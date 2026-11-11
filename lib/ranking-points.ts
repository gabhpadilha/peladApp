import { computeOvr } from "@/lib/ovr";
import { getClosedMatches } from "@/lib/players";
import { submissionKey, type ProgressionAward } from "@/lib/progression";
import type { AwardKind } from "@/types/award";
import type { Evaluation, Match } from "@/types/match";

/*
 * Ranking por pontos (decisão do dono do app em 2026-11-02, modelo da WSL): cada rodada
 * fechada é uma etapa e o ranking é a soma delas. Calculado do histórico, como o XP:
 * nada é gravado e as rodadas passadas entram sozinhas. Quem não jogou a etapa fica com 0,
 * então quem vai mais soma mais; presença não dá ponto fixo (a nota já vale).
 */

/**
 * Pontos da rodada = o OVR da rodada (a média das 2 maiores das 3 estatísticas das notas recebidas), mais os extras
 * abaixo. Vale para todas as rodadas fechadas, as de antes de 2026-11-02 também: os pontos delas foram recalculados
 * (decisão do dono do app, "para ficar justo"); o XP e as moedas não mudam.
 */
export const POINTS_BEST_PLAYER = 40;
export const POINTS_OTHER_AWARD = 20;
export const POINTS_PER_GOAL = 10;

/**
 * Prêmios que não somam: a zoeira (Bola Murcha, Fominha) e os de time (Time do Mês, que sai do
 * desempenho do mês, e Time da Semana, que saiu do jogo). Melhor Jogador vale mais que os outros.
 */
const NON_POINT_AWARDS: ReadonlySet<AwardKind> = new Set(["bola_murcha", "fominha", "jogador_do_mes", "campeao_do_mes", "time_da_semana"]);

/** As regras como aparecem para o jogador, tiradas das mesmas constantes. */
export const POINTS_RULES = [
  { label: "OVR da rodada", value: "74 → 74" },
  { label: "Melhor Jogador", value: `+${POINTS_BEST_PLAYER}` },
  { label: "Outros prêmios individuais", value: `+${POINTS_OTHER_AWARD}` },
  { label: "Gol confirmado", value: `+${POINTS_PER_GOAL} cada` },
] as const;

export type PlayerPoints = { points: number; rounds: number };

type RankingPointsInput = {
  /** Ids de membro a pontuar (quem não aparece em nenhuma rodada fica com 0). */
  playerIds: readonly string[];
  matches: readonly Match[];
  evaluations: readonly Evaluation[];
  awards: readonly ProgressionAward[];
  /** Gols confirmados por `matchId:memberId`. */
  confirmedGoals: ReadonlyMap<string, number>;
  /** `AAAA-MM`: só as rodadas desse mês; sem ele, todas (de todos os tempos). */
  month?: string;
};

/** Pontos e rodadas jogadas de cada jogador. */
export function computeRankingPoints({
  playerIds,
  matches,
  evaluations,
  awards,
  confirmedGoals,
  month,
}: RankingPointsInput): Map<string, PlayerPoints> {
  const totals = new Map<string, PlayerPoints>(playerIds.map((id) => [id, { points: 0, rounds: 0 }]));
  const closedMatches = getClosedMatches(matches).filter((match) => month === undefined || match.date.startsWith(month));
  if (closedMatches.length === 0) return totals;
  const closedIds = new Set(closedMatches.map((match) => match.id));

  // Uma passada em cada lista (índice por rodada e jogador), em vez de filtrar a cada etapa.
  const evaluationsByKey = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    if (!closedIds.has(evaluation.matchId)) continue;
    const key = submissionKey(evaluation.matchId, evaluation.playerId);
    const list = evaluationsByKey.get(key);
    if (list) list.push(evaluation);
    else evaluationsByKey.set(key, [evaluation]);
  }
  const awardPointsByKey = new Map<string, number>();
  for (const award of awards) {
    if (!closedIds.has(award.matchId) || NON_POINT_AWARDS.has(award.kind)) continue;
    const key = submissionKey(award.matchId, award.memberId);
    const points = award.kind === "craque" ? POINTS_BEST_PLAYER : POINTS_OTHER_AWARD;
    awardPointsByKey.set(key, (awardPointsByKey.get(key) ?? 0) + points);
  }

  for (const match of closedMatches) {
    for (const playerId of match.presentPlayerIds) {
      const total = totals.get(playerId);
      if (!total) continue;
      const key = submissionKey(match.id, playerId);
      // Todas as rodadas pelo OVR da rodada, inclusive as de antes de 2026-11-02 (pontos recalculados a pedido do dono do
      // app, para ficar justo); o XP e as moedas dessas rodadas continuam como eram (`getRoundScore` em `lib/progression.ts`).
      const score = computeOvr(evaluationsByKey.get(key) ?? []);
      total.rounds += 1;
      total.points += Math.round(score ?? 0) + (awardPointsByKey.get(key) ?? 0) + (confirmedGoals.get(key) ?? 0) * POINTS_PER_GOAL;
    }
  }
  return totals;
}

export type RankedByPoints<Item> = { player: Item; position: number; points: number; rounds: number };

/** Ordena por pontos; empate: quem jogou mais rodadas e, depois, o maior OVR. */
export function rankByPoints<Item extends { id: string; ovr: number | null }>(
  players: readonly Item[],
  totals: ReadonlyMap<string, PlayerPoints>,
): RankedByPoints<Item>[] {
  return players
    .map((player) => ({ player, ...(totals.get(player.id) ?? { points: 0, rounds: 0 }) }))
    .toSorted((a, b) => b.points - a.points || b.rounds - a.rounds || (b.player.ovr ?? -1) - (a.player.ovr ?? -1))
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

/** O que cada prêmio soma na classificação (Melhor Jogador vale mais; zoeira e prêmios de time não somam). */
export function awardPoints(kind: AwardKind): number {
  if (NON_POINT_AWARDS.has(kind)) return 0;
  return kind === "craque" ? POINTS_BEST_PLAYER : POINTS_OTHER_AWARD;
}

/** Faixa do pacote da rodada pela posição (espelha `pack_round_ranking` no banco: 1º A, 2º e 3º B, 30% de baixo D, o meio C). */
export type RoundPackTier = "A" | "B" | "C" | "D";
export const PACK_BOTTOM_SHARE = 0.3;
export function getRoundPackTier(position: number, presentCount: number, hasScore: boolean): RoundPackTier {
  if (hasScore && position === 1) return "A";
  if (hasScore && position <= 3) return "B";
  if (!hasScore || position > presentCount - Math.ceil(PACK_BOTTOM_SHARE * presentCount)) return "D";
  return "C";
}

export type RoundRankingEntry = {
  playerId: string;
  nickname: string;
  /** Posição (empate divide a posição). */
  position: number;
  points: number;
  /** OVR da rodada (a nota que entra nos pontos); `null` sem notas. */
  score: number | null;
  goals: number;
  goalPoints: number;
  awards: { kind: AwardKind; points: number }[];
  /** Faixa do pacote ganho, quando os pacotes valem nessa rodada. */
  packTier: RoundPackTier | null;
};

type RoundRankingInput = {
  match: Match;
  players: readonly { id: string; nickname: string }[];
  evaluations: readonly Evaluation[];
  awards: readonly ProgressionAward[];
  confirmedGoals: ReadonlyMap<string, number>;
  /** Pacotes ligados e valendo nessa rodada (mínimo de jogadores atingido). */
  packsApply: boolean;
};

/** Classificação de UMA rodada, só de quem jogou: ordem pela nota da rodada; os pontos (a conta do ranking do mês) vão ao lado. */
export function computeRoundRanking({ match, players, evaluations, awards, confirmedGoals, packsApply }: RoundRankingInput): RoundRankingEntry[] {
  const present = new Set(match.presentPlayerIds);
  const nickById = new Map(players.map((player) => [player.id, player.nickname]));
  const receivedBy = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    if (evaluation.matchId !== match.id) continue;
    const list = receivedBy.get(evaluation.playerId);
    if (list) list.push(evaluation);
    else receivedBy.set(evaluation.playerId, [evaluation]);
  }
  const awardsBy = new Map<string, { kind: AwardKind; points: number }[]>();
  for (const award of awards) {
    if (award.matchId !== match.id) continue;
    const points = awardPoints(award.kind);
    if (points === 0) continue;
    const list = awardsBy.get(award.memberId) ?? [];
    list.push({ kind: award.kind, points });
    awardsBy.set(award.memberId, list);
  }

  const rows = [...present].map((playerId) => {
    const score = computeOvr(receivedBy.get(playerId) ?? []);
    const goals = confirmedGoals.get(submissionKey(match.id, playerId)) ?? 0;
    const playerAwards = awardsBy.get(playerId) ?? [];
    const goalPoints = goals * POINTS_PER_GOAL;
    const points = Math.round(score ?? 0) + playerAwards.reduce((sum, award) => sum + award.points, 0) + goalPoints;
    return { playerId, nickname: nickById.get(playerId) ?? "?", points, score, goals, goalPoints, awards: playerAwards };
  });
  // Ordem pela nota da rodada (decisão do dono do app em 2026-11-11): o 1º é sempre o Melhor Jogador e a posição é a
  // mesma do sorteio do pacote no banco (`pack_round_ranking`, empate na nota divide a posição). Os pontos só desempatam
  // a ordem na tela e seguem para o ranking do mês.
  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.points - a.points || a.nickname.localeCompare(b.nickname, "pt-BR"));

  let lastScore: number | null | undefined;
  let lastPosition = 0;
  return rows.map((row, index) => {
    const position = index > 0 && row.score === lastScore ? lastPosition : index + 1;
    lastScore = row.score;
    lastPosition = position;
    return {
      ...row,
      position,
      packTier: packsApply ? getRoundPackTier(position, rows.length, row.score !== null) : null,
    };
  });
}
