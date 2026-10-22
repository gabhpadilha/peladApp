import { averageEvaluations, getEvaluationScore, toCardScale } from "@/lib/ovr";
import { getClosedMatches } from "@/lib/players";
import { AWARD_LABELS, type AwardKind } from "@/types/award";
import type { Evaluation, Match } from "@/types/match";

/*
 * XP, nível e PeladaCoins, sempre calculados do histórico (rodadas fechadas),
 * como o OVR: quem já jogou começa com o nível certo e as regras podem mudar
 * sem perder nada. O XP nunca cai. Valores aprovados pelo dono do app (2026-10-21).
 */

/** XP de uma rodada: nota recebida (escala 0–99, ex.: 7,5 → 75) + bônus. */
const XP_HIGH_SCORE_BONUS = { 90: 40, 80: 20 } as const;
const XP_SUBMITTED = 10;
const XP_BEST_PLAYER = 100;
const XP_OTHER_POSITIVE_AWARD = 60;

/** PeladaCoins de uma rodada. */
const COINS_PLAYED = 20;
const COINS_SUBMITTED = 10;
const COINS_SCORE_BONUS = { 90: 30, 80: 20, 70: 10 } as const;
const COINS_OVR_UP = 10;
const COINS_BEST_PLAYER = 60;
const COINS_OTHER_POSITIVE_AWARD = 30;
const COINS_PER_LEVEL = 20;
/** Bônus de primeiro login: todo jogador começa com ele (aviso na home). */
export const WELCOME_BONUS_COINS = 150;

/** As regras como aparecem para o jogador (Loja e perfil), tiradas das mesmas constantes. */
export const COIN_RULES = [
  { label: "Bônus de boas-vindas", value: `+${WELCOME_BONUS_COINS}` },
  { label: "Jogar uma rodada", value: `+${COINS_PLAYED}` },
  { label: "Enviar as suas notas", value: `+${COINS_SUBMITTED}` },
  { label: "Nota 7+ / 8+ / 9+", value: `+${COINS_SCORE_BONUS[70]} / +${COINS_SCORE_BONUS[80]} / +${COINS_SCORE_BONUS[90]}` },
  { label: "OVR subiu na rodada", value: `+${COINS_OVR_UP}` },
  { label: "Melhor Jogador", value: `+${COINS_BEST_PLAYER}` },
  { label: "Time do Mês", value: `+${COINS_BEST_PLAYER}` },
  { label: "Outros prêmios positivos", value: `+${COINS_OTHER_POSITIVE_AWARD}` },
  { label: "Subir de nível", value: `+${COINS_PER_LEVEL}` },
] as const;

export const XP_RULES = [
  { label: "Nota da rodada × 10", value: "7,5 → 75 XP" },
  { label: "Nota 8+ / 9+", value: `+${XP_HIGH_SCORE_BONUS[80]} / +${XP_HIGH_SCORE_BONUS[90]} XP` },
  { label: "Enviar as suas notas", value: `+${XP_SUBMITTED} XP` },
  { label: "Melhor Jogador", value: `+${XP_BEST_PLAYER} XP` },
  { label: "Time do Mês", value: `+${XP_BEST_PLAYER} XP` },
  { label: "Outros prêmios positivos", value: `+${XP_OTHER_POSITIVE_AWARD} XP` },
] as const;

/** Prêmios de zoeira: não dão nem tiram nada. */
const NON_POSITIVE_AWARDS: ReadonlySet<AwardKind> = new Set(["fominha", "bola_murcha"]);

/** XP para ir do nível `level` ao seguinte: 60, 70, 80… (no começo, um nível por jogo). */
export function xpForNextLevel(level: number): number {
  return 60 + 10 * level;
}

export type LevelProgress = {
  level: number;
  /** XP acumulado dentro do nível atual. */
  xpIntoLevel: number;
  /** XP que o nível atual pede para subir. */
  xpNeeded: number;
};

export function getLevelProgress(xp: number): LevelProgress {
  let level = 0;
  let remaining = xp;
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level++;
  }
  return { level, xpIntoLevel: remaining, xpNeeded: xpForNextLevel(level) };
}

export type Progression = LevelProgress & {
  xp: number;
  /** PeladaCoins ganhas no total (o saldo desconta as compras). */
  coinsEarned: number;
};

export type ProgressionAward = { kind: AwardKind; matchId: string; memberId: string };

type ProgressionInput = {
  playerId: string;
  matches: readonly Match[];
  /** Notas das rodadas fechadas (anônimas). */
  evaluations: readonly Evaluation[];
  awards: readonly ProgressionAward[];
  /** `matchId:memberId` de quem enviou notas em cada rodada fechada. */
  submissions: ReadonlySet<string>;
};

// Performance: os limites de cada tabela são ordenados uma vez só (antes, a cada
// chamada: Object.keys + map + sort por jogador e por rodada).
const sortedThresholds = new WeakMap<object, number[]>();

function pickBonus(score: number, table: Readonly<Record<number, number>>): number {
  let thresholds = sortedThresholds.get(table);
  if (!thresholds) {
    thresholds = Object.keys(table)
      .map(Number)
      .toSorted((a, b) => b - a);
    sortedThresholds.set(table, thresholds);
  }
  const threshold = thresholds.find((value) => score >= value);
  return threshold === undefined ? 0 : (table[threshold] ?? 0);
}

export function submissionKey(matchId: string, memberId: string): string {
  return `${matchId}:${memberId}`;
}

/** Uma linha do que a rodada deu ao jogador (tela "Você ganhou" depois do pacote). */
export type RoundGain = {
  key: string;
  label: string;
  /** Ex.: "7,8 × 10" na nota, "74 → 75" no OVR. */
  detail?: string;
  xp: number;
  coins: number;
};

const scoreFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const NO_EVALUATIONS: readonly Evaluation[] = [];
const NO_AWARDS: readonly ProgressionAward[] = [];

/**
 * Performance: índice `jogador → rodada → itens`, montado uma vez por lista e
 * reaproveitado (WeakMap pela própria lista, sem vazar memória entre requisições).
 * Antes, `walkRounds` filtrava todas as notas e todos os prêmios a cada rodada de
 * cada jogador: O(jogadores × rodadas × notas) só para a home. Agora cada lista é
 * percorrida uma vez e a busca por rodada é O(1).
 */
const evaluationIndexes = new WeakMap<readonly Evaluation[], Map<string, Map<string, Evaluation[]>>>();
const awardIndexes = new WeakMap<readonly ProgressionAward[], Map<string, Map<string, ProgressionAward[]>>>();

function indexByPlayerAndMatch<Item>(
  items: readonly Item[],
  cacheMap: WeakMap<readonly Item[], Map<string, Map<string, Item[]>>>,
  keysOf: (item: Item) => { playerId: string; matchId: string },
): Map<string, Map<string, Item[]>> {
  const cached = cacheMap.get(items);
  if (cached) return cached;
  const index = new Map<string, Map<string, Item[]>>();
  for (const item of items) {
    const { playerId, matchId } = keysOf(item);
    let byMatch = index.get(playerId);
    if (!byMatch) index.set(playerId, (byMatch = new Map()));
    const list = byMatch.get(matchId);
    // A ordem original é mantida: as somas (e o arredondamento) ficam idênticas.
    if (list) list.push(item);
    else byMatch.set(matchId, [item]);
  }
  cacheMap.set(items, index);
  return index;
}

/** Rodada a rodada (só as fechadas), na ordem: o que cada uma deu ao jogador. */
function* walkRounds({ playerId, matches, evaluations, awards, submissions }: ProgressionInput) {
  let previousOvr: number | null = null;
  // Performance: OVR acumulado com soma e contagem correntes. Antes, `computeOvr`
  // recalculava todo o histórico a cada rodada (O(rodadas²) por jogador). A soma é
  // feita na mesma ordem de antes, então o resultado é exatamente o mesmo.
  let scoreSum = 0;
  let scoreCount = 0;
  const evaluationsByMatch = indexByPlayerAndMatch(evaluations, evaluationIndexes, (evaluation) => evaluation).get(playerId);
  const awardsByMatch = indexByPlayerAndMatch(awards, awardIndexes, (award) => ({
    playerId: award.memberId,
    matchId: award.matchId,
  })).get(playerId);

  for (const match of getClosedMatches(matches)) {
    const received = evaluationsByMatch?.get(match.id) ?? NO_EVALUATIONS;
    const playerAwards = awardsByMatch?.get(match.id) ?? NO_AWARDS;
    for (const evaluation of received) scoreSum += getEvaluationScore(evaluation);
    scoreCount += received.length;
    const ovr = scoreCount === 0 ? null : toCardScale(scoreSum / scoreCount);
    const gains: RoundGain[] = [];

    if (match.presentPlayerIds.includes(playerId)) {
      const score = averageEvaluations(received);
      if (score !== null) {
        const xpBonus = pickBonus(score, XP_HIGH_SCORE_BONUS);
        const bonusLabel = score >= 90 ? " + bônus nota 9+" : score >= 80 ? " + bônus nota 8+" : "";
        gains.push({
          key: "score",
          label: "Nota da rodada",
          detail: `${scoreFormatter.format(score / 10)} × 10${bonusLabel}`,
          xp: score + xpBonus,
          coins: pickBonus(score, COINS_SCORE_BONUS),
        });
      }
      for (const award of playerAwards) {
        if (NON_POSITIVE_AWARDS.has(award.kind)) continue;
        if (award.kind === "jogador_do_mes") continue;
        const isBestPlayer = award.kind === "craque";
        gains.push({
          key: `award-${award.kind}`,
          label: `Prêmio: ${AWARD_LABELS[award.kind].title}`,
          xp: isBestPlayer ? XP_BEST_PLAYER : XP_OTHER_POSITIVE_AWARD,
          coins: isBestPlayer ? COINS_BEST_PLAYER : COINS_OTHER_POSITIVE_AWARD,
        });
      }
      if (submissions.has(submissionKey(match.id, playerId))) {
        gains.push({ key: "submitted", label: "Enviou as suas notas", xp: XP_SUBMITTED, coins: COINS_SUBMITTED });
      }
      gains.push({ key: "played", label: "Jogou a rodada", xp: 0, coins: COINS_PLAYED });
      if (previousOvr !== null && ovr !== null && ovr > previousOvr) {
        gains.push({
          key: "ovr",
          label: "OVR subiu",
          detail: `${Math.round(previousOvr)} → ${Math.round(ovr)}`,
          xp: 0,
          coins: COINS_OVR_UP,
        });
      }
    }
    // Time do Mês: vale o mesmo que o Melhor Jogador, mesmo sem ter jogado a última quinta.
    for (const award of playerAwards) {
      if (award.kind !== "jogador_do_mes") continue;
      gains.unshift({ key: "award-jogador_do_mes", label: "Prêmio: Time do Mês", xp: XP_BEST_PLAYER, coins: COINS_BEST_PLAYER });
    }
    const ovrBefore = previousOvr;
    if (ovr !== null) previousOvr = ovr;
    yield { match, gains, ovrBefore, ovrAfter: ovr, score: averageEvaluations(received), ratings: received.length };
  }
}

const sumGains = (gains: readonly RoundGain[]) => ({
  xp: gains.reduce((total, gain) => total + gain.xp, 0),
  coins: gains.reduce((total, gain) => total + gain.coins, 0),
});

export function computeProgression(input: ProgressionInput): Progression {
  let xp = 0;
  let coins = 0;
  for (const { gains } of walkRounds(input)) {
    const round = sumGains(gains);
    xp += round.xp;
    coins += round.coins;
  }

  const progress = getLevelProgress(xp);
  return { ...progress, xp, coinsEarned: WELCOME_BONUS_COINS + coins + progress.level * COINS_PER_LEVEL };
}

export type RoundRewards = {
  gains: RoundGain[];
  /** XP e PeladaCoins da rodada (as moedas já com o bônus de nível). */
  xp: number;
  coins: number;
  before: LevelProgress;
  after: LevelProgress;
  /** PeladaCoins do bônus por nível que a rodada fez subir. */
  levelUpCoins: number;
  /** Nota recebida na rodada (0–99, ex.: 7,8 → 78) e de quantas avaliações; `null` sem notas. */
  score: number | null;
  ratings: number;
  /** OVR antes e depois da rodada (0–99); `null` enquanto não tinha notas. */
  ovrBefore: number | null;
  ovrAfter: number | null;
};

/** O que uma rodada fechada deu ao jogador; `null` se ela não deu nada (ou não está fechada). */
export function computeRoundRewards(input: ProgressionInput & { matchId: string }): RoundRewards | null {
  let xpBefore = 0;
  for (const { match, gains, ovrBefore, ovrAfter, score, ratings } of walkRounds(input)) {
    const round = sumGains(gains);
    if (match.id !== input.matchId) {
      xpBefore += round.xp;
      continue;
    }
    if (gains.length === 0) return null;
    const before = getLevelProgress(xpBefore);
    const after = getLevelProgress(xpBefore + round.xp);
    const levelUpCoins = (after.level - before.level) * COINS_PER_LEVEL;
    return {
      gains,
      xp: round.xp,
      coins: round.coins + levelUpCoins,
      before,
      after,
      levelUpCoins,
      score,
      ratings,
      ovrBefore,
      ovrAfter,
    };
  }
  return null;
}
