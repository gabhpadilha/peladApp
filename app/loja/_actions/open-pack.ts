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

/** Abre um pacote guardado: o banco revela a skin sorteada no fechamento e concede (repetida vira cópia extra). Pacote de várias skins devolve todas. */
export async function openPack(packId: string): Promise<OpenPackResult> {
  await requireActiveMembership("/loja");
  if (!packIdSchema.safeParse(packId).success) {
    return { success: false, message: "Não achei esse pacote. Recarregue a Loja e tente de novo." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_pack", { target_pack: packId });
  // Pacote de várias skins (prêmio do mês): uma linha por skin, da mais rara para a mais comum; a 1ª é a da animação.
  const rows = (data ?? []).filter((item) => isPackRarity(item.rarity));
  const row = rows[0];
  if (error || !row || !isPackRarity(row.rarity)) {
    console.error("openPack: abertura falhou", error);
    return { success: false, message: "Não foi possível abrir o pacote. Confira a conexão e tente de novo." };
  }
  // Sem `revalidatePath` aqui, de propósito: a resposta da action já traria a página inteira refeita (lenta, e podia remontar a tela
  // no meio da animação). A página só é atualizada ao fechar a abertura (`refreshAfterPack`).
  return {
    success: true,
    pack: {
      skin: row.skin,
      rarity: row.rarity,
      wasDuplicate: row.was_duplicate,
      coinsAwarded: row.coins_awarded,
      items: rows.length > 1
        ? rows.flatMap((item) => (isPackRarity(item.rarity) ? [{ skin: item.skin, rarity: item.rarity, wasDuplicate: item.was_duplicate }] : []))
        : null,
    },
  };
}

/** Chamada ao fechar a abertura do pacote: atualiza saldo, coleção e o ponto da Loja de uma vez. */
export async function refreshAfterPack(): Promise<void> {
  await requireActiveMembership("/loja");
  revalidatePath("/", "layout");
}
