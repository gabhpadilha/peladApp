import { z } from "zod";
import { getGroupStatAverages } from "@/lib/athlete-insights";
import { getShareableAwardIds } from "@/lib/award-share";
import { getCurrentCardEvent, type CardThemeKey } from "@/lib/card-themes";
import { getLeague } from "@/lib/league";
import { getGroupGoals } from "@/lib/match-goals";
import {
  getMatchPerformances,
  rankPlayers,
  type MatchPerformance,
  type PendingEvaluation,
} from "@/lib/players";
import type { LevelProgress } from "@/lib/progression";
import type { Award } from "@/types/award";
import type { Player } from "@/types/player";

/** "Hoje" no fuso da pelada, `AAAA-MM-DD` (o servidor roda em UTC). */
const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/** Gols confirmados do atleta e a artilharia da pelada (só rodadas fechadas com a contagem de gols). */
export type GoalStatsData = {
  total: number;
  perGame: number;
  best: { goals: number; round: number } | null;
  /** Rodadas com a contagem em que ele jogou, e em quantas delas fez gol. */
  games: number;
  goalGames: number;
  /** Gols em cada rodada em que ele jogou (para o gráfico). */
  byRound: { round: number; goals: number }[];
  /** Posição dele na artilharia da pelada, de todos os tempos (`null` sem gols); a lista fica na home. */
  rank: number | null;
};

export type AthleteProfile = {
  player: Player;
  /** Jogador logado, para o cabeçalho. */
  currentPlayer: Player | undefined;
  isOwnProfile: boolean;
  /** `false` = desativado pelo organizador (fora do ranking). */
  isActive: boolean;
  /** Coleção de cartas especiais do atleta (mais recentes primeiro). */
  awards: Award[];
  /** Cartas que o jogador logado pode compartilhar (só no próprio perfil). */
  shareableAwardIds: string[];
  /** Nome da pelada, para o story. */
  groupName: string;
  delta: number | null;
  rank: { position: number; total: number };
  gamesPlayed: number;
  evaluationsReceived: number;
  bestScore: number | null;
  performances: MatchPerformance[];
  /** Só preenchido no perfil do próprio jogador logado. */
  pending: PendingEvaluation[];
  /** Média da pelada em cada atributo, só da mesma função (linha ou gol). */
  groupAverages: Record<string, number>;
  /** Tema das cartas especiais deste mês (prévia na coleção vazia). */
  currentTheme: CardThemeKey;
  /** Nível e XP do atleta (públicos para a pelada). */
  levelProgress: LevelProgress;
  /** Gols confirmados em cada rodada fechada (só as rodadas com a contagem de gols). */
  goalsByMatch: Record<string, number>;
  /** Resumo dos gols (sempre presente: sem rodada com a contagem, `games` é 0 e a tela explica). */
  goalStats: GoalStatsData;
};

/** Perfil de um atleta da pelada ativa; `null` se o id não for de alguém dela. */
export async function getAthleteProfile(memberId: string): Promise<AthleteProfile | null> {
  if (!z.uuid().safeParse(memberId).success) return null;

  const league = await getLeague(`/jogadores/${memberId}`);
  const player = league.players.find((candidate) => candidate.id === memberId);
  if (!player) return null;

  const isOwnProfile = player.id === league.currentMemberId;
  const isActive = league.isActive(player.id);
  // Desativado não entra no ranking: posição 0 vira "–" no perfil.
  const roleRanking = rankPlayers(league.activePlayers, player.role);
  const performances = getMatchPerformances(player.id, league.matches, league.evaluations);
  const scores = performances.flatMap((performance) =>
    performance.score === null ? [] : [performance.score],
  );

  const awards = league.awards.filter((award) => award.memberId === player.id);

  // Gols: só rodadas fechadas e com a contagem (alguém informou gols nelas).
  const groupGoals = await getGroupGoals(league.membership.groupId);
  const closedIds = new Set(league.matches.filter((match) => match.status === "closed").map((match) => match.id));
  const trackedMatchIds = new Set(groupGoals.filter((goal) => closedIds.has(goal.matchId)).map((goal) => goal.matchId));
  const goalsByMatch: Record<string, number> = {};
  for (const goal of groupGoals) {
    if (goal.memberId === player.id && trackedMatchIds.has(goal.matchId) && goal.isConfirmed) goalsByMatch[goal.matchId] = goal.goals;
  }
  const trackedGames = performances.filter((performance) => performance.wasPresent && trackedMatchIds.has(performance.match.id));
  const totalGoals = Object.values(goalsByMatch).reduce((sum, goals) => sum + goals, 0);
  const bestGame = trackedGames.reduce<{ goals: number; round: number } | null>((best, performance) => {
    const goals = goalsByMatch[performance.match.id] ?? 0;
    return goals > 0 && (best === null || goals > best.goals) ? { goals, round: performance.match.round } : best;
  }, null);

  // Artilharia: gols confirmados por jogador ativo nas rodadas com a contagem (empate: a mesma posição).
  const goalsByPlayer = new Map<string, number>();
  for (const goal of groupGoals) {
    if (!goal.isConfirmed || !trackedMatchIds.has(goal.matchId) || !league.isActive(goal.memberId)) continue;
    goalsByPlayer.set(goal.memberId, (goalsByPlayer.get(goal.memberId) ?? 0) + goal.goals);
  }
  const ownGoals = goalsByPlayer.get(player.id) ?? 0;

  return {
    player,
    currentPlayer: league.players.find((candidate) => candidate.id === league.currentMemberId),
    isOwnProfile,
    isActive,
    awards,
    shareableAwardIds: isOwnProfile ? getShareableAwardIds(awards, league.matches, league.currentMemberId) : [],
    groupName: league.membership.groupName,
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
    groupAverages: getGroupStatAverages(league.activePlayers, player.role),
    currentTheme: getCurrentCardEvent(todayFormatter.format(new Date())).theme,
    levelProgress: league.getProgression(player.id),
    goalsByMatch,
    goalStats: {
      total: totalGoals,
      perGame: trackedGames.length > 0 ? totalGoals / trackedGames.length : 0,
      best: bestGame,
      games: trackedGames.length,
      goalGames: trackedGames.filter((performance) => (goalsByMatch[performance.match.id] ?? 0) > 0).length,
      byRound: trackedGames.map((performance) => ({ round: performance.match.round, goals: goalsByMatch[performance.match.id] ?? 0 })),
      rank: ownGoals > 0 ? [...goalsByPlayer.values()].filter((goals) => goals > ownGoals).length + 1 : null,
    },
  };
}
