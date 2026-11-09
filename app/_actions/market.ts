"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MARKET_ERROR_MESSAGES, MARKET_LISTING_HOURS, getMarketPriceRange } from "@/lib/market";
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
