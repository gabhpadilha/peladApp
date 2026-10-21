"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLeague } from "@/lib/league";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { getActiveSale, getSalePrice } from "@/lib/shop-sale";
import { getCardSkin, isCardSkinKey, isCardSkinOnSale } from "@/types/card-skin";

/** "Hoje" no fuso da pelada, `AAAA-MM-DD` (o servidor roda em UTC). */
const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export type ShopActionResult = { success: true; message: string } | { success: false; message: string };

const inputSchema = z.object({
  skin: z.string().refine(isCardSkinKey, "Carta inválida."),
  equip: z.boolean(),
});

/**
 * Compra uma carta da Loja com PeladaCoins. O servidor recalcula o nível e o
 * saldo (nada vem do aparelho) e só então grava a compra pela chave secreta.
 */
export async function buyCardSkin(input: { skin: string; equip: boolean }): Promise<ShopActionResult> {
  const membership = await requireActiveMembership("/loja");
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !isCardSkinKey(parsed.data.skin)) {
    return { success: false, message: "Carta inválida." };
  }
  if (!hasAdminEnv()) {
    return { success: false, message: "Falta a SUPABASE_SECRET_KEY no .env.local." };
  }

  const skin = getCardSkin(parsed.data.skin);
  const today = todayFormatter.format(new Date());
  if (!isCardSkinOnSale(skin, today)) {
    return { success: false, message: `A ${skin.name} saiu da Loja com o fim do evento.` };
  }
  const league = await getLeague("/loja");
  const progression = league.getProgression(membership.memberId);
  if (progression.level < skin.level) {
    return { success: false, message: `A ${skin.name} libera no nível ${skin.level}.` };
  }

  const admin = createAdminClient();
  const { data: purchases, error: purchasesError } = await admin
    .from("card_skin_purchases")
    .select("skin, price")
    .eq("member_id", membership.memberId);
  if (purchasesError) {
    console.error("buyCardSkin: leitura das compras falhou", purchasesError);
    return { success: false, message: "Não foi possível comprar agora. Tente de novo." };
  }
  if (purchases.some((purchase) => purchase.skin === skin.key)) {
    return { success: false, message: `Você já tem a ${skin.name}.` };
  }
  const balance = progression.coinsEarned - purchases.reduce((total, purchase) => total + purchase.price, 0);
  // Promoção (ex.: Black Friday) calculada aqui, nunca vinda do aparelho; a compra grava o preço pago.
  const price = getSalePrice(skin.price, getActiveSale(today));
  if (balance < price) {
    return { success: false, message: `Faltam ${price - balance} PeladaCoins para a ${skin.name}.` };
  }

  const { error: insertError } = await admin.from("card_skin_purchases").insert({
    group_id: membership.groupId,
    member_id: membership.memberId,
    skin: skin.key,
    price,
  });
  if (insertError) {
    console.error("buyCardSkin: compra recusada", insertError);
    return { success: false, message: "Não foi possível comprar agora. Tente de novo." };
  }

  if (parsed.data.equip) {
    const { error: equipError } = await admin
      .from("group_members")
      .update({ card_skin: skin.key })
      .eq("id", membership.memberId);
    if (equipError) {
      console.error("buyCardSkin: não deu para usar a carta", equipError);
      revalidatePath("/", "layout");
      return { success: true, message: `A ${skin.name} é sua! Toque em Usar para colocar na carta.` };
    }
  }

  revalidatePath("/", "layout");
  return { success: true, message: parsed.data.equip ? `A ${skin.name} já está na sua carta.` : `A ${skin.name} é sua!` };
}
