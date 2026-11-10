import { cache } from "react";
import { fetchAllRows } from "@/lib/fetch-all";
import { isGoalConfirmed, type MatchGoal, type RoundGoalsState } from "@/lib/goal-rules";
import { createClient } from "@/lib/supabase/server";

/** Leitura dos gols no servidor (as regras e os tipos ficam em `lib/goal-rules.ts`, que o navegador também usa). */
export type { MatchGoal, RoundGoalsState };

/** Gols informados em todas as rodadas da pelada, com as contagens (deduplicado por requisição). */
export const getGroupGoals = cache(async (groupId: string): Promise<MatchGoal[]> => {
  const supabase = await createClient();
  const data = await fetchAllRows((from, to) =>
    supabase.rpc("get_group_goals", { target_group: groupId }).order("match_id").order("member_id").range(from, to),
  );
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

/** Gols confirmados por rodada fechada, chave "rodada:membro" (bônus de Ataque do OVR, `computeCareerCard`), e a ordem das rodadas. */
export async function getConfirmedGoalsByMember(groupId: string): Promise<{ goals: Map<string, number>; roundOrder: Map<string, number> }> {
  const supabase = await createClient();
  const [goals, closedResult] = await Promise.all([
    getGroupGoals(groupId),
    supabase.from("matches").select("id, round").eq("group_id", groupId).eq("status", "closed"),
  ]);
  if (closedResult.error) throw closedResult.error;
  const closedIds = new Set(closedResult.data.map((match) => match.id));
  const totals = new Map<string, number>();
  for (const goal of goals) {
    if (!goal.isConfirmed || !closedIds.has(goal.matchId)) continue;
    totals.set(`${goal.matchId}:${goal.memberId}`, goal.goals);
  }
  return { goals: totals, roundOrder: new Map(closedResult.data.map((match) => [match.id, match.round])) };
}
