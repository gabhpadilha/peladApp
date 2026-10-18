"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { MUST_CHANGE_PASSWORD_FLAG, requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema, type FieldErrors, type SetPasswordInput } from "@/types/member-schema";

export type SetPasswordResult =
  | { success: true }
  | { success: false; message: string; errors?: FieldErrors<SetPasswordInput> };

/**
 * Define ou troca a senha de quem está logado e tira a marca de senha
 * provisória. Com `redirectTo`, redireciona depois de salvar.
 */
export async function setPassword(
  input: SetPasswordInput,
  redirectTo?: string,
): Promise<SetPasswordResult> {
  await requireUserId("/", { allowTempPassword: true });

  const validation = setPasswordSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
    data: { [MUST_CHANGE_PASSWORD_FLAG]: false },
  });

  if (error?.code === "same_password") {
    return { success: false, message: "Escolha uma senha diferente da atual." };
  }
  if (error) {
    return {
      success: false,
      message:
        error.code === "weak_password"
          ? "Senha fraca. Use uma senha mais longa."
          : "Não foi possível salvar a senha. Tente de novo.",
    };
  }

  // Renova o token para a marca de senha provisória sair das claims já agora.
  await supabase.auth.refreshSession();

  if (redirectTo) redirect(redirectTo);
  return { success: true };
}
