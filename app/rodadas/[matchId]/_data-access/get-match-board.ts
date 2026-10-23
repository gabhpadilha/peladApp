import { z } from "zod";
import { getLeague } from "@/lib/league";
import { averageEvaluations } from "@/lib/ovr";
import { getRoundRole, getRoundSlotPosition, type PlayerRole, type PlaysInGoal } from "@/lib/round-position";
import { createClient } from "@/lib/supabase/server";
import { teamName } from "@/lib/teams";
import type { Evaluation, Match } from "@/types/match";
import type { Player, PlayerPosition } from "@/types/player";

export type BoardPlayer = {
  player: Player;
  /** 1 = Branco, 2 = Preto. */
  team: number;
  isReserve: boolean;
  /** É quem está logado (não se avalia). */
  isSelf: boolean;
  /** Nota que a rodada deu ao jogador (0–99); só em rodada fechada com notas. */
  roundScore: number | null;
  /** Papel na rodada (decide os atributos das notas). */
  role: PlayerRole;
  /** `match_attendance.plays_in_goal`: fora da posição do cadastro quando não é `null`. */
  playsInGoal: PlaysInGoal;
  /** Posição no campo da mesa (quem jogou no gol vai para o gol). */
  slotPosition: PlayerPosition;
  /** O logado já deu nota a ele nessa rodada. */
  isRatedByMe: boolean;
};

export type BoardTeam = {
  number: number;
  name: string;
  starters: BoardPlayer[];
  reserves: BoardPlayer[];
  /** Média de OVR dos titulares que já têm OVR. */
  averageOvr: number | null;
};

export type MatchBoard = {
  match: Pick<Match, "id" | "round" | "date" | "status">;
  groupName: string;
  currentPlayer: Player | undefined;
  teams: BoardTeam[];
  isOrganizer: boolean;
  /** Rodada aberta, o logado jogou e ainda falta dar nota para alguém. */
  canRate: boolean;
  /** Organizador com a rodada aberta: pode marcar quem jogou fora da posição. */
  canEditPositions: boolean;
  /** O logado já enviou as notas dessa rodada. */
  hasSubmitted: boolean;
  /** Rodada aberta e o logado não foi escalado: só vê os times. */
  isOutOfRound: boolean;
  /** Quantos jogadores ainda faltam para o logado avaliar (todos menos ele e quem já tem nota dele). */
  ratableCount: number;
};

/** Mesa tática de uma rodada: os dois times com titulares e reservas. `null` se não existir na pelada. */
export async function getMatchBoard(matchId: string): Promise<MatchBoard | null> {
  if (!z.uuid().safeParse(matchId).success) return null;

  // Performance: a presença da rodada é buscada em paralelo com a liga (antes, só
  // depois dela: uma ida e volta a mais ao banco). O RLS protege a consulta do mesmo
  // jeito, e quem não pode ver a pelada continua barrado pelo `getLeague`.
  const supabase = await createClient();
  const [league, attendanceResult] = await Promise.all([
    getLeague(`/rodadas/${matchId}`),
    supabase.from("match_attendance").select("member_id, team, reserve, plays_in_goal").eq("match_id", matchId),
  ]);
  const match = league.matches.find((candidate) => candidate.id === matchId);
  if (!match) return null;

  const { data: attendance, error } = attendanceResult;
  if (error) throw error;

  const playerById = new Map(league.players.map((player) => [player.id, player]));
  // Performance: a nota de cada um nesta rodada sai das notas desta rodada, agrupadas
  // numa passada só. Antes, cada jogador montava o desempenho de todas as rodadas
  // (O(jogadores × (rodadas + notas))) para depois pegar uma. A nota só aparece em
  // rodada fechada, como em `getMatchPerformances` (que só olha as fechadas).
  const receivedByPlayer = new Map<string, Evaluation[]>();
  if (match.status === "closed") {
    for (const evaluation of league.evaluations) {
      if (evaluation.matchId !== matchId) continue;
      const received = receivedByPlayer.get(evaluation.playerId);
      if (received) received.push(evaluation);
      else receivedByPlayer.set(evaluation.playerId, [evaluation]);
    }
  }
  const scoreByPlayer = new Map(
    [...receivedByPlayer].map(([playerId, received]) => [playerId, averageEvaluations(received)]),
  );

  const onBoard: BoardPlayer[] = attendance.flatMap((row) => {
    const player = playerById.get(row.member_id);
    if (!player) return [];
    return [
      {
        player,
        team: row.team,
        isReserve: row.reserve,
        isSelf: player.id === league.currentMemberId,
        roundScore: match.status === "closed" ? (scoreByPlayer.get(player.id) ?? null) : null,
        role: getRoundRole(player, row.plays_in_goal),
        playsInGoal: row.plays_in_goal,
        slotPosition: getRoundSlotPosition(player, row.plays_in_goal),
        isRatedByMe: league.hasRated(matchId, player.id),
      },
    ];
  });

  const byNickname = (a: BoardPlayer, b: BoardPlayer) => a.player.nickname.localeCompare(b.player.nickname, "pt-BR");
  const teamNumbers = [...new Set(onBoard.map((entry) => entry.team))].toSorted((a, b) => a - b);
  const teams: BoardTeam[] = teamNumbers.map((number) => {
    const members = onBoard.filter((entry) => entry.team === number);
    const starters = members.filter((entry) => !entry.isReserve).toSorted(byNickname);
    const ovrs = starters.flatMap((entry) => (entry.player.ovr === null ? [] : [entry.player.ovr]));
    return {
      number,
      name: teamName(number),
      starters,
      reserves: members.filter((entry) => entry.isReserve).toSorted(byNickname),
      averageOvr: ovrs.length > 0 ? Math.round(ovrs.reduce((sum, ovr) => sum + ovr, 0) / ovrs.length) : null,
    };
  });

  const isPresent = match.presentPlayerIds.includes(league.currentMemberId);
  const isPending = league.pending.some((pending) => pending.match.id === matchId);
  return {
    match: { id: match.id, round: match.round, date: match.date, status: match.status },
    groupName: league.membership.groupName,
    currentPlayer: playerById.get(league.currentMemberId),
    teams,
    isOrganizer: league.membership.role === "organizer",
    canRate: match.status === "open" && isPresent && isPending,
    canEditPositions: match.status === "open" && league.membership.role === "organizer",
    hasSubmitted: match.status === "open" && isPresent && !isPending,
    isOutOfRound: match.status === "open" && !isPresent,
    ratableCount: onBoard.filter((entry) => !entry.isSelf && !entry.isRatedByMe).length,
  };
}
