import type { Evaluation } from "@/types/match";
import { getOvrFromStats, getStatsFromAttributes } from "@/lib/card-stats";
import { THREE_STAT_RATINGS_FROM } from "@/lib/rating-stats";
import { GOALKEEPER_ATTRIBUTES, type PlayerAttribute } from "@/types/player";

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;

/** Notas vão de 1 a 10; a carta mostra 0–99. */
const CARD_SCALE_FACTOR = 10;
const CARD_SCALE_MAX = 99;

/** Converte uma média de notas (1–10) para a escala da carta (0–99). */
export function toCardScale(average: number): number {
  return Math.min(CARD_SCALE_MAX, Math.round(average * CARD_SCALE_FACTOR));
}

function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getScoreValues(evaluation: Evaluation): number[] {
  return Object.values(evaluation.scores).filter((score) => score !== undefined);
}

/** Nota de uma avaliação (1–10): média das notas dos atributos. */
export function getEvaluationScore(evaluation: Evaluation): number {
  return average(getScoreValues(evaluation)) ?? 0;
}

/** Média das avaliações na escala da carta, ou `null` se não houver nenhuma. */
export function averageEvaluations(evaluations: readonly Evaluation[]): number | null {
  const evaluationAverage = average(evaluations.map(getEvaluationScore));
  return evaluationAverage === null ? null : toCardScale(evaluationAverage);
}

/**
 * Rodadas com data a partir daqui (`AAAA-MM-DD`) têm como nota da rodada o **OVR da rodada** (decisão do dono do
 * app em 2026-11-02): cada estatística é a média das notas recebidas e a nota é a média das 2 maiores das 3,
 * a mesma regra do OVR. As de antes guardam a média dos 6 atributos (XP, moedas e pontos não mudam).
 * Espelha `public.round_score` no banco (junto com a votação de 3 notas, `THREE_STAT_RATINGS_FROM`).
 */
export const ROUND_OVR_SCORE_FROM = THREE_STAT_RATINGS_FROM;

/** Nota da rodada (escala da carta, 0–99) de quem recebeu essas avaliações numa rodada jogada em `matchDate`. */
export function getRoundScore(matchDate: string, evaluations: readonly Evaluation[]): number | null {
  return matchDate >= ROUND_OVR_SCORE_FROM ? computeOvr(evaluations) : averageEvaluations(evaluations);
}

/** Soma e quantidade de notas de cada atributo, para o OVR acumulado. */
export type OvrTotals = Map<PlayerAttribute, { sum: number; count: number }>;

/** Soma as notas de uma avaliação nos totais por atributo. */
export function addToOvrTotals(totals: OvrTotals, evaluation: Evaluation): void {
  for (const [key, score] of Object.entries(evaluation.scores) as [PlayerAttribute, number | undefined][]) {
    if (score === undefined) continue;
    const total = totals.get(key);
    if (total) {
      total.sum += score;
      total.count += 1;
    } else {
      totals.set(key, { sum: score, count: 1 });
    }
  }
}

/** OVR dos totais: cada atributo na escala da carta, as 3 estatísticas e a média das 2 maiores. */
export function ovrFromTotals(totals: OvrTotals): number | null {
  if (totals.size === 0) return null;
  const attributes = Object.fromEntries(
    [...totals].map(([key, total]) => [key, toCardScale(total.sum / total.count)]),
  ) as Partial<Record<PlayerAttribute, number>>;
  const role = GOALKEEPER_ATTRIBUTES.some((key) => totals.has(key)) ? "goalkeeper" : "outfield";
  return getOvrFromStats(getStatsFromAttributes(role, attributes));
}

/**
 * OVR = média das 2 maiores das 3 estatísticas da carta (Ataque, Criação e Defesa; no goleiro,
 * Paredão, Leitura e Saída), cada uma a média de um par de atributos, e cada atributo
 * a média dele em todas as avaliações que contam (decisão do dono do app em
 * 2026-10-29; antes era a média dos 5 melhores atributos e, no mesmo dia, a das 3). Sempre sobre o histórico
 * inteiro (só rodadas fechadas). As avaliações chegam já sem a maior e a menor de
 * cada rodada (`getGroupEvaluations`); quem chama tira as de fora da posição.
 * A nota da rodada (`getRoundScore`) segue a mesma regra a partir de `ROUND_OVR_SCORE_FROM`.
 */
export function computeOvr(evaluations: readonly Evaluation[]): number | null {
  const totals: OvrTotals = new Map();
  for (const evaluation of evaluations) addToOvrTotals(totals, evaluation);
  return ovrFromTotals(totals);
}

/** Média de cada atributo sobre todas as avaliações, na escala da carta. */
export function computeAttributes<Key extends PlayerAttribute>(
  evaluations: readonly Evaluation[],
  keys: readonly Key[],
): Record<Key, number | null> {
  const entries = keys.map((key) => {
    const scores = evaluations
      .map((evaluation) => evaluation.scores[key])
      .filter((score) => score !== undefined);
    const attributeAverage = average(scores);
    return [key, attributeAverage === null ? null : toCardScale(attributeAverage)] as const;
  });
  return Object.fromEntries(entries) as Record<Key, number | null>;
}
