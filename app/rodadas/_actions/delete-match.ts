"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type DeleteMatchResult = { success: true } | { success: false; message: string };

/**
 * Exclui uma rodada ABERTA criada errada: presenças, notas e votos dela saem junto
 * (cascata no banco). Rodada fechada é definitiva (decisão do dono do app em 2026-11-06):
 * só o admin da plataforma exclui, pelo painel. A policy do banco também exige rodada aberta.
 */
export async function deleteMatch(matchId: string): Promise<DeleteMatchResult> {
  const membership = await requireActiveMembership("/rodadas");
  if (membership.role !== "organizer") {
    return { success: false, message: "Só quem organiza a pelada pode excluir a rodada. Chame o organizador." };
  }
  const parsedMatchId = z.uuid().safeParse(matchId);
  if (!parsedMatchId.success) {
    return { success: false, message: "Não achei essa rodada. Recarregue a página e tente de novo." };
  }

  const supabase = await createClient();
  // A policy de RLS também exige organizador; o `select` confirma que algo foi apagado.
  const { data, error } = await supabase
    .from("matches")
    .delete()
    .eq("id", parsedMatchId.data)
    .eq("group_id", membership.groupId)
    .eq("status", "open")
    .select("id");
  if (error) {
    return { success: false, message: "Não foi possível excluir a rodada. Tente de novo." };
  }
  if (!data || data.length === 0) {
    return {
      success: false,
      message: "Rodada fechada não pode ser excluída. Se ficou errada, fale com o administrador da plataforma.",
    };
  }

  // Home, ranking, perfis e coleções dependem das notas e cartas dessa rodada.
  revalidatePath("/", "layout");
  return { success: true };
}
