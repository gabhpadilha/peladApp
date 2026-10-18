"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId, setActiveGroup } from "@/lib/session";
import { getDatabaseErrorMessage } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import {
  createGroupSchema,
  type CreateGroupInput,
  type FieldErrors,
} from "@/types/member-schema";

export type CreateGroupResult = {
  success: false;
  message: string;
  errors?: FieldErrors<CreateGroupInput>;
};

/** Cria a pelada com quem criou como organizador e abre a página da pelada. */
export async function createGroup(input: CreateGroupInput): Promise<CreateGroupResult> {
  const userId = await requireUserId("/bem-vindo");

  const validation = createGroupSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }
  const { fullName, nickname, position, groupName, password } = validation.data;

  const supabase = await createClient();

  // Contas antigas (do link por e-mail) não têm senha: define agora, uma vez.
  const passwordUpdate = await supabase.auth.updateUser({ password });
  if (passwordUpdate.error && passwordUpdate.error.code !== "same_password") {
    return {
      success: false,
      message:
        passwordUpdate.error.code === "weak_password"
          ? "Senha fraca. Use uma senha mais longa."
          : "Não foi possível salvar sua senha.",
      errors: { password: ["Não foi possível salvar essa senha."] },
    };
  }

  const profileUpdate = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);
  if (profileUpdate.error) {
    return {
      success: false,
      message: getDatabaseErrorMessage(profileUpdate.error, "Não foi possível salvar seu nome."),
    };
  }

  const { data: groupId, error } = await supabase.rpc("create_group", {
    group_name: groupName,
    member_nickname: nickname,
    member_position: position,
  });
  if (error || !groupId) {
    return {
      success: false,
      message: error
        ? getDatabaseErrorMessage(error, "Não foi possível criar a pelada.")
        : "Não foi possível criar a pelada.",
    };
  }

  await setActiveGroup(groupId);
  redirect("/pelada");
}
