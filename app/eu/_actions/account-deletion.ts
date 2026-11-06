"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type AccountDeletionResult = { success: true } | { success: false; message: string };

const GENERIC = "Não deu certo agora. Confira a conexão e tente de novo.";

/** O jogador pede a exclusão da própria conta. Quem opera o app analisa no painel (não apaga na hora). */
export async function requestAccountDeletion(): Promise<AccountDeletionResult> {
  await requireUserId("/eu");
  const { error } = await (await createClient()).rpc("request_account_deletion");
  if (error) {
    console.error("requestAccountDeletion", error);
    return { success: false, message: GENERIC };
  }
  revalidatePath("/eu");
  return { success: true };
}

/** O jogador desiste do pedido. */
export async function cancelAccountDeletion(): Promise<AccountDeletionResult> {
  await requireUserId("/eu");
  const { error } = await (await createClient()).rpc("cancel_account_deletion");
  if (error) {
    console.error("cancelAccountDeletion", error);
    return { success: false, message: GENERIC };
  }
  revalidatePath("/eu");
  return { success: true };
}
