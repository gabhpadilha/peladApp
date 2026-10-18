"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { FieldErrors } from "@/types/member-schema";
import { signInSchema, type SignInInput } from "../_schemas/sign-in-schema";

export type SignInResult = {
  success: false;
  message: string;
  errors?: FieldErrors<SignInInput>;
};

/** Login com e-mail e senha; em caso de sucesso redireciona para `next`. */
export async function signIn(input: SignInInput, next?: string): Promise<SignInResult> {
  const validation = signInSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }

  if (!hasSupabaseEnv()) {
    return { success: false, message: "Supabase ainda não configurado (.env.local)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validation.data);

  if (error) {
    return {
      success: false,
      message:
        error.status === 429
          ? "Muitas tentativas. Espere um minuto e tente de novo."
          : "E-mail ou senha incorretos.",
    };
  }

  redirect(getSafeRedirectPath(next));
}
