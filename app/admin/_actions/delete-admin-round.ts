"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAdminRoundResult = { success: true } | { success: false; message: string };

/**
 * Admin da plataforma exclui uma rodada, aberta ou fechada (o organizador só exclui aberta).
 * Notas, votos, cartas e conquistas dela saem junto e o OVR, XP e moedas de todos são recalculados.
 */
export async function deleteAdminRound(matchId: string): Promise<DeleteAdminRoundResult> {
  if (!(await getPlatformAdminId())) return { success: false, message: "Você não tem permissão para isso." };
  if (!z.uuid().safeParse(matchId).success) return { success: false, message: "Rodada não encontrada." };

  const { data, error } = await createAdminClient().from("matches").delete().eq("id", matchId).select("id");
  if (error) {
    console.error("deleteAdminRound", error);
    return { success: false, message: "Algo falhou do nosso lado. Tente de novo em instantes." };
  }
  if (!data || data.length === 0) return { success: false, message: "Rodada não encontrada." };

  revalidatePath("/", "layout");
  return { success: true };
}
