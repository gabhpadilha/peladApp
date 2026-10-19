"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/username";
import type { FieldErrors } from "@/types/member-schema";
import { signInSchema, type SignInInput } from "../_schemas/sign-in-schema";

export type SignInResult = {
  success: false;
  message: string;
  errors?: FieldErrors<SignInInput>;
};

/**
 * Login com usuário (ou e-mail, nas contas antigas) e senha; em caso de
 * sucesso redireciona para `next`. Usuário vira o e-mail técnico do Auth.
 */
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

  const { login, password } = validation.data;
  const email = login.includes("@") ? login : usernameToEmail(login);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Jogador desativado pelo organizador: a conta fica bloqueada no Auth.
    if (error.code === "user_banned") {
      return { success: false, message: "Sua conta foi desativada. Fale com o organizador da pelada." };
    }
    return {
      success: false,
      message:
        error.status === 429
          ? "Muitas tentativas. Espere um minuto e tente de novo."
          : "Usuário ou senha incorretos.",
    };
  }

  redirect(getSafeRedirectPath(next));
}
