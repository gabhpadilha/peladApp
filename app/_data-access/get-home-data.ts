import { getLeague } from "@/lib/league";
import { averageEvaluations } from "@/lib/ovr";
import { getMatchPerformances, rankPlayers, type PendingEvaluation } from "@/lib/players";
import type { Award } from "@/types/award";
import type { Match } from "@/types/match";
import type { Player } from "@/types/player";

const TOP_PERFORMERS_SIZE = 3;

export type RankedPlayer = { player: Player; position: number; delta: number | null };
export type RoundPerformer = { player: Player; score: number };

export type HomeData = {
  groupName: string;
  currentPlayer: Player;
  currentDelta: number | null;
  currentRank: { position: number; total: number };
  gamesPlayed: number;
  evaluationsReceived: number;
  /** Cartas especiais do jogador logado (coleção). */
  myAwardCount: number;
  pending: PendingEvaluation[];
  latestRound: { match: Match; topPerformers: RoundPerformer[]; awards: Award[] } | null;
  openRound: { match: Match; submitted: number; expected: number } | null;
  outfieldRanking: RankedPlayer[];
  goalkeeperRanking: RankedPlayer[];
};

export async function getHomeData(): Promise<HomeData> {
  const league = await getLeague("/");
  const currentPlayer = league.players.find((player) => player.id === league.currentMemberId);
  if (!currentPlayer) {
    throw new Error("Jogador logado não encontrado na pelada");
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

  const openMatch = league.matches.findLast((match) => match.status === "open");

  return {
    groupName: league.membership.groupName,
    currentPlayer,
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
    myAwardCount: league.awards.filter((award) => award.memberId === currentPlayer.id).length,
    pending: league.pending,
    latestRound: latestMatch
      ? {
          match: latestMatch,
          topPerformers,
          awards: league.awards.filter((award) => award.matchId === latestMatch.id),
        }
      : null,
    openRound: openMatch
      ? {
          match: openMatch,
          submitted: league.submittedByMatch.get(openMatch.id) ?? 0,
          expected: openMatch.presentPlayerIds.length,
        }
      : null,
    // Completos: a home mostra o resumo e expande para o ranking inteiro.
    outfieldRanking: rankPlayers(league.players, "outfield").map(toRanked),
    goalkeeperRanking: rankPlayers(league.players, "goalkeeper").map(toRanked),
  };
}
