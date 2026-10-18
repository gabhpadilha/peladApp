import "server-only";
import { getGroupEvaluations } from "@/lib/group-scores";
import {
  buildPlayers,
  getLatestClosedMatch,
  getOvrDelta,
  getPendingEvaluations,
  getRoundMvpId,
} from "@/lib/players";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Evaluation, Match } from "@/types/match";
import type { Player, PlayerProfile } from "@/types/player";

/**
 * Estado da pelada ativa para o usuário logado: elenco com OVR calculado,
 * rodadas, notas das rodadas fechadas (anônimas), pendências e envios.
 * Fonte única dos `_data-access/` da home e do perfil. Exige login e pelada.
 */
export async function getLeague(nextPath = "/") {
  const membership = await requireActiveMembership(nextPath);
  const supabase = await createClient();

  const [membersResult, matchesResult, evaluations, givenResult, submissionsResult] =
    await Promise.all([
      supabase
        .from("group_members")
        .select("id, user_id, nickname, position")
        .eq("group_id", membership.groupId),
      supabase
        .from("matches")
        .select("id, round, played_on, status, match_attendance(member_id)")
        .eq("group_id", membership.groupId)
        .order("round"),
      getGroupEvaluations(membership.groupId),
      // O RLS só devolve as notas que o próprio usuário deu.
      supabase.from("evaluations").select("id, match_id, evaluator_id, player_id"),
      supabase.rpc("get_match_submissions", { target_group: membership.groupId }),
    ]);

  if (membersResult.error) throw membersResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (givenResult.error) throw givenResult.error;
  if (submissionsResult.error) throw submissionsResult.error;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      membersResult.data.map((member) => member.user_id),
    );
  if (profilesError) throw profilesError;
  const fullNameByUser = new Map(profiles.map((profile) => [profile.id, profile.full_name]));

  const playerProfiles: PlayerProfile[] = membersResult.data.map((member) => {
    const base = {
      id: member.id,
      nickname: member.nickname,
      fullName: fullNameByUser.get(member.user_id) ?? member.nickname,
      photo: null,
    };
    return member.position === "GOL"
      ? { ...base, role: "goalkeeper", position: "GOL" }
      : { ...base, role: "outfield", position: member.position };
  });

  const matches: Match[] = matchesResult.data.map((match) => ({
    id: match.id,
    round: match.round,
    date: match.played_on,
    status: match.status,
    presentPlayerIds: match.match_attendance.map((attendance) => attendance.member_id),
  }));

  const givenEvaluations: Evaluation[] = givenResult.data.map((evaluation) => ({
    id: evaluation.id,
    matchId: evaluation.match_id,
    evaluatorId: evaluation.evaluator_id,
    playerId: evaluation.player_id,
    scores: {},
  }));

  const latestClosedMatch = getLatestClosedMatch(matches);
  const players = buildPlayers(playerProfiles, matches, evaluations);
  const previousPlayers = latestClosedMatch
    ? buildPlayers(playerProfiles, matches, evaluations, { upToRound: latestClosedMatch.round - 1 })
    : [];

  function getDelta(player: Player): number | null {
    return getOvrDelta(
      player,
      previousPlayers.find((previous) => previous.id === player.id),
    );
  }

  return {
    membership,
    currentMemberId: membership.memberId,
    players,
    matches,
    evaluations,
    latestClosedMatch,
    mvpId: latestClosedMatch ? getRoundMvpId(latestClosedMatch, evaluations) : null,
    pending: getPendingEvaluations(membership.memberId, matches, givenEvaluations),
    submittedByMatch: new Map(
      submissionsResult.data.map((row) => [row.match_id, Number(row.submitted)]),
    ),
    getDelta,
  };
}

export type League = Awaited<ReturnType<typeof getLeague>>;
