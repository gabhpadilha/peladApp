import { getRoundScore } from "@/lib/ovr";
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
 * Pontos da rodada = nota da rodada na escala 0–99 (`getRoundScore`: o OVR da rodada a partir de 2026-11-02, e a
 * média dos 6 atributos x10 nas de antes), mais os extras abaixo.
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
      const score = getRoundScore(match.date, evaluationsByKey.get(key) ?? []);
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
