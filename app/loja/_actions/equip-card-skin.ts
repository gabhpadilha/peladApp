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
    return { success: false, message: "Carta inválida." };
  }
  if (!hasAdminEnv()) {
    return { success: false, message: "Falta a SUPABASE_SECRET_KEY no .env.local." };
  }

  const admin = createAdminClient();
  if (skin !== null) {
    const { data: purchase, error } = await admin
      .from("card_skin_purchases")
      .select("id")
      .eq("member_id", membership.memberId)
      .eq("skin", skin)
      .maybeSingle();
    if (error) {
      console.error("equipCardSkin: leitura da compra falhou", error);
      return { success: false, message: "Não foi possível trocar a carta. Tente de novo." };
    }
    if (!purchase) {
      return { success: false, message: "Compre a carta antes de usar." };
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
