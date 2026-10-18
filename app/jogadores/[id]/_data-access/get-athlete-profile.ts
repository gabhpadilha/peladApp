import {
  getMatchPerformances,
  getPendingEvaluations,
  rankPlayers,
  type MatchPerformance,
  type PendingEvaluation,
} from "@/lib/players";
import { getMockLeague } from "@/lib/mocks/league";
import type { Player } from "@/types/player";

export type AthleteProfile = {
  player: Player;
  isMvp: boolean;
  isOwnProfile: boolean;
  delta: number | null;
  rank: { position: number; total: number };
  gamesPlayed: number;
  evaluationsReceived: number;
  bestScore: number | null;
  performances: MatchPerformance[];
  /** Só preenchido no perfil do próprio jogador logado. */
  pending: PendingEvaluation[];
};

/** Perfil público de um atleta; `null` se o id não existir. */
export async function getAthleteProfile(playerId: string): Promise<AthleteProfile | null> {
  const league = getMockLeague();
  const player = league.players.find((candidate) => candidate.id === playerId);
  if (!player) return null;

  const isOwnProfile = player.id === league.currentUserId;
  const roleRanking = rankPlayers(league.players, player.role);
  const performances = getMatchPerformances(player.id, league.matches, league.evaluations);
  const scores = performances.flatMap((performance) =>
    performance.score === null ? [] : [performance.score],
  );

  return {
    player,
    isMvp: league.mvpId === player.id,
    isOwnProfile,
    delta: league.getDelta(player),
    rank: {
      position: roleRanking.findIndex((candidate) => candidate.id === player.id) + 1,
      total: roleRanking.length,
    },
    gamesPlayed: performances.filter((performance) => performance.wasPresent).length,
    evaluationsReceived: performances.reduce(
      (total, performance) => total + performance.evaluationCount,
      0,
    ),
    bestScore: scores.length > 0 ? Math.max(...scores) : null,
    performances,
    pending: isOwnProfile
      ? getPendingEvaluations(player.id, league.matches, league.evaluations)
      : [],
  };
}

/** Jogador logado, para o cabeçalho. */
export async function getCurrentPlayer(): Promise<Player> {
  const league = getMockLeague();
  const player = league.players.find((candidate) => candidate.id === league.currentUserId);
  if (!player) {
    throw new Error("Jogador logado não encontrado");
  }
  return player;
}
