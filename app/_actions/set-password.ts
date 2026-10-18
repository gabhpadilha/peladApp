"use server";

import { z } from "zod";
import { MUST_CHANGE_PASSWORD_FLAG, requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema, type FieldErrors, type SetPasswordInput } from "@/types/member-schema";

export type SetPasswordResult =
  | { success: true }
  | { success: false; message: string; errors?: FieldErrors<SetPasswordInput> };

type SetPasswordOptions = {
  /**
   * Encerra a sessão depois de salvar. Usado na troca obrigatória do 1º acesso:
   * o token antigo ainda carrega a marca de senha provisória, e entrar de novo
   * com a senha nova emite um token limpo (evita voltar para /trocar-senha).
   */
  signOutAfter?: boolean;
};

/** Define ou troca a senha de quem está logado e tira a marca de senha provisória. */
export async function setPassword(
  input: SetPasswordInput,
  { signOutAfter = false }: SetPasswordOptions = {},
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

  if (signOutAfter) {
    await supabase.auth.signOut({ scope: "local" });
  } else {
    // Renova o token para a marca de senha provisória sair das claims.
    await supabase.auth.refreshSession();
  }

  return { success: true };
}
