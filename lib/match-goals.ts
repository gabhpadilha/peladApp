import { cache } from "react";
import { isGoalConfirmed, type MatchGoal, type RoundGoalsState } from "@/lib/goal-rules";
import { createClient } from "@/lib/supabase/server";

/** Leitura dos gols no servidor (as regras e os tipos ficam em `lib/goal-rules.ts`, que o navegador também usa). */
export type { MatchGoal, RoundGoalsState };

/** Gols informados em todas as rodadas da pelada, com as contagens (deduplicado por requisição). */
export const getGroupGoals = cache(async (groupId: string): Promise<MatchGoal[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_goals", { target_group: groupId });
  if (error) throw error;
  return data.map((row) => {
    const goal = { goals: row.goals, yes: row.yes_count };
    return {
      matchId: row.match_id,
      memberId: row.member_id,
      goals: row.goals,
      reportedBy: row.reported_by,
      yes: row.yes_count,
      no: row.no_count,
      isConfirmed: isGoalConfirmed(goal),
    };
  });
});

export const getRoundGoalsState = cache(
  async (groupId: string, matchId: string, presentIds: readonly string[], memberId: string): Promise<RoundGoalsState> => {
    const supabase = await createClient();
    const [goals, votesResult, matchResult, attendanceResult] = await Promise.all([
      getGroupGoals(groupId),
      supabase.from("match_goal_confirmations").select("member_id, confirmed").eq("match_id", matchId).eq("voter_id", memberId),
      supabase.from("matches").select("ratings_unlocked_at").eq("id", matchId).single(),
      supabase.from("match_attendance").select("member_id, goals_checked_at").eq("match_id", matchId),
    ]);
    if (votesResult.error) throw votesResult.error;
    if (matchResult.error) throw matchResult.error;
    if (attendanceResult.error) throw attendanceResult.error;

    const byMember = Object.fromEntries(goals.filter((goal) => goal.matchId === matchId).map((goal) => [goal.memberId, goal]));
    const missingIds = presentIds.filter((id) => !(id in byMember));
    // Conferência dos gols dos colegas: a etapa dos gols só fecha quando todos informaram E conferiram.
    const checkedIds = new Set(attendanceResult.data.filter((row) => row.goals_checked_at !== null).map((row) => row.member_id));
    const pendingCheckIds = presentIds.filter((id) => id in byMember && !checkedIds.has(id));
    return {
      byMember,
      myVotes: Object.fromEntries(votesResult.data.map((row) => [row.member_id, row.confirmed])),
      missingIds,
      pendingCheckIds,
      myChecked: checkedIds.has(memberId),
      ratingsOpen: matchResult.data.ratings_unlocked_at !== null || (missingIds.length === 0 && pendingCheckIds.length === 0),
    };
  },
);
