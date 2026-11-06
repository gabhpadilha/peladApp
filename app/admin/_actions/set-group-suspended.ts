"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_ACTIVE_GROUPS } from "@/lib/platform";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type SetGroupSuspendedResult = { success: true } | { success: false; message: string };

/** Suspende (ninguém cria rodada nova; todos continuam vendo tudo) ou reativa uma pelada. Reativar respeita o limite de ativas. */
export async function setGroupSuspended(groupId: string, isSuspended: boolean): Promise<SetGroupSuspendedResult> {
  if (!(await getPlatformAdminId())) return { success: false, message: "Você não tem permissão para isso." };
  if (!z.uuid().safeParse(groupId).success) return { success: false, message: "Pelada não encontrada." };

  const admin = createAdminClient();
  if (!isSuspended) {
    const { count } = await admin.from("groups").select("id", { count: "exact", head: true }).is("suspended_at", null);
    if ((count ?? 0) >= MAX_ACTIVE_GROUPS) {
      return { success: false, message: `Já são ${MAX_ACTIVE_GROUPS} peladas ativas. Suspenda outra antes de reativar esta.` };
    }
  }

  const { error } = await admin
    .from("groups")
    .update({ suspended_at: isSuspended ? new Date().toISOString() : null })
    .eq("id", groupId);
  if (error) {
    console.error("setGroupSuspended", error);
    return { success: false, message: "Algo falhou do nosso lado. Tente de novo em instantes." };
  }

  revalidatePath("/admin");
  return { success: true };
}
