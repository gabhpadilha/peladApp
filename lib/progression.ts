import { averageEvaluations, computeOvr } from "@/lib/ovr";
import { getClosedMatches } from "@/lib/players";
import type { AwardKind } from "@/types/award";
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
  { label: "Jogador do Mês", value: `+${COINS_BEST_PLAYER}` },
  { label: "Outros prêmios positivos", value: `+${COINS_OTHER_POSITIVE_AWARD}` },
  { label: "Subir de nível", value: `+${COINS_PER_LEVEL}` },
] as const;

export const XP_RULES = [
  { label: "Nota da rodada × 10", value: "7,5 → 75 XP" },
  { label: "Nota 8+ / 9+", value: `+${XP_HIGH_SCORE_BONUS[80]} / +${XP_HIGH_SCORE_BONUS[90]} XP` },
  { label: "Enviar as suas notas", value: `+${XP_SUBMITTED} XP` },
  { label: "Melhor Jogador", value: `+${XP_BEST_PLAYER} XP` },
  { label: "Jogador do Mês", value: `+${XP_BEST_PLAYER} XP` },
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

function pickBonus(score: number, table: Readonly<Record<number, number>>): number {
  const threshold = Object.keys(table)
    .map(Number)
    .toSorted((a, b) => b - a)
    .find((value) => score >= value);
  return threshold === undefined ? 0 : (table[threshold] ?? 0);
}

export function submissionKey(matchId: string, memberId: string): string {
  return `${matchId}:${memberId}`;
}

export function computeProgression({ playerId, matches, evaluations, awards, submissions }: ProgressionInput): Progression {
  let xp = 0;
  let coins = 0;
  let previousOvr: number | null = null;
  const receivedSoFar: Evaluation[] = [];

  for (const match of getClosedMatches(matches)) {
    const received = evaluations.filter((evaluation) => evaluation.matchId === match.id && evaluation.playerId === playerId);
    receivedSoFar.push(...received);
    const ovr = computeOvr(receivedSoFar);

    if (match.presentPlayerIds.includes(playerId)) {
      coins += COINS_PLAYED;

      const score = averageEvaluations(received);
      if (score !== null) {
        xp += score + pickBonus(score, XP_HIGH_SCORE_BONUS);
        coins += pickBonus(score, COINS_SCORE_BONUS);
      }
      if (submissions.has(submissionKey(match.id, playerId))) {
        xp += XP_SUBMITTED;
        coins += COINS_SUBMITTED;
      }
      if (previousOvr !== null && ovr !== null && ovr > previousOvr) coins += COINS_OVR_UP;

      for (const award of awards) {
        if (award.matchId !== match.id || award.memberId !== playerId || NON_POSITIVE_AWARDS.has(award.kind)) continue;
        if (award.kind === "jogador_do_mes") continue;
        const isBestPlayer = award.kind === "craque";
        xp += isBestPlayer ? XP_BEST_PLAYER : XP_OTHER_POSITIVE_AWARD;
        coins += isBestPlayer ? COINS_BEST_PLAYER : COINS_OTHER_POSITIVE_AWARD;
      }
    }
    // Jogador do Mês: vale o mesmo que o Melhor Jogador, mesmo sem ter jogado a última quinta.
    for (const award of awards) {
      if (award.matchId !== match.id || award.memberId !== playerId || award.kind !== "jogador_do_mes") continue;
      xp += XP_BEST_PLAYER;
      coins += COINS_BEST_PLAYER;
    }
    if (ovr !== null) previousOvr = ovr;
  }

  const progress = getLevelProgress(xp);
  return { ...progress, xp, coinsEarned: WELCOME_BONUS_COINS + coins + progress.level * COINS_PER_LEVEL };
}
