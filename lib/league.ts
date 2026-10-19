import "server-only";
import { parseCardTheme } from "@/lib/card-themes";
import { getGroupEvaluations } from "@/lib/group-scores";
import {
  buildPlayers,
  getLatestClosedMatch,
  getOvrDelta,
  getPendingEvaluations,
} from "@/lib/players";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Award } from "@/types/award";
import type { Json } from "@/types/database";
import type { Evaluation, Match } from "@/types/match";
import {
  GOALKEEPER_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  type Player,
  type PlayerAttribute,
  type PlayerProfile,
} from "@/types/player";

/** Lê os atributos congelados (jsonb) da carta especial; o que faltar vira `null`. */
function readFrozenAttributes<Key extends PlayerAttribute>(
  value: Json,
  keys: readonly Key[],
): Record<Key, number | null> {
  const source = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    keys.map((key) => {
      const attribute = source[key];
      return [key, typeof attribute === "number" ? attribute : null];
    }),
  ) as Record<Key, number | null>;
}

/**
 * Estado da pelada ativa para o usuário logado: elenco com OVR calculado,
 * rodadas, notas das rodadas fechadas (anônimas), cartas especiais,
 * pendências e envios. Fonte única dos `_data-access/` da home e do perfil.
 * Exige login e pelada.
 */
export async function getLeague(nextPath = "/") {
  const membership = await requireActiveMembership(nextPath);
  const supabase = await createClient();

  const [membersResult, matchesResult, evaluations, givenResult, submissionsResult, awardsResult] =
    await Promise.all([
      supabase
        .from("group_members")
        .select("id, user_id, nickname, position, deactivated_at")
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
      supabase
        .from("awards")
        .select("id, match_id, member_id, kind, theme, votes, position, ovr, attributes")
        .eq("group_id", membership.groupId),
    ]);

  if (membersResult.error) throw membersResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (givenResult.error) throw givenResult.error;
  if (submissionsResult.error) throw submissionsResult.error;
  if (awardsResult.error) throw awardsResult.error;

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
  const profileById = new Map(playerProfiles.map((profile) => [profile.id, profile]));

  const matches: Match[] = matchesResult.data.map((match) => ({
    id: match.id,
    round: match.round,
    date: match.played_on,
    status: match.status,
    presentPlayerIds: match.match_attendance.map((attendance) => attendance.member_id),
  }));
  const matchById = new Map(matches.map((match) => [match.id, match]));

  const givenEvaluations: Evaluation[] = givenResult.data.map((evaluation) => ({
    id: evaluation.id,
    matchId: evaluation.match_id,
    evaluatorId: evaluation.evaluator_id,
    playerId: evaluation.player_id,
    scores: {},
  }));

  const awards: Award[] = awardsResult.data
    .flatMap((award) => {
      const profile = profileById.get(award.member_id);
      const match = matchById.get(award.match_id);
      if (!profile || !match) return [];

      // Apelido e foto atuais; posição, OVR e atributos congelados no prêmio.
      const card: Player =
        award.position === "GOL"
          ? {
              ...profile,
              role: "goalkeeper",
              position: "GOL",
              ovr: award.ovr,
              attributes: readFrozenAttributes(award.attributes, GOALKEEPER_ATTRIBUTES),
            }
          : {
              ...profile,
              role: "outfield",
              position: award.position,
              ovr: award.ovr,
              attributes: readFrozenAttributes(award.attributes, OUTFIELD_ATTRIBUTES),
            };

      return [
        {
          id: award.id,
          kind: award.kind,
          theme: parseCardTheme(award.theme),
          votes: award.votes,
          matchId: award.match_id,
          round: match.round,
          date: match.date,
          memberId: award.member_id,
          card,
        },
      ];
    })
    // Mais recentes primeiro; dentro da rodada, Craque → Gol → Bola Murcha.
    .toSorted(
      (a, b) =>
        b.round - a.round ||
        ["craque", "gol", "bola_murcha"].indexOf(a.kind) - ["craque", "gol", "bola_murcha"].indexOf(b.kind),
    );

  const latestClosedMatch = getLatestClosedMatch(matches);
  const players = buildPlayers(playerProfiles, matches, evaluations);
  // Desativados ficam em `players` (histórico, cartas, perfil), mas fora do ranking.
  const inactiveIds = new Set(
    membersResult.data.filter((member) => member.deactivated_at !== null).map((member) => member.id),
  );
  const activePlayers = players.filter((player) => !inactiveIds.has(player.id));
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
    /** Todos, inclusive desativados (histórico). */
    players,
    /** Só quem está na pelada hoje: rankings. */
    activePlayers,
    isActive: (memberId: string) => !inactiveIds.has(memberId),
    matches,
    evaluations,
    awards,
    latestClosedMatch,
    pending: getPendingEvaluations(membership.memberId, matches, givenEvaluations),
    submittedByMatch: new Map(
      submissionsResult.data.map((row) => [row.match_id, Number(row.submitted)]),
    ),
    getDelta,
  };
}

export type League = Awaited<ReturnType<typeof getLeague>>;
