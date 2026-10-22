"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema, type FieldErrors, type SetPasswordInput } from "@/types/member-schema";

export type SetPasswordResult =
  | { success: true }
  | { success: false; message: string; errors?: FieldErrors<SetPasswordInput> };

/** Troca a senha de quem está logado (opcional: a senha gerada pelo dono também vale). */
export async function setPassword(input: SetPasswordInput): Promise<SetPasswordResult> {
  await requireUserId("/eu");

  const validation = setPasswordSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: validation.data.password });

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

  return { success: true };
}
