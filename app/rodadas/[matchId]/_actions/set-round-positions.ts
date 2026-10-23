"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const setRoundPositionsSchema = z.object({
  matchId: z.uuid(),
  changes: z
    .array(z.object({ memberId: z.uuid(), inGoal: z.boolean() }))
    .min(1, "Nada mudou.")
    .max(40),
});

export type SetRoundPositionsInput = z.infer<typeof setRoundPositionsSchema>;

export type SetRoundPositionsResult =
  | { success: true; removedRatings: number }
  | { success: false; message: string };

/**
 * Marca quem jogou no gol (ou na linha) nesta rodada, fora da posição do
 * cadastro. Só organizador e rodada aberta (o banco confere de novo em
 * `set_round_position`, que também apaga as notas já dadas no tipo errado).
 */
export async function setRoundPositions(input: SetRoundPositionsInput): Promise<SetRoundPositionsResult> {
  const membership = await requireActiveMembership(`/rodadas/${input.matchId}`);
  if (membership.role !== "organizer") {
    return { success: false, message: "Só o organizador muda as posições da rodada." };
  }

  const validation = setRoundPositionsSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, message: "Posições inválidas. Confira e tente de novo." };
  }
  const { matchId, changes } = validation.data;

  const supabase = await createClient();
  let removedRatings = 0;
  for (const change of changes) {
    const { data, error } = await supabase.rpc("set_round_position", {
      target_match: matchId,
      target_member: change.memberId,
      in_goal: change.inGoal,
    });
    if (error) {
      revalidatePath("/", "layout");
      return { success: false, message: "Não foi possível salvar as posições. A rodada ainda está aberta?" };
    }
    removedRatings += data ?? 0;
  }

  revalidatePath("/", "layout");
  return { success: true, removedRatings };
}
