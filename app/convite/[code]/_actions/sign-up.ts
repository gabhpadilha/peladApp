"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { setActiveGroup } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema, type FieldErrors, type SignUpInput } from "@/types/member-schema";

export type SignUpResult = {
  success: false;
  message: string;
  errors?: FieldErrors<SignUpInput>;
  /** E-mail já cadastrado: a tela oferece "Entrar". */
  isExistingAccount?: boolean;
};

/**
 * Cadastro único pelo convite: cria a conta (e-mail e senha, sem confirmação),
 * salva o nome e já entra na pelada. Depois disso a pessoa fica logada.
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const validation = signUpSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }
  const { email, password, fullName, nickname, position, inviteCode } = validation.data;

  const supabase = await createClient();

  // Confere o convite antes de criar a conta, para não sobrar conta sem pelada.
  const { data: invite } = await supabase.rpc("get_invite", { code: inviteCode }).maybeSingle();
  if (!invite) {
    return { success: false, message: "Convite inválido. Peça um novo link ao organizador." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const isExistingAccount = error.code === "user_already_exists";
    return {
      success: false,
      isExistingAccount,
      message: isExistingAccount
        ? "Esse e-mail já tem conta. Entre com sua senha."
        : error.code === "weak_password"
          ? "Senha fraca. Use uma senha mais longa."
          : "Não foi possível criar sua conta. Tente de novo.",
    };
  }

  if (!data.session || !data.user) {
    // Acontece se a confirmação de e-mail estiver ligada no Supabase.
    return {
      success: false,
      message:
        "Conta criada, mas falta confirmar o e-mail. Avise o organizador (a confirmação de e-mail deve ficar desligada).",
    };
  }

  const profileUpdate = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", data.user.id);
  const joined = await supabase.rpc("join_group", {
    code: inviteCode,
    member_nickname: nickname,
    member_position: position,
  });
  if (profileUpdate.error || joined.error || !joined.data) {
    return {
      success: false,
      message: "Sua conta foi criada, mas não conseguimos te colocar na pelada. Abra o link de novo.",
    };
  }

  await setActiveGroup(joined.data);
  redirect("/");
}
