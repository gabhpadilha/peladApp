import { averageEvaluations } from "@/lib/ovr";
import {
  getMatchPerformances,
  getPendingEvaluations,
  getSubmissionProgress,
  rankPlayers,
  type PendingEvaluation,
} from "@/lib/players";
import { getMockLeague } from "@/lib/mocks/league";
import type { Match, UpcomingMatch } from "@/types/match";
import type { Player } from "@/types/player";

const OUTFIELD_RANKING_SIZE = 5;
const GOALKEEPER_RANKING_SIZE = 2;
const TOP_PERFORMERS_SIZE = 3;

export type RankedPlayer = { player: Player; position: number; delta: number | null };
export type RoundPerformer = { player: Player; score: number };

export type HomeData = {
  currentPlayer: Player;
  isCurrentPlayerMvp: boolean;
  currentDelta: number | null;
  currentRank: { position: number; total: number };
  gamesPlayed: number;
  evaluationsReceived: number;
  pending: PendingEvaluation[];
  upcomingMatch: UpcomingMatch;
  latestRound: { match: Match; topPerformers: RoundPerformer[]; mvpId: string | null } | null;
  openRound: { match: Match; submitted: number; expected: number } | null;
  outfieldRanking: RankedPlayer[];
  goalkeeperRanking: RankedPlayer[];
};

export async function getHomeData(): Promise<HomeData> {
  const league = getMockLeague();
  const currentPlayer = league.players.find((player) => player.id === league.currentUserId);
  if (!currentPlayer) {
    throw new Error("Jogador logado não encontrado");
  }

  const roleRanking = rankPlayers(league.players, currentPlayer.role);
  const performances = getMatchPerformances(currentPlayer.id, league.matches, league.evaluations);

  const toRanked = (player: Player, index: number): RankedPlayer => ({
    player,
    position: index + 1,
    delta: league.getDelta(player),
  });

  const latestMatch = league.latestClosedMatch;
  const topPerformers = latestMatch
    ? league.players
        .flatMap((player) => {
          const received = league.evaluations.filter(
            (evaluation) =>
              evaluation.matchId === latestMatch.id && evaluation.playerId === player.id,
          );
          const score = averageEvaluations(received);
          return score === null ? [] : [{ player, score }];
        })
        .toSorted((a, b) => b.score - a.score)
        .slice(0, TOP_PERFORMERS_SIZE)
    : [];

  const openMatch = league.matches.find((match) => match.status === "open");

  return {
    currentPlayer,
    isCurrentPlayerMvp: league.mvpId === currentPlayer.id,
    currentDelta: league.getDelta(currentPlayer),
    currentRank: {
      position: roleRanking.findIndex((player) => player.id === currentPlayer.id) + 1,
      total: roleRanking.length,
    },
    gamesPlayed: performances.filter((performance) => performance.wasPresent).length,
    evaluationsReceived: performances.reduce(
      (total, performance) => total + performance.evaluationCount,
      0,
    ),
    pending: getPendingEvaluations(currentPlayer.id, league.matches, league.evaluations),
    upcomingMatch: league.upcomingMatch,
    latestRound: latestMatch ? { match: latestMatch, topPerformers, mvpId: league.mvpId } : null,
    openRound: openMatch
      ? { match: openMatch, ...getSubmissionProgress(openMatch, league.evaluations) }
      : null,
    outfieldRanking: rankPlayers(league.players, "outfield")
      .slice(0, OUTFIELD_RANKING_SIZE)
      .map(toRanked),
    goalkeeperRanking: rankPlayers(league.players, "goalkeeper")
      .slice(0, GOALKEEPER_RANKING_SIZE)
      .map(toRanked),
  };
}
