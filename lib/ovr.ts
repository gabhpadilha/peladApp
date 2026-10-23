import type { Evaluation } from "@/types/match";
import type { PlayerAttribute } from "@/types/player";

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
 * Quantos atributos mais fracos saem do OVR (decisão do dono do app em
 * 2026-10-23: no futsal todo mundo ataca e defende, então um atributo muito
 * baixo não deve derrubar a carta). Espelha `drop_lowest_average` no banco.
 */
export const OVR_DROPPED_ATTRIBUTES = 1;

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

/** OVR dos totais: média de cada atributo, sem o(s) mais fraco(s), na escala da carta. */
export function ovrFromTotals(totals: OvrTotals): number | null {
  const averages = [...totals.values()].map((total) => total.sum / total.count).toSorted((a, b) => b - a);
  if (averages.length === 0) return null;
  const kept = averages.length > OVR_DROPPED_ATTRIBUTES ? averages.slice(0, -OVR_DROPPED_ATTRIBUTES) : averages;
  return toCardScale(average(kept) ?? 0);
}

/**
 * OVR = média dos atributos da carta tirando o mais fraco (5 de 6), cada atributo
 * sendo a média dele em todas as avaliações que contam. Sempre sobre o histórico
 * inteiro (só rodadas fechadas). As avaliações chegam já sem a maior e a menor de
 * cada rodada (`getGroupEvaluations`); quem chama tira as de fora da posição.
 * A nota da rodada (`averageEvaluations`) continua com os 6 atributos.
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
