import { z } from "zod";
import { getLeague } from "@/lib/league";
import { createClient } from "@/lib/supabase/server";
import type { Player } from "@/types/player";

export type RatingTarget = {
  player: Player;
  /** Time em que jogou na rodada (1, 2, 3…), se registrado. */
  team: number | null;
};

type RoundInfo = { id: string; round: number; date: string };

export type RatingSession =
  | { status: "not-found" }
  | { status: "closed"; match: RoundInfo }
  | { status: "not-present"; match: RoundInfo }
  | { status: "submitted"; match: RoundInfo }
  | { status: "open"; match: RoundInfo; targets: RatingTarget[] };

/**
 * O que o jogador logado pode fazer na tela de notas de uma rodada:
 * avaliar os outros presentes, ou o motivo de não poder.
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
  // Rodada aberta, presente e fora das pendências = já enviou as notas.
  if (!league.pending.some((pending) => pending.match.id === matchId)) {
    return { status: "submitted", match: info };
  }

  const supabase = await createClient();
  const { data: attendance, error } = await supabase
    .from("match_attendance")
    .select("member_id, team")
    .eq("match_id", matchId);
  if (error) throw error;
  const teamByMember = new Map(attendance.map((row) => [row.member_id, row.team]));

  const targets = league.players
    .filter(
      (player) => player.id !== league.currentMemberId && match.presentPlayerIds.includes(player.id),
    )
    .map((player) => ({ player, team: teamByMember.get(player.id) ?? null }))
    // Time a time, para avaliar na ordem em que a pessoa lembra do jogo.
    .toSorted(
      (a, b) =>
        (a.team ?? Number.MAX_SAFE_INTEGER) - (b.team ?? Number.MAX_SAFE_INTEGER) ||
        a.player.nickname.localeCompare(b.player.nickname, "pt-BR"),
    );

  return { status: "open", match: info, targets };
}
