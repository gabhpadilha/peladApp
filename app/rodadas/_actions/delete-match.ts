"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type DeleteMatchResult = { success: true } | { success: false; message: string };

/**
 * Exclui uma rodada criada errada, aberta ou fechada: presenças, notas, votos
 * e cartas especiais dela saem junto (cascata no banco), e o OVR de todos é
 * recalculado sem essa rodada. Qualquer organizador da pelada pode.
 */
export async function deleteMatch(matchId: string): Promise<DeleteMatchResult> {
  const membership = await requireActiveMembership("/rodadas");
  if (membership.role !== "organizer") {
    return { success: false, message: "Só o organizador exclui rodadas." };
  }
  const parsedMatchId = z.uuid().safeParse(matchId);
  if (!parsedMatchId.success) {
    return { success: false, message: "Rodada inválida." };
  }

  const supabase = await createClient();
  // A policy de RLS também exige organizador; o `select` confirma que algo foi apagado.
  const { data, error } = await supabase
    .from("matches")
    .delete()
    .eq("id", parsedMatchId.data)
    .eq("group_id", membership.groupId)
    .select("id");
  if (error) {
    return { success: false, message: "Não foi possível excluir a rodada. Tente de novo." };
  }
  if (!data || data.length === 0) {
    return { success: false, message: "Rodada não encontrada." };
  }

  // Home, ranking, perfis e coleções dependem das notas e cartas dessa rodada.
  revalidatePath("/", "layout");
  return { success: true };
}
