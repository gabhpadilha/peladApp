"use server";

import { revalidatePath } from "next/cache";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Marca o aviso do bônus de boas-vindas como visto (só a própria linha, pelo RLS). */
export async function dismissWelcomeBonus(): Promise<void> {
  const membership = await requireActiveMembership("/");
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .update({ welcome_bonus_seen_at: new Date().toISOString() })
    .eq("id", membership.memberId)
    .is("welcome_bonus_seen_at", null);
  if (error) console.error("dismissWelcomeBonus: falhou", error);
  revalidatePath("/");
}
