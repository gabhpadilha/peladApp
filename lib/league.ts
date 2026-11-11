import "server-only";
import { parseCardTheme } from "@/lib/card-themes";
import { fetchAllRows } from "@/lib/fetch-all";
import { getGroupEvaluations } from "@/lib/group-scores";
import { getGroupGoals } from "@/lib/match-goals";
import { toPlayerPhoto } from "@/lib/player-photo";
import {
  buildPlayers,
  getLatestClosedMatch,
  getOvrDelta,
  getPendingEvaluations,
  ratedKey,
} from "@/lib/players";
import {
  computeProgression,
  computeRoundRewards,
  submissionKey,
  WELCOME_BONUS_COINS,
  type Progression,
  type RoundRewards,
} from "@/lib/progression";
import { computeRoundCard } from "@/lib/ovr";
import { THREE_STAT_RATINGS_FROM } from "@/lib/rating-stats";
import { computeRankingPoints, computeRoundRanking, type RoundRankingEntry } from "@/lib/ranking-points";
import { computeGoalTotals } from "@/lib/goal-ranking";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { awardOrder, type Award, type AwardKind } from "@/types/award";
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
export function readFrozenAttributes<Key extends PlayerAttribute>(
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

/** Prêmios do mês: a carta é a foto da carta geral no dia (não há uma rodada só para mostrar). */
const MONTH_AWARD_KINDS: ReadonlySet<AwardKind> = new Set(["jogador_do_mes", "campeao_do_mes"]);

/**
 * Carta da rodada nos prêmios (decisão do dono do app em 2026-11-11): nas rodadas com 3 notas (desde
 * `THREE_STAT_RATINGS_FROM`), a carta de um prêmio da rodada mostra o desempenho daquela rodada (as 3 estatísticas e o
 * OVR das notas que contam nela), sem o +1 e sem os gols, para bater com o selo ("CRI 7,7", "nota 8,2"). O que está
 * gravado em `awards` (a carta geral com +1) segue valendo para os prêmios do mês e para as rodadas de antes.
 */
function usesRoundCard(kind: AwardKind, matchDate: string): boolean {
  return !MONTH_AWARD_KINDS.has(kind) && matchDate >= THREE_STAT_RATINGS_FROM;
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
    givenRows,
    submissionsResult,
    awardRows,
    memberSubmissions,
    groupGoals,
    groupConfig,
  ] = await Promise.all([
      membersWithProfiles,
      supabase
        .from("matches")
        .select("id, round, played_on, status, match_attendance(member_id)")
        .eq("group_id", membership.groupId)
        .order("round"),
      getGroupEvaluations(membership.groupId),
      // O RLS só devolve as notas que o próprio usuário deu.
      fetchAllRows((from, to) => supabase.from("evaluations").select("id, match_id, evaluator_id, player_id").order("id").range(from, to)),
      supabase.rpc("get_match_submissions", { target_group: membership.groupId }),
      fetchAllRows((from, to) =>
        supabase
          .from("awards")
          .select("id, match_id, member_id, kind, theme, votes, score, position, ovr, attributes")
          .eq("group_id", membership.groupId)
          .order("id")
          .range(from, to),
      ),
      // Quem enviou notas em cada rodada fechada (para o XP e as CanchaCoins).
      fetchAllRows((from, to) =>
        supabase.rpc("get_member_submissions", { target_group: membership.groupId }).order("match_id").order("member_id").range(from, to),
      ),
      getGroupGoals(membership.groupId),
      supabase.from("groups").select("packs_enabled, pack_min_players").eq("id", membership.groupId).maybeSingle(),
    ]);

  if (membersResult.error) throw membersResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (submissionsResult.error) throw submissionsResult.error;

  const matches: Match[] = matchesResult.data.map((match) => ({
    id: match.id,
    round: match.round,
    date: match.played_on,
    status: match.status,
    presentPlayerIds: match.match_attendance.map((attendance) => attendance.member_id),
  }));
  const matchById = new Map(matches.map((match) => [match.id, match]));

  // XP, nível e CanchaCoins de cada um, do histórico (rodadas fechadas).
  const submissions = new Set(
    memberSubmissions.map((row) => submissionKey(row.match_id, row.member_id)),
  );
  // Rodada fechada não aceita mais confirmação: os gols confirmados ali não mudam.
  const confirmedGoals = new Map(
    groupGoals.filter((goal) => goal.isConfirmed).map((goal) => [submissionKey(goal.matchId, goal.memberId), goal.goals]),
  );
  const progressionAwards = awardRows.map((award) => ({
    kind: award.kind,
    matchId: award.match_id,
    memberId: award.member_id,
  }));
  const progressionById = new Map<string, Progression>(
    membersResult.data.map((member) => [
      member.id,
      computeProgression({ playerId: member.id, matches, evaluations, awards: progressionAwards, submissions, confirmedGoals }),
    ]),
  );

  // CanchaCoins das cartas repetidas dos pacotes abertos (só as do logado, nesta pelada): somam ao saldo.
  // Junto, as CanchaCoins das vendas no Mercado (só as do logado, nesta pelada): somam ao saldo como moedas ganhas.
  const [packsResult, marketResult] = await Promise.all([
    supabase.rpc("get_my_packs"),
    supabase.rpc("get_my_market_income", { target_group: membership.groupId }),
  ]);
  if (packsResult.error) throw packsResult.error;
  const packCoins = packsResult.data
    .filter((pack) => pack.match_id !== null && matchById.has(pack.match_id))
    .reduce((total, pack) => total + pack.coins_awarded, 0);
  // Pacotes comprados na Loja: o preço pago sai das moedas ganhas, e assim o saldo (ganhas − gastas) fica certo em todas as telas.
  // `shopPackSpend` é o total gasto (o servidor soma de volta para conferir o saldo na hora de comprar).
  const shopPackSpend = packsResult.data
    .filter((pack) => pack.group_id === membership.groupId && pack.source === "shop")
    .reduce((total, pack) => total + (pack.price ?? 0), 0);
  if (marketResult.error) throw marketResult.error;
  const extraCoins = packCoins + (marketResult.data ?? 0) - shopPackSpend;
  const ownProgression = progressionById.get(membership.memberId);
  if (ownProgression && extraCoins !== 0) {
    progressionById.set(membership.memberId, { ...ownProgression, coinsEarned: ownProgression.coinsEarned + extraCoins });
  }

  if (!profilesResult) throw new Error("profiles não carregados");
  const { data: profiles, error: profilesError } = profilesResult;
  if (profilesError) throw profilesError;
  const fullNameByUser = new Map(profiles.map((profile) => [profile.id, profile.full_name]));

  const playerProfiles: PlayerProfile[] = membersResult.data.map((member) => {
    const progression = progressionById.get(member.id);
    const base = {
      id: member.id,
      nickname: member.nickname,
      fullName: fullNameByUser.get(member.user_id) ?? member.nickname,
      photo: toPlayerPhoto(member.photo_path, member.photo_kind),
      cardSkin: isCardSkinKey(member.card_skin) ? member.card_skin : null,
      level: progression?.level ?? 0,
      levelProgress: progression ? progression.xpIntoLevel / progression.xpNeeded : 0,
    };
    return member.position === "GOL"
      ? { ...base, role: "goalkeeper", position: "GOL" }
      : { ...base, role: "outfield", position: member.position };
  });
  const profileById = new Map(playerProfiles.map((profile) => [profile.id, profile]));

  const givenEvaluations: Evaluation[] = givenRows.map((evaluation) => ({
    id: evaluation.id,
    matchId: evaluation.match_id,
    evaluatorId: evaluation.evaluator_id,
    playerId: evaluation.player_id,
    scores: {},
  }));
  const ratedByMe = new Set(
    givenEvaluations
      .filter((evaluation) => evaluation.evaluatorId === membership.memberId)
      .map((evaluation) => ratedKey(evaluation.matchId, evaluation.playerId)),
  );

  // Notas que contam de cada jogador em cada rodada, para a carta da rodada dos prêmios (montado uma vez).
  const roundEvaluations = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    const key = ratedKey(evaluation.matchId, evaluation.playerId);
    const list = roundEvaluations.get(key);
    if (list) list.push(evaluation);
    else roundEvaluations.set(key, [evaluation]);
  }

  const awards: Award[] = awardRows
    .flatMap((award) => {
      const profile = profileById.get(award.member_id);
      const match = matchById.get(award.match_id);
      if (!profile || !match) return [];

      // Apelido e foto atuais; posição, OVR e atributos congelados no prêmio, ou a carta da rodada (abaixo).
      const isGoalkeeperCard = award.position === "GOL";
      const roundCard = usesRoundCard(award.kind, match.date)
        ? computeRoundCard(roundEvaluations.get(ratedKey(award.match_id, award.member_id)) ?? [])
        : null;
      const roundAttributes =
        roundCard && roundCard.ovr !== null && GOALKEEPER_ATTRIBUTES.some((key) => key in roundCard.attributes) === isGoalkeeperCard
          ? (roundCard.attributes as Json)
          : null;
      const ovr = roundAttributes !== null && roundCard ? roundCard.ovr : award.ovr;
      const attributes = roundAttributes ?? award.attributes;
      const card: Player =
        award.position === "GOL"
          ? {
              ...profile,
              role: "goalkeeper",
              position: "GOL",
              ovr,
              attributes: readFrozenAttributes(attributes, GOALKEEPER_ATTRIBUTES),
            }
          : {
              ...profile,
              role: "outfield",
              position: award.position,
              ovr,
              attributes: readFrozenAttributes(attributes, OUTFIELD_ATTRIBUTES),
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
  const players = buildPlayers(playerProfiles, matches, evaluations, { confirmedGoals });
  // Desativados ficam em `players` (histórico, cartas, perfil), mas fora do ranking.
  const inactiveIds = new Set(
    membersResult.data.filter((member) => member.deactivated_at !== null).map((member) => member.id),
  );
  const activePlayers = players.filter((player) => !inactiveIds.has(player.id));
  const previousPlayers = latestClosedMatch
    ? buildPlayers(playerProfiles, matches, evaluations, { upToRound: latestClosedMatch.round - 1, confirmedGoals })
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
    /** Gols confirmados, chave "rodada:membro". */
    confirmedGoals,
    latestClosedMatch,
    pending: getPendingEvaluations(membership.memberId, matches, givenEvaluations),
    /** O logado já deu nota a esse jogador nessa rodada? */
    hasRated: (matchId: string, playerId: string) => ratedByMe.has(ratedKey(matchId, playerId)),
    submittedByMatch: new Map(
      submissionsResult.data.map((row) => [row.match_id, Number(row.submitted)]),
    ),
    getDelta,
    /** XP, nível e CanchaCoins ganhas de cada membro. */
    getProgression: (memberId: string): Progression =>
      progressionById.get(memberId) ?? { level: 0, xpIntoLevel: 0, xpNeeded: 60, xp: 0, coinsEarned: WELCOME_BONUS_COINS },
    /** CanchaCoins que o logado gastou em pacotes da Loja (já descontadas de `coinsEarned`). */
    shopPackSpend,
    /** Pontos e rodadas de quem está na pelada: de um mês (`AAAA-MM`) ou, sem ele, de todos os tempos. */
    /** Gols confirmados e jogos de quem está na pelada: de um mês (`AAAA-MM`) ou, sem ele, de todos os tempos. */
    getGoalTotals: (month?: string) =>
      computeGoalTotals({
        playerIds: activePlayers.map((player) => player.id),
        matches,
        confirmedGoals,
        trackedMatchIds: new Set(groupGoals.map((goal) => goal.matchId)),
        month,
      }),
    /** Classificação de uma rodada por pontos (quem jogou), com o pacote de cada um quando os pacotes valem. */
    getRoundRanking: (matchId: string): RoundRankingEntry[] => {
      const match = matches.find((candidate) => candidate.id === matchId);
      if (!match) return [];
      const packsApply =
        Boolean(groupConfig.data?.packs_enabled) && match.presentPlayerIds.length >= (groupConfig.data?.pack_min_players ?? 10);
      return computeRoundRanking({ match, players, evaluations, awards: progressionAwards, confirmedGoals, packsApply });
    },
    getRankingPoints: (month?: string) =>
      computeRankingPoints({
        playerIds: activePlayers.map((player) => player.id),
        matches,
        evaluations,
        awards: progressionAwards,
        confirmedGoals,
        month,
      }),
    /** O que uma rodada fechada deu ao membro (tela "Você ganhou" do pacote). */
    getRoundRewards: (memberId: string, matchId: string): RoundRewards | null =>
      computeRoundRewards({ playerId: memberId, matchId, matches, evaluations, awards: progressionAwards, submissions, confirmedGoals }),
  };
}

export type League = Awaited<ReturnType<typeof getLeague>>;
