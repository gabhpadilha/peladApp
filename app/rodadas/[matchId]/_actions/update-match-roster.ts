"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MATCH_TEAMS } from "@/lib/draft";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const updateRosterSchema = z.object({
  matchId: z.uuid(),
  players: z
    .array(z.object({ memberId: z.uuid(), team: z.number().int().min(1).max(MATCH_TEAMS), reserve: z.boolean() }))
    .min(2, "Escolha pelo menos 2 jogadores.")
    .max(40),
});

export type UpdateMatchRosterInput = z.infer<typeof updateRosterSchema>;
export type UpdateMatchRosterResult = { success: true } | { success: false; message: string };

/** Erro de `update_match_roster`: lista travada (notas abertas, alguém com nota ou rodada fechada). */
const ROSTER_LOCKED = "PA012";

/**
 * Organizador corrige quem jogou e os times de uma rodada aberta, antes de as notas abrirem. O banco confere tudo de
 * novo (`update_match_roster`): quem já tem nota não sai, e quem sai leva os gols que informou.
 */
export async function updateMatchRoster(input: UpdateMatchRosterInput): Promise<UpdateMatchRosterResult> {
  const membership = await requireActiveMembership(`/rodadas/${input.matchId}`);
  if (membership.role !== "organizer") {
    return { success: false, message: "Só quem organiza a pelada muda a lista. Chame o organizador." };
  }
  const validation = updateRosterSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, message: z.flattenError(validation.error).fieldErrors.players?.[0] ?? "Confira a lista e tente de novo." };
  }
  const { matchId, players } = validation.data;

  const { error } = await (await createClient()).rpc("update_match_roster", {
    target_match: matchId,
    present_member_ids: players.map((player) => player.memberId),
    team_numbers: players.map((player) => player.team),
    reserve_flags: players.map((player) => player.reserve),
  });
  if (error) {
    if (error.code === ROSTER_LOCKED) {
      return {
        success: false,
        message: "A lista já está travada: as notas abriram, a rodada fechou ou alguém que você tirou já tem nota.",
      };
    }
    console.error("updateMatchRoster", error);
    return { success: false, message: "Não deu para salvar a lista. Confira se há pelo menos 2 titulares e tente de novo." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
