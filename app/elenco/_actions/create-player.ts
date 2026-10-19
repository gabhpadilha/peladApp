"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/temp-password";
import { usernameToEmail } from "@/lib/username";
import {
  createPlayerSchema,
  type CreatePlayerInput,
  type FieldErrors,
} from "@/types/member-schema";

export type CreatePlayerResult =
  | { success: true; username: string; nickname: string; tempPassword: string }
  | { success: false; message: string; errors?: FieldErrors<CreatePlayerInput> };

const USERNAME_TAKEN = "Esse usuário já existe. Escolha outro.";

/**
 * Organizador cadastra um jogador por usuário (sem e-mail): cria a conta já
 * confirmada com uma senha gerada (o jogador troca se quiser, em "Sua senha") e coloca
 * na pelada. O Auth recebe o e-mail técnico do usuário (lib/username.ts).
 */
export async function createPlayer(input: CreatePlayerInput): Promise<CreatePlayerResult> {
  const membership = await requireActiveMembership("/elenco");
  if (!membership.isOwner) {
    return { success: false, message: "Só o dono da pelada cadastra jogadores." };
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

  const { username, fullName, nickname, position } = validation.data;
  const admin = createAdminClient();

  const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) {
    return { success: false, message: USERNAME_TAKEN, errors: { username: [USERNAME_TAKEN] } };
  }

  const tempPassword = generateTempPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password: tempPassword,
    email_confirm: true,
  });
  if (createError || !created.user) {
    if (createError?.code === "email_exists") {
      return { success: false, message: USERNAME_TAKEN, errors: { username: [USERNAME_TAKEN] } };
    }
    return {
      success: false,
      message:
        createError?.code === "email_address_invalid"
          ? "O Supabase recusou o login técnico desse usuário. Avise quem cuida do app."
          : "Não foi possível criar a conta.",
    };
  }

  const userId = created.user.id;
  // O perfil já foi criado pelo trigger on_auth_user_created.
  const profileUpdate = await admin
    .from("profiles")
    .update({ full_name: fullName, username })
    .eq("id", userId);
  const memberInsert = await admin
    .from("group_members")
    .insert({ group_id: membership.groupId, user_id: userId, nickname, position });

  if (profileUpdate.error || memberInsert.error) {
    // Desfaz: não deixa conta sem pelada.
    await admin.auth.admin.deleteUser(userId);
    return { success: false, message: "Não foi possível colocar o jogador na pelada. Tente de novo." };
  }

  revalidatePath("/", "layout");
  return { success: true, username, nickname, tempPassword };
}
