import { z } from "zod";
import { getLeague } from "@/lib/league";
import {
  getMatchPerformances,
  rankPlayers,
  type MatchPerformance,
  type PendingEvaluation,
} from "@/lib/players";
import type { Player } from "@/types/player";

export type AthleteProfile = {
  player: Player;
  /** Jogador logado, para o cabeçalho. */
  currentPlayer: Player | undefined;
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

/** Perfil de um atleta da pelada ativa; `null` se o id não for de alguém dela. */
export async function getAthleteProfile(memberId: string): Promise<AthleteProfile | null> {
  if (!z.uuid().safeParse(memberId).success) return null;

  const league = await getLeague(`/jogadores/${memberId}`);
  const player = league.players.find((candidate) => candidate.id === memberId);
  if (!player) return null;

  const isOwnProfile = player.id === league.currentMemberId;
  const roleRanking = rankPlayers(league.players, player.role);
  const performances = getMatchPerformances(player.id, league.matches, league.evaluations);
  const scores = performances.flatMap((performance) =>
    performance.score === null ? [] : [performance.score],
  );

  return {
    player,
    currentPlayer: league.players.find((candidate) => candidate.id === league.currentMemberId),
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
    pending: isOwnProfile ? league.pending : [],
  };
}
