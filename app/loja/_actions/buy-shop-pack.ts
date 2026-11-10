"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLeague } from "@/lib/league";
import { PACK_SHOP_PRICES, isPackRarity, isPackTier, PACK_RARITY_ORDER, type MyPack } from "@/lib/packs";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { getActiveSale, getSalePrice } from "@/lib/shop-sale";

/** "Hoje" no fuso da pelada, `AAAA-MM-DD` (o servidor roda em UTC). */
const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/** O que o aparelho precisa para abrir o pacote comprado (a skin só é revelada ao abrir). */
export type BoughtPack = Pick<MyPack, "id" | "round" | "odds" | "tier" | "month">;
export type BuyShopPackResult = { success: true; pack: BoughtPack } | { success: false; message: string };

const inputSchema = z.object({ tier: z.string().refine(isPackTier) });

const ERROR_MESSAGES: Record<string, string> = {
  PA031: "Você não tem CanchaCoins suficientes para esse pacote.",
  PA042: "Os pacotes desse mês ainda não estão disponíveis. Volte em breve.",
  PA009: "A sua pelada está suspensa. Chame o Administrador.",
  PA020: "Sua conta está desativada.",
};

/**
 * Compra um pacote da Loja com CanchaCoins. O servidor calcula o preço (tabela e promoção) e o saldo; o banco confere o saldo de novo com
 * o comprador travado e sorteia a skin (sem proteção contra azar). O pacote volta lacrado: quem chama abre em seguida ou guarda.
 */
export async function buyShopPack(input: { tier: string }): Promise<BuyShopPackResult> {
  const membership = await requireActiveMembership("/loja");
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !isPackTier(parsed.data.tier)) {
    return { success: false, message: "Não achei esse pacote. Recarregue a Loja e tente de novo." };
  }
  if (!hasAdminEnv()) {
    console.error("Falta a SUPABASE_SECRET_KEY no .env.local (cliente admin indisponível).");
    return { success: false, message: "Algo falhou do nosso lado, não foi você. Tente de novo em instantes." };
  }
  const tier = parsed.data.tier;

  const league = await getLeague("/loja");
  const progression = league.getProgression(membership.memberId);
  const price = getSalePrice(PACK_SHOP_PRICES[tier], getActiveSale(todayFormatter.format(new Date())));

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("shop_buy_pack", {
    buyer: membership.memberId,
    target_tier: tier,
    target_price: price,
    // `coinsEarned` já vem sem o que foi gasto em pacotes da Loja; o banco soma de novo e desconta ele mesmo.
    earned_gross: progression.coinsEarned + league.shopPackSpend,
  });
  if (error || !data) {
    console.error("buyShopPack: compra recusada", error);
    return { success: false, message: (error?.code && ERROR_MESSAGES[error.code]) || "Não foi possível comprar agora. Tente de novo." };
  }

  const { data: row, error: readError } = await admin.from("packs").select("id, month, tier, odds").eq("id", data).single();
  if (readError || !isPackTier(row.tier)) {
    console.error("buyShopPack: não leu o pacote comprado", readError);
    revalidatePath("/loja");
    return { success: false, message: "Comprou! O pacote está em Meus pacotes, na Loja." };
  }
  const odds: BoughtPack["odds"] = {};
  const raw = row.odds && typeof row.odds === "object" && !Array.isArray(row.odds) ? row.odds : {};
  for (const rarity of PACK_RARITY_ORDER) {
    const value = raw[rarity];
    if (isPackRarity(rarity) && typeof value === "number") odds[rarity] = value;
  }
  // A página (saldo, Meus pacotes) é atualizada ao fechar a abertura; revalidar aqui refaria a tela antes da animação.
  return { success: true, pack: { id: row.id, round: null, month: row.month, tier: row.tier, odds } };
}
