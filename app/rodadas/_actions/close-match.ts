"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getThemeForDate } from "@/lib/card-themes";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type CloseMatchResult =
  | { success: true; awardCount: number }
  | { success: false; message: string };

/**
 * Fecha a rodada: as notas passam a contar no OVR, ninguém mais envia, e as
 * cartas especiais saem das notas e do voto no Gol (com o tema sazonal da data do jogo).
 */
export async function closeMatch(matchId: string): Promise<CloseMatchResult> {
  const membership = await requireActiveMembership("/rodadas");
  if (membership.role !== "organizer") {
    return { success: false, message: "Só o organizador fecha rodadas." };
  }

  const parsedMatchId = z.uuid().safeParse(matchId);
  if (!parsedMatchId.success) {
    return { success: false, message: "Rodada inválida." };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("played_on, status")
    .eq("id", parsedMatchId.data)
    .eq("group_id", membership.groupId)
    .maybeSingle();
  if (!match || match.status !== "open") {
    return { success: false, message: "Essa rodada não está aberta." };
  }

  // Fecha e distribui as cartas na mesma transação (função no banco).
  const { data: awardCount, error } = await supabase.rpc("close_match", {
    target_match: parsedMatchId.data,
    theme_key: getThemeForDate(match.played_on),
  });
  if (error) {
    return { success: false, message: "Não foi possível fechar a rodada." };
  }

  revalidatePath("/", "layout");
  return { success: true, awardCount: awardCount ?? 0 };
}
