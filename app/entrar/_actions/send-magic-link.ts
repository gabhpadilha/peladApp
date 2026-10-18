"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, type SignInInput } from "../_schemas/sign-in-schema";

export type SendMagicLinkResult =
  | { success: true; email: string }
  | { success: false; message: string; errors?: Partial<Record<keyof SignInInput, string[]>> };

/** Envia o link mágico de login. Cria a conta no primeiro acesso. */
export async function sendMagicLink(
  input: SignInInput,
  next?: string,
): Promise<SendMagicLinkResult> {
  const validation = signInSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira o e-mail digitado.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Supabase ainda não configurado (.env.local)." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "";
  const confirmUrl = new URL("/auth/confirm", siteUrl);
  confirmUrl.searchParams.set("next", getSafeRedirectPath(next));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: validation.data.email,
    options: { emailRedirectTo: confirmUrl.toString(), shouldCreateUser: true },
  });

  if (error) {
    return {
      success: false,
      message:
        error.status === 429
          ? "Muitas tentativas. Espere um minuto e tente de novo."
          : "Não foi possível enviar o link. Tente de novo.",
    };
  }

  return { success: true, email: validation.data.email };
}
