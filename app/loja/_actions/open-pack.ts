"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isPackRarity, type OpenedPack } from "@/lib/packs";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type OpenPackResult =
  | { success: true; pack: OpenedPack }
  | { success: false; message: string };

const packIdSchema = z.uuid();

/** Abre um pacote guardado: o banco revela a skin sorteada no fechamento e concede (ou paga a repetida em moedas). */
export async function openPack(packId: string): Promise<OpenPackResult> {
  await requireActiveMembership("/loja");
  if (!packIdSchema.safeParse(packId).success) {
    return { success: false, message: "Não achei esse pacote. Recarregue a Loja e tente de novo." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_pack", { target_pack: packId });
  const row = data?.[0];
  if (error || !row || !isPackRarity(row.rarity)) {
    console.error("openPack: abertura falhou", error);
    return { success: false, message: "Não foi possível abrir o pacote. Confira a conexão e tente de novo." };
  }
  revalidatePath("/", "layout");
  return {
    success: true,
    pack: { skin: row.skin, rarity: row.rarity, wasDuplicate: row.was_duplicate, coinsAwarded: row.coins_awarded },
  };
}
