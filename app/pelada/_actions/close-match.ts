"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type CloseMatchResult = { success: true } | { success: false; message: string };

/** Fecha a rodada: as notas dela passam a contar no OVR e não aceita mais envios. */
export async function closeMatch(matchId: string): Promise<CloseMatchResult> {
  const membership = await requireActiveMembership("/pelada");
  if (membership.role !== "organizer") {
    return { success: false, message: "Só o organizador fecha rodadas." };
  }

  const parsedMatchId = z.uuid().safeParse(matchId);
  if (!parsedMatchId.success) {
    return { success: false, message: "Rodada inválida." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", parsedMatchId.data)
    .eq("group_id", membership.groupId)
    .eq("status", "open")
    .select("id");

  if (error || !data || data.length === 0) {
    return { success: false, message: "Não foi possível fechar a rodada." };
  }

  revalidatePath("/pelada");
  revalidatePath("/");
  return { success: true };
}
