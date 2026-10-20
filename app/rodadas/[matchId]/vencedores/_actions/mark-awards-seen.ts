"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type MarkAwardsSeenResult = { success: true } | { success: false; message: string };

/**
 * Marca que o jogador logado abriu o pacote da rodada: o aviso "Confira os
 * vencedores" some da home dele. O banco só aceita a própria linha, em rodada fechada.
 */
export async function markAwardsSeen(matchId: string): Promise<MarkAwardsSeenResult> {
  const membership = await requireActiveMembership(`/rodadas/${matchId}/vencedores`);

  const parsedMatchId = z.uuid().safeParse(matchId);
  if (!parsedMatchId.success) {
    return { success: false, message: "Rodada inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("award_reveals")
    .upsert(
      { match_id: parsedMatchId.data, member_id: membership.memberId },
      { onConflict: "match_id,member_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("markAwardsSeen", error);
    return { success: false, message: "Não foi possível registrar." };
  }

  revalidatePath("/");
  return { success: true };
}
