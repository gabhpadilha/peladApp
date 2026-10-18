"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/temp-password";
import {
  createPlayerSchema,
  type CreatePlayerInput,
  type FieldErrors,
} from "@/types/member-schema";

export type CreatePlayerResult =
  | { success: true; email: string; nickname: string; tempPassword: string }
  | { success: false; message: string; errors?: FieldErrors<CreatePlayerInput> };

/**
 * Organizador cadastra um jogador: cria a conta já confirmada com senha
 * provisória (troca obrigatória no 1º acesso) e coloca na pelada.
 */
export async function createPlayer(input: CreatePlayerInput): Promise<CreatePlayerResult> {
  const membership = await requireActiveMembership("/pelada");
  if (membership.role !== "organizer") {
    return { success: false, message: "Só o organizador cadastra jogadores." };
  }

  const validation = createPlayerSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }
  if (!hasAdminEnv()) {
    return {
      success: false,
      message: "Falta a SUPABASE_SECRET_KEY no .env.local para cadastrar jogadores.",
    };
  }

  const { email, fullName, nickname, position } = validation.data;
  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });
  if (createError || !created.user) {
    return {
      success: false,
      message:
        createError?.code === "email_exists"
          ? "Esse e-mail já tem conta. Mande o link de cadastro para ele entrar na pelada."
          : "Não foi possível criar a conta.",
      errors: createError?.code === "email_exists" ? { email: ["E-mail já cadastrado."] } : undefined,
    };
  }

  const userId = created.user.id;
  // O perfil já foi criado pelo trigger on_auth_user_created.
  const profileUpdate = await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);
  const memberInsert = await admin
    .from("group_members")
    .insert({ group_id: membership.groupId, user_id: userId, nickname, position });

  if (profileUpdate.error || memberInsert.error) {
    // Desfaz: não deixa conta sem pelada.
    await admin.auth.admin.deleteUser(userId);
    return { success: false, message: "Não foi possível colocar o jogador na pelada. Tente de novo." };
  }

  revalidatePath("/pelada");
  revalidatePath("/");
  return { success: true, email, nickname, tempPassword };
}
