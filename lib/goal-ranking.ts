import { getClosedMatches } from "@/lib/players";
import { submissionKey } from "@/lib/progression";
import type { Match } from "@/types/match";

/*
 * Artilharia (decisão do dono do app em 2026-11-03): gols confirmados (3 "sim") somados nas rodadas fechadas, do mês
 * (`AAAA-MM`) ou de todos os tempos, como o ranking de pontos. Só entra quem marcou; empate: menos rodadas jogadas
 * (melhor média) e, depois, o apelido. Calculado do histórico, nada gravado.
 */

export type GoalTotals = { goals: number; games: number };

type GoalRankingInput = {
  /** Ids de membro que podem aparecer (os ativos). */
  playerIds: readonly string[];
  matches: readonly Match[];
  /** Gols confirmados por `matchId:memberId`. */
  confirmedGoals: ReadonlyMap<string, number>;
  /** Rodadas em que a contagem de gols aconteceu (alguém informou gols): só elas contam como jogos. */
  trackedMatchIds: ReadonlySet<string>;
  /** `AAAA-MM`: só as rodadas desse mês; sem ele, todas. */
  month?: string;
};

/** Gols e jogos (com a contagem) de cada jogador. */
export function computeGoalTotals({ playerIds, matches, confirmedGoals, trackedMatchIds, month }: GoalRankingInput): Map<string, GoalTotals> {
  const totals = new Map<string, GoalTotals>(playerIds.map((id) => [id, { goals: 0, games: 0 }]));
  for (const match of getClosedMatches(matches)) {
    if (!trackedMatchIds.has(match.id) || (month !== undefined && !match.date.startsWith(month))) continue;
    for (const playerId of match.presentPlayerIds) {
      const total = totals.get(playerId);
      if (!total) continue;
      total.games += 1;
      total.goals += confirmedGoals.get(submissionKey(match.id, playerId)) ?? 0;
    }
  }
  return totals;
}

export type Scorer<Item> = { player: Item; position: number; goals: number; games: number };

/** Só quem marcou, do maior para o menor; empate em gols divide a posição. */
export function rankScorers<Item extends { id: string; nickname: string }>(
  players: readonly Item[],
  totals: ReadonlyMap<string, GoalTotals>,
): Scorer<Item>[] {
  const scorers = players
    .map((player) => ({ player, ...(totals.get(player.id) ?? { goals: 0, games: 0 }) }))
    .filter((entry) => entry.goals > 0)
    .toSorted((a, b) => b.goals - a.goals || a.games - b.games || a.player.nickname.localeCompare(b.player.nickname, "pt-BR"));
  return scorers.map((entry) => ({
    ...entry,
    position: scorers.findIndex((other) => other.goals === entry.goals) + 1,
  }));
}
