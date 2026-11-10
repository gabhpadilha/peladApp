"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getLeague } from "@/lib/league";
import { MARKET_ERROR_MESSAGES, MARKET_LISTING_HOURS, getMarketPriceRange, getQuickSellCoins } from "@/lib/market";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { getCardSkin, isCardSkinKey } from "@/types/card-skin";

export type MarketActionResult = { success: true; message: string } | { success: false; message: string };

const FALLBACK = "Não foi possível agora. Confira a conexão e tente de novo.";
const UNAVAILABLE = "Algo falhou do nosso lado, não foi você. Tente de novo em instantes.";

/** Recusa do banco (códigos PA0xx) em texto para o usuário; o resto vai para o log. */
function friendly(error: { code?: string; message?: string }, where: string): string {
  const known = error.code ? MARKET_ERROR_MESSAGES[error.code] : undefined;
  if (!known) console.error(`${where}: recusado`, error);
  return known ?? FALLBACK;
}

const listSchema = z.object({ skin: z.string().min(1).max(40), price: z.number().int().positive() });

/** Anuncia uma skin em posse no Mercado por 24 h. A faixa de preço é conferida aqui; posse, uso e limite, no banco. */
export async function listSkin(input: { skin: string; price: number }): Promise<MarketActionResult> {
  const membership = await requireActiveMembership("/eu");
  const parsed = listSchema.safeParse(input);
  if (!parsed.success || !isCardSkinKey(parsed.data.skin)) return { success: false, message: "Não achei essa carta. Recarregue a página." };
  const { skin, price } = parsed.data;
  const range = getMarketPriceRange(skin);
  if (!range) return { success: false, message: MARKET_ERROR_MESSAGES.PA022 };
  if (price < range.min || price > range.max) {
    return { success: false, message: `O preço precisa ficar entre ${range.min} e ${range.max} CC.` };
  }
  if (!hasAdminEnv()) {
    console.error("Falta a SUPABASE_SECRET_KEY (cliente admin indisponível).");
    return { success: false, message: UNAVAILABLE };
  }

  const admin = createAdminClient();
  const { data: purchase, error: readError } = await admin
    .from("card_skin_purchases")
    .select("id")
    .eq("member_id", membership.memberId)
    .eq("skin", skin)
    .is("transferred_at", null)
    // A cópia extra (repetida) é a primeira a ser vendida.
    .order("is_spare", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) {
    console.error("listSkin: leitura da posse falhou", readError);
    return { success: false, message: FALLBACK };
  }
  if (!purchase) return { success: false, message: MARKET_ERROR_MESSAGES.PA021 };

  const { error } = await admin.rpc("market_list", {
    seller: membership.memberId,
    target_purchase: purchase.id,
    ask_price: price,
    hours: MARKET_LISTING_HOURS,
  });
  if (error) return { success: false, message: friendly(error, "listSkin") };

  revalidatePath("/", "layout");
  return { success: true, message: `A ${getCardSkin(skin).name} está no Mercado por ${price} CC.` };
}

const quickSellSchema = z.object({ skin: z.string().min(1).max(40) });

/** Venda rápida: a skin sai da coleção na hora e a casa paga o valor fixo da raridade (entra no saldo). */
export async function quickSellSkin(input: { skin: string }): Promise<MarketActionResult> {
  const membership = await requireActiveMembership("/eu");
  const parsed = quickSellSchema.safeParse(input);
  if (!parsed.success || !isCardSkinKey(parsed.data.skin)) return { success: false, message: "Não achei essa carta. Recarregue a página." };
  const { skin } = parsed.data;
  const coins = getQuickSellCoins(skin);
  if (coins === null) return { success: false, message: MARKET_ERROR_MESSAGES.PA022 };
  if (!hasAdminEnv()) {
    console.error("Falta a SUPABASE_SECRET_KEY (cliente admin indisponível).");
    return { success: false, message: UNAVAILABLE };
  }

  const admin = createAdminClient();
  const { data: purchase, error: readError } = await admin
    .from("card_skin_purchases")
    .select("id")
    .eq("member_id", membership.memberId)
    .eq("skin", skin)
    .is("transferred_at", null)
    // A cópia extra (repetida) é a primeira a ser vendida.
    .order("is_spare", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) {
    console.error("quickSellSkin: leitura da posse falhou", readError);
    return { success: false, message: FALLBACK };
  }
  if (!purchase) return { success: false, message: MARKET_ERROR_MESSAGES.PA021 };

  const { error } = await admin.rpc("quick_sell_skin", { seller: membership.memberId, target_purchase: purchase.id, sale_coins: coins });
  if (error) return { success: false, message: friendly(error, "quickSellSkin") };

  revalidatePath("/", "layout");
  return { success: true, message: `A ${getCardSkin(skin).name} foi vendida por ${coins} CC.` };
}

const cancelSchema = z.object({ listingId: z.uuid() });

/** Cancela um anúncio ativo do próprio jogador (a skin volta a ficar livre na hora). */
export async function cancelListing(input: { listingId: string }): Promise<MarketActionResult> {
  const membership = await requireActiveMembership("/eu");
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: MARKET_ERROR_MESSAGES.PA027 };
  if (!hasAdminEnv()) {
    console.error("Falta a SUPABASE_SECRET_KEY (cliente admin indisponível).");
    return { success: false, message: UNAVAILABLE };
  }
  const { error } = await createAdminClient().rpc("market_cancel", {
    seller: membership.memberId,
    target_listing: parsed.data.listingId,
  });
  if (error) return { success: false, message: friendly(error, "cancelListing") };

  revalidatePath("/", "layout");
  return { success: true, message: "Anúncio cancelado. A carta voltou para você." };
}

const buySchema = z.object({ listingId: z.uuid() });

/**
 * Compra um anúncio do Mercado na hora. O servidor calcula as moedas ganhas (rodadas, pacotes e vendas) e o banco,
 * com a conta e o anúncio travados, desconta o que já foi gasto e troca skin e moedas na mesma transação.
 */
export async function buyListing(input: { listingId: string }): Promise<MarketActionResult> {
  const membership = await requireActiveMembership("/loja/mercado");
  const parsed = buySchema.safeParse(input);
  if (!parsed.success) return { success: false, message: MARKET_ERROR_MESSAGES.PA028 };
  if (!hasAdminEnv()) {
    console.error("Falta a SUPABASE_SECRET_KEY (cliente admin indisponível).");
    return { success: false, message: UNAVAILABLE };
  }
  const league = await getLeague("/loja/mercado");
  const earned = league.getProgression(membership.memberId).coinsEarned;
  const { data: skin, error } = await createAdminClient().rpc("market_buy", {
    buyer: membership.memberId,
    target_listing: parsed.data.listingId,
    earned,
  });
  if (error) return { success: false, message: friendly(error, "buyListing") };

  revalidatePath("/", "layout");
  const name = isCardSkinKey(skin) ? getCardSkin(skin).name : "skin";
  return { success: true, message: `A ${name} é sua! Ela já está em Eu → Minhas cartas.` };
}
