"use server";

import { redirect } from "next/navigation";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/terms";

export type AcceptTermsResult = { success: false; message: string };

/** Grava o aceite da versão atual dos termos (função `accept_terms`, que só mexe no próprio perfil) e segue para onde a pessoa ia. */
export async function acceptTerms(next: string | null): Promise<AcceptTermsResult> {
  await requireUserId("/aceitar-termos");
  const { error } = await (await createClient()).rpc("accept_terms", { terms_version_accepted: TERMS_VERSION });
  if (error) {
    console.error("acceptTerms", error);
    return { success: false, message: "Não deu para registrar o aceite agora. Confira a conexão e tente de novo." };
  }
  redirect(getSafeRedirectPath(next));
}
