import { z } from "zod";
import { getLeague } from "@/lib/league";
import { getRoundGoalsState, type RoundGoalsState } from "@/lib/match-goals";
import { getRoundRole, isOffPosition, type PlayerRole } from "@/lib/round-position";
import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/types/player";

export type RatingTarget = {
  player: Player;
  /** Time da rodada: 1 = Branco, 2 = Preto. */
  team: number | null;
  /** Começou no banco do time. */
  isReserve: boolean;
  /** Papel na rodada (decide os atributos): pode não ser o do cadastro. */
  role: PlayerRole;
  /** Jogou fora da posição do cadastro ("Jogou no gol"). */
  isOffPosition: boolean;
};

type RoundInfo = { id: string; round: number; date: string };

export type RatingSession =
  | { status: "not-found" }
  | { status: "closed"; match: RoundInfo }
  | { status: "not-present"; match: RoundInfo }
  | { status: "submitted"; match: RoundInfo }
  | {
      status: "open";
      match: RoundInfo;
      targets: RatingTarget[];
      /** Etapa dos gols (vem antes das notas). */
      goals: RoundGoalsState;
      /** Quem está logado (para a tela de gols). */
      memberId: string;
      isOrganizer: boolean;
      /** Apelido de quem ainda não informou os gols (tela de espera). */
      missingNicknames: string[];
      /** Apelido de quem ainda não concluiu a conferência dos gols (tela de espera). */
      pendingCheckNicknames: string[];
      /** Apelidos por id de jogador (lista de conferência dos gols). */
      nicknames: Record<string, string>;
    };

/**
 * O que o jogador logado pode fazer na tela de notas de uma rodada: avaliar os
 * outros presentes que ainda faltam, ou o motivo de não poder.
 */
export async function getRatingSession(matchId: string): Promise<RatingSession> {
  if (!z.uuid().safeParse(matchId).success) return { status: "not-found" };

  const league = await getLeague(`/avaliar/${matchId}`);
  const match = league.matches.find((candidate) => candidate.id === matchId);
  if (!match) return { status: "not-found" };

  const info: RoundInfo = { id: match.id, round: match.round, date: match.date };
  if (match.status !== "open") return { status: "closed", match: info };
  if (!match.presentPlayerIds.includes(league.currentMemberId)) {
    return { status: "not-present", match: info };
  }
  // Rodada aberta, presente e fora das pendências = já deu nota para todos.
  if (!league.pending.some((pending) => pending.match.id === matchId)) {
    return { status: "submitted", match: info };
  }

  const supabase = await createClient();
  const [{ data: attendance, error }, goals] = await Promise.all([
    supabase.from("match_attendance").select("member_id, team, reserve, plays_in_goal").eq("match_id", matchId),
    getRoundGoalsState(league.membership.groupId, matchId, match.presentPlayerIds, league.currentMemberId),
  ]);
  if (error) throw error;
  const slotByMember = new Map(attendance.map((row) => [row.member_id, row]));

  const targets = league.players
    .filter(
      (player) =>
        player.id !== league.currentMemberId &&
        match.presentPlayerIds.includes(player.id) &&
        // Só quem ainda falta (a troca de posição pelo organizador devolve uma nota).
        !league.hasRated(matchId, player.id),
    )
    .map((player) => {
      const slot = slotByMember.get(player.id);
      const playsInGoal = slot?.plays_in_goal ?? null;
      return {
        player,
        team: slot?.team ?? null,
        isReserve: slot?.reserve ?? false,
        role: getRoundRole(player, playsInGoal),
        isOffPosition: isOffPosition(playsInGoal),
      };
    })
    // Time a time (titulares antes dos reservas), na ordem em que a pessoa lembra do jogo.
    .toSorted(
      (a, b) =>
        (a.team ?? Number.MAX_SAFE_INTEGER) - (b.team ?? Number.MAX_SAFE_INTEGER) ||
        Number(a.isReserve) - Number(b.isReserve) ||
        a.player.nickname.localeCompare(b.player.nickname, "pt-BR"),
    );

  const nicknameById = new Map(league.players.map((player) => [player.id, player.nickname]));
  return {
    status: "open",
    match: info,
    targets,
    goals,
    memberId: league.currentMemberId,
    isOrganizer: league.membership.role === "organizer",
    missingNicknames: goals.missingIds.flatMap((id) => (nicknameById.has(id) ? [nicknameById.get(id) as string] : [])),
    pendingCheckNicknames: goals.pendingCheckIds.flatMap((id) => (nicknameById.has(id) ? [nicknameById.get(id) as string] : [])),
    nicknames: Object.fromEntries(nicknameById),
  };
}
