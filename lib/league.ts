import "server-only";
import { parseCardTheme } from "@/lib/card-themes";
import { getGroupEvaluations } from "@/lib/group-scores";
import { toPlayerPhoto } from "@/lib/player-photo";
import {
  buildPlayers,
  getLatestClosedMatch,
  getOvrDelta,
  getPendingEvaluations,
} from "@/lib/players";
import {
  computeProgression,
  computeRoundRewards,
  submissionKey,
  WELCOME_BONUS_COINS,
  type Progression,
  type RoundRewards,
} from "@/lib/progression";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { awardOrder, type Award } from "@/types/award";
import { isCardSkinKey } from "@/types/card-skin";
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

  // Performance: os nomes (profiles) dependem dos membros, mas não do resto. Antes eram
  // buscados depois do Promise.all inteiro (uma ida e volta a mais ao banco no fim);
  // agora a consulta sai assim que os membros chegam, em paralelo com as outras.
  const membersWithProfiles = supabase
    .from("group_members")
    .select("id, user_id, nickname, position, deactivated_at, photo_path, photo_kind, card_skin")
    .eq("group_id", membership.groupId)
    .then(async (membersResult) => {
      if (membersResult.error) return { membersResult, profilesResult: null };
      const profilesResult = await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          membersResult.data.map((member) => member.user_id),
        );
      return { membersResult, profilesResult };
    });

  const [
    { membersResult, profilesResult },
    matchesResult,
    evaluations,
    givenResult,
    submissionsResult,
    awardsResult,
    memberSubmissionsResult,
  ] = await Promise.all([
      membersWithProfiles,
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
        .select("id, match_id, member_id, kind, theme, votes, score, position, ovr, attributes")
        .eq("group_id", membership.groupId),
      // Quem enviou notas em cada rodada fechada (para o XP e as PeladaCoins).
      supabase.rpc("get_member_submissions", { target_group: membership.groupId }),
    ]);

  if (membersResult.error) throw membersResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (givenResult.error) throw givenResult.error;
  if (submissionsResult.error) throw submissionsResult.error;
  if (awardsResult.error) throw awardsResult.error;
  if (memberSubmissionsResult.error) throw memberSubmissionsResult.error;

  const matches: Match[] = matchesResult.data.map((match) => ({
    id: match.id,
    round: match.round,
    date: match.played_on,
    status: match.status,
    presentPlayerIds: match.match_attendance.map((attendance) => attendance.member_id),
  }));
  const matchById = new Map(matches.map((match) => [match.id, match]));

  // XP, nível e PeladaCoins de cada um, do histórico (rodadas fechadas).
  const submissions = new Set(
    memberSubmissionsResult.data.map((row) => submissionKey(row.match_id, row.member_id)),
  );
  const progressionAwards = awardsResult.data.map((award) => ({
    kind: award.kind,
    matchId: award.match_id,
    memberId: award.member_id,
  }));
  const progressionById = new Map<string, Progression>(
    membersResult.data.map((member) => [
      member.id,
      computeProgression({ playerId: member.id, matches, evaluations, awards: progressionAwards, submissions }),
    ]),
  );

  if (!profilesResult) throw new Error("profiles não carregados");
  const { data: profiles, error: profilesError } = profilesResult;
  if (profilesError) throw profilesError;
  const fullNameByUser = new Map(profiles.map((profile) => [profile.id, profile.full_name]));

  const playerProfiles: PlayerProfile[] = membersResult.data.map((member) => {
    const base = {
      id: member.id,
      nickname: member.nickname,
      fullName: fullNameByUser.get(member.user_id) ?? member.nickname,
      photo: toPlayerPhoto(member.photo_path, member.photo_kind),
      cardSkin: isCardSkinKey(member.card_skin) ? member.card_skin : null,
      level: progressionById.get(member.id)?.level ?? 0,
    };
    return member.position === "GOL"
      ? { ...base, role: "goalkeeper", position: "GOL" }
      : { ...base, role: "outfield", position: member.position };
  });
  const profileById = new Map(playerProfiles.map((profile) => [profile.id, profile]));

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
          score: award.score === null ? null : Number(award.score),
          matchId: award.match_id,
          round: match.round,
          date: match.date,
          memberId: award.member_id,
          card,
        },
      ];
    })
    // Mais recentes primeiro; dentro da rodada, na ordem dos prêmios (AWARD_KINDS).
    .toSorted((a, b) => b.round - a.round || awardOrder(a.kind) - awardOrder(b.kind));

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

  // Performance: índice por id. Antes, cada `getDelta` fazia `find` na lista inteira,
  // e o ranking chama para todo mundo (O(jogadores²)); agora cada busca é O(1).
  const previousById = new Map(previousPlayers.map((previous) => [previous.id, previous]));

  function getDelta(player: Player): number | null {
    return getOvrDelta(player, previousById.get(player.id));
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
    /** XP, nível e PeladaCoins ganhas de cada membro. */
    getProgression: (memberId: string): Progression =>
      progressionById.get(memberId) ?? { level: 0, xpIntoLevel: 0, xpNeeded: 60, xp: 0, coinsEarned: WELCOME_BONUS_COINS },
    /** O que uma rodada fechada deu ao membro (tela "Você ganhou" do pacote). */
    getRoundRewards: (memberId: string, matchId: string): RoundRewards | null =>
      computeRoundRewards({ playerId: memberId, matchId, matches, evaluations, awards: progressionAwards, submissions }),
  };
}

export type League = Awaited<ReturnType<typeof getLeague>>;
