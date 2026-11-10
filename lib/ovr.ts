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
 * OVR de um conjunto de avaliações (na prática, as de UMA rodada) = média das 2 maiores das 3 estatísticas da carta (Ataque, Criação e Defesa; no goleiro,
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

/** Pontos de Ataque por gol confirmado e teto do bônus (decisão do dono do app em 2026-11-08). */
export const GOAL_ATTACK_BONUS_PER_GOAL = 1;
export const GOAL_ATTACK_BONUS_MAX = 10;

/** Bônus de Ataque (pontos da carta) de quem fez `goals` gols confirmados; só jogador de linha. */
export function getGoalAttackBonus(goals: number): number {
  return Math.min(GOAL_ATTACK_BONUS_MAX, Math.max(0, goals) * GOAL_ATTACK_BONUS_PER_GOAL);
}

export type CareerCard = {
  /** OVR da carta (escala 0–99), `null` sem avaliações. */
  ovr: number | null;
  /** Média de cada atributo ao longo das rodadas, na escala da carta (Ataque já com o bônus de gols). */
  attributes: Partial<Record<PlayerAttribute, number>>;
};

/** Quantas rodadas contam na carta (decisão do dono do app em 2026-11-10: "o desempenho do último mês"). */
export const CAREER_WINDOW_ROUNDS = 5;

/** Uma rodada na escala da carta: atributos (0–99) e OVR. */
export type RoundCard = { attributes: Partial<Record<PlayerAttribute, number>>; ovr: number | null };

/**
 * Uma rodada na escala da carta, **com os gols dela**: cada gol confirmado na rodada soma 1 no Ataque (VEL e CHU, teto de
 * `GOAL_ATTACK_BONUS_MAX`, sem goleiro) e o OVR da rodada sobe o quanto o Ataque maior fizer subir a média das 2 maiores
 * estatísticas (decisão do dono do app em 2026-11-10: os gols somam na nota da rodada, não na média geral).
 */
function roundCard(totals: OvrTotals, goals: number): RoundCard {
  const attributes = Object.fromEntries(
    [...totals].map(([key, total]) => [key, toCardScale(total.sum / total.count)]),
  ) as Partial<Record<PlayerAttribute, number>>;
  const isGoalkeeper = GOALKEEPER_ATTRIBUTES.some((key) => totals.has(key));
  const bonus = isGoalkeeper ? 0 : getGoalAttackBonus(goals);
  if (bonus > 0) {
    attributes.vel = Math.min(CARD_SCALE_MAX, (attributes.vel ?? 0) + bonus);
    attributes.chu = Math.min(CARD_SCALE_MAX, (attributes.chu ?? 0) + bonus);
  }
  return { attributes, ovr: totals.size === 0 ? null : getOvrFromStats(getStatsFromAttributes(isGoalkeeper ? "goalkeeper" : "outfield", attributes)) };
}

/** A carta de UMA rodada (atributos e OVR), com os gols dela; `null` sem notas. Alimenta a animação "Sua rodada". */
export function computeRoundCard(evaluations: readonly Evaluation[], goals = 0): RoundCard | null {
  const totals: OvrTotals = new Map();
  for (const evaluation of evaluations) addToOvrTotals(totals, evaluation);
  return totals.size === 0 ? null : roundCard(totals, goals);
}

/** Nota de UMA rodada (OVR da rodada) já com os gols que o jogador fez nela. É a que aparece no histórico e na mesa tática. */
export function computeRoundOvr(evaluations: readonly Evaluation[], goals = 0): number | null {
  const totals: OvrTotals = new Map();
  for (const evaluation of evaluations) addToOvrTotals(totals, evaluation);
  return roundCard(totals, goals).ovr;
}

/**
 * Carta de carreira (decisão do dono do app em 2026-11-10, vale desde a primeira rodada): o OVR do jogador é a
 * **média simples das notas das suas últimas `CAREER_WINDOW_ROUNDS` rodadas avaliadas** e cada atributo é a média dele
 * nessas rodadas. A nota de cada rodada já leva os gols confirmados nela (`roundCard`): os gols somam na rodada, não
 * na média geral. Em cada rodada já saíram a maior e a menor nota (o banco entrega `counted_evaluations`).
 * `evaluations` são todas de rodadas fechadas, só na posição do cadastro; `roundOrder` dá a posição
 * de cada rodada no tempo (número da rodada) e `goalsByMatch` os gols confirmados do jogador em cada uma.
 * Espelha `compute_match_awards` no banco.
 */
export function computeCareerCard(
  evaluations: readonly Evaluation[],
  roundOrder: ReadonlyMap<string, number>,
  goalsByMatch: ReadonlyMap<string, number> = new Map(),
): CareerCard {
  const byRound = new Map<string, OvrTotals>();
  for (const evaluation of evaluations) {
    let totals = byRound.get(evaluation.matchId);
    if (!totals) byRound.set(evaluation.matchId, (totals = new Map()));
    addToOvrTotals(totals, evaluation);
  }
  const windowRounds = [...byRound]
    .filter(([, totals]) => totals.size > 0)
    .toSorted(([a], [b]) => (roundOrder.get(a) ?? 0) - (roundOrder.get(b) ?? 0))
    .slice(-CAREER_WINDOW_ROUNDS);

  const roundOvrs: number[] = [];
  const attributeRounds = new Map<PlayerAttribute, number[]>();
  for (const [matchId, totals] of windowRounds) {
    const roundGoals = goalsByMatch.get(matchId) ?? 0;
    const card = roundCard(totals, roundGoals);
    if (card.ovr === null) continue;
    roundOvrs.push(card.ovr);
    for (const [key, value] of Object.entries(card.attributes) as [PlayerAttribute, number][]) {
      const list = attributeRounds.get(key);
      if (list) list.push(value);
      else attributeRounds.set(key, [value]);
    }
  }
  if (roundOvrs.length === 0) return { ovr: null, attributes: {} };

  const attributes: Partial<Record<PlayerAttribute, number>> = {};
  for (const [key, values] of attributeRounds) attributes[key] = Math.min(CARD_SCALE_MAX, Math.round(average(values) ?? 0));
  const ovr = Math.min(CARD_SCALE_MAX, Math.round(average(roundOvrs) ?? 0));
  return { ovr, attributes };
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
