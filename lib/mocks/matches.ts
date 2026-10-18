import { SCORE_MAX, SCORE_MIN } from "@/lib/ovr";
import type { Evaluation, Match, UpcomingMatch } from "@/types/match";
import { GOALKEEPER_ATTRIBUTES, OUTFIELD_ATTRIBUTES } from "@/types/player";
import { MOCK_CURRENT_USER_ID, MOCK_PROFILES, MOCK_SKILLS } from "./players";

/**
 * Rodadas e avaliações simuladas, geradas com semente fixa para o
 * resultado ser sempre o mesmo (no servidor e entre recarregamentos).
 */

const ROUND_COUNT = 8;
const FIRST_MATCH_DATE = "2026-08-29";
const DAYS_BETWEEN_MATCHES = 7;
const PRESENCE_CHANCE = 0.85;
/** Chance de cada presente enviar as notas da rodada. */
const CLOSED_ROUND_SUBMISSION_CHANCE = 0.9;
const OPEN_ROUND_SUBMISSION_CHANCE = 0.55;
/** Quem envia pode pular alguns colegas. */
const SKIP_PLAYER_CHANCE = 0.15;
const MAX_GOALS = 9;

/** PRNG mulberry32: determinístico a partir da semente. */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(20261018);

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function clampScore(value: number): number {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value)));
}

function createMatches(): Match[] {
  return Array.from({ length: ROUND_COUNT }, (_, index) => {
    const round = index + 1;
    const presentPlayerIds = MOCK_PROFILES.filter(
      (profile) =>
        profile.id === MOCK_CURRENT_USER_ID ||
        profile.role === "goalkeeper" ||
        random() < PRESENCE_CHANCE,
    ).map((profile) => profile.id);

    return {
      id: `match-${round}`,
      round,
      date: addDays(FIRST_MATCH_DATE, index * DAYS_BETWEEN_MATCHES),
      status: round === ROUND_COUNT ? "open" : "closed",
      presentPlayerIds,
      score: {
        teamA: Math.floor(random() * MAX_GOALS),
        teamB: Math.floor(random() * MAX_GOALS),
      },
    };
  });
}

function createEvaluations(matches: Match[]): Evaluation[] {
  const evaluations: Evaluation[] = [];

  for (const match of matches) {
    const submissionChance =
      match.status === "open" ? OPEN_ROUND_SUBMISSION_CHANCE : CLOSED_ROUND_SUBMISSION_CHANCE;
    const submitterIds = new Set(
      match.presentPlayerIds.filter(
        (evaluatorId) =>
          // Na rodada aberta, o usuário logado ainda não enviou as notas (pendência).
          !(match.status === "open" && evaluatorId === MOCK_CURRENT_USER_ID) &&
          random() < submissionChance,
      ),
    );

    for (const playerId of match.presentPlayerIds) {
      const profile = MOCK_PROFILES.find((candidate) => candidate.id === playerId);
      if (!profile) continue;
      const keys = profile.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
      const skill = MOCK_SKILLS[playerId];
      /** Fase do jogador na rodada: puxa todas as notas dele para cima ou para baixo. */
      const form = (random() - 0.5) * 2.4;

      for (const evaluatorId of submitterIds) {
        if (evaluatorId === playerId) continue;
        if (random() < SKIP_PLAYER_CHANCE) continue;

        const scores = Object.fromEntries(
          keys.map((key, index) => [
            key,
            clampScore(skill[index] / 10 + form + (random() - 0.5) * 1.6),
          ]),
        );
        evaluations.push({
          id: `${match.id}-${evaluatorId}-${playerId}`,
          matchId: match.id,
          evaluatorId,
          playerId,
          scores,
        });
      }
    }
  }

  return evaluations;
}

export const MOCK_MATCHES = createMatches();
export const MOCK_EVALUATIONS = createEvaluations(MOCK_MATCHES);

export const MOCK_UPCOMING_MATCH: UpcomingMatch = {
  date: addDays(FIRST_MATCH_DATE, ROUND_COUNT * DAYS_BETWEEN_MATCHES),
  time: "19:00",
  venue: "Quadra do Clube",
  confirmedCount: 11,
  capacity: 14,
};
