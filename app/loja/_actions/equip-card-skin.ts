"use server";

import { revalidatePath } from "next/cache";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { getCardSkin, isCardSkinKey } from "@/types/card-skin";
import type { ShopActionResult } from "./buy-card-skin";

/** Troca a carta em uso (`null` = carta padrão). Só vale para carta já comprada. */
export async function equipCardSkin(skin: string | null): Promise<ShopActionResult> {
  const membership = await requireActiveMembership("/loja");
  if (skin !== null && !isCardSkinKey(skin)) {
    return { success: false, message: "Não achei essa carta. Recarregue a Loja e tente de novo." };
  }
  if (!hasAdminEnv()) {
    console.error("Falta a SUPABASE_SECRET_KEY no .env.local (cliente admin indisponível).");
    return { success: false, message: "Algo falhou do nosso lado, não foi você. Tente de novo em instantes." };
  }

  const admin = createAdminClient();
  if (skin !== null) {
    const { data: purchase, error } = await admin
      .from("card_skin_purchases")
      .select("id")
      .eq("member_id", membership.memberId)
      .eq("skin", skin)
      .is("transferred_at", null)
      .maybeSingle();
    if (error) {
      console.error("equipCardSkin: leitura da compra falhou", error);
      return { success: false, message: "Não foi possível trocar a carta. Tente de novo." };
    }
    if (!purchase) {
      return { success: false, message: "Compre a carta antes de usar." };
    }
    // Skin anunciada no Mercado (e ainda no prazo) não vai para a carta: senão a venda tiraria a carta do jogador.
    const { count, error: listingError } = await admin
      .from("market_listings")
      .select("id", { count: "exact", head: true })
      .eq("purchase_id", purchase.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());
    if (listingError) {
      console.error("equipCardSkin: leitura do anúncio falhou", listingError);
      return { success: false, message: "Não foi possível trocar a carta. Tente de novo." };
    }
    if ((count ?? 0) > 0) {
      return { success: false, message: "Essa skin está anunciada no Mercado. Cancele o anúncio para usar." };
    }
  }

  // A trava do banco só deixa a chave secreta mudar a carta em uso.
  const { error } = await admin.from("group_members").update({ card_skin: skin }).eq("id", membership.memberId);
  if (error) {
    console.error("equipCardSkin: troca recusada", error);
    return { success: false, message: "Não foi possível trocar a carta. Tente de novo." };
  }

  revalidatePath("/", "layout");
  return { success: true, message: skin === null ? "Voltou para a carta padrão." : `Agora a sua carta é a ${getCardSkin(skin).name}.` };
}
