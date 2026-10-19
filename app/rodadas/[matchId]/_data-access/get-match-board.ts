import { z } from "zod";
import { getLeague } from "@/lib/league";
import { getMatchPerformances } from "@/lib/players";
import { createClient } from "@/lib/supabase/server";
import { teamName } from "@/lib/teams";
import type { Match } from "@/types/match";
import type { Player } from "@/types/player";

export type BoardPlayer = {
  player: Player;
  /** 1 = Branco, 2 = Preto. */
  team: number;
  isReserve: boolean;
  /** É quem está logado (não se avalia). */
  isSelf: boolean;
  /** Nota que a rodada deu ao jogador (0–99); só em rodada fechada com notas. */
  roundScore: number | null;
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
  /** Rodada aberta, o logado jogou e ainda não enviou as notas. */
  canRate: boolean;
  /** O logado já enviou as notas dessa rodada. */
  hasSubmitted: boolean;
  /** Quantos jogadores o logado pode avaliar (todos menos ele). */
  ratableCount: number;
};

/** Mesa tática de uma rodada: os dois times com titulares e reservas. `null` se não existir na pelada. */
export async function getMatchBoard(matchId: string): Promise<MatchBoard | null> {
  if (!z.uuid().safeParse(matchId).success) return null;

  const league = await getLeague(`/rodadas/${matchId}`);
  const match = league.matches.find((candidate) => candidate.id === matchId);
  if (!match) return null;

  const supabase = await createClient();
  const { data: attendance, error } = await supabase
    .from("match_attendance")
    .select("member_id, team, reserve")
    .eq("match_id", matchId);
  if (error) throw error;

  const playerById = new Map(league.players.map((player) => [player.id, player]));
  const scoreByPlayer = new Map(
    league.players.map((player) => [
      player.id,
      getMatchPerformances(player.id, league.matches, league.evaluations).find((performance) => performance.match.id === matchId)
        ?.score ?? null,
    ]),
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
    hasSubmitted: match.status === "open" && isPresent && !isPending,
    ratableCount: onBoard.filter((entry) => !entry.isSelf).length,
  };
}
