"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { emailToUsername, usernameToEmail } from "@/lib/username";
import { editPlayerSchema, type EditPlayerInput, type FieldErrors } from "@/types/member-schema";

export type EditPlayerResult =
  | { success: true }
  | { success: false; message: string; errors?: FieldErrors<EditPlayerInput> };

const USERNAME_TAKEN = "Esse usuário já existe. Escolha outro.";
const ROLE_LOCKED =
  "Ele já tem notas nessa função. Linha e goleiro têm atributos diferentes, então só dá para trocar entre Fixo, Ala e Pivô.";

/**
 * Dono da pelada corrige nome, apelido, posição e usuário de um jogador.
 * Trocar o usuário troca o login (e-mail técnico do Auth); a senha continua.
 */
export async function editPlayer(memberId: string, input: EditPlayerInput): Promise<EditPlayerResult> {
  const membership = await requireActiveMembership("/elenco");
  if (!membership.isOwner) {
    return { success: false, message: "Só o administrador da pelada edita o cadastro dos jogadores." };
  }
  if (!z.uuid().safeParse(memberId).success) {
    return { success: false, message: "Jogador inválido." };
  }
  const validation = editPlayerSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }
  if (!hasAdminEnv()) {
    return { success: false, message: "Falta a SUPABASE_SECRET_KEY no .env.local." };
  }

  // Confere com a sessão do organizador (RLS) que o jogador é da pelada dele.
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("group_members")
    .select("user_id, position")
    .eq("id", memberId)
    .eq("group_id", membership.groupId)
    .maybeSingle();
  if (!member) {
    return { success: false, message: "Jogador não encontrado nessa pelada." };
  }

  const { fullName, nickname, position, username } = validation.data;
  const admin = createAdminClient();

  // Linha ↔ goleiro só antes da primeira nota (os atributos não se convertem).
  if ((member.position === "GOL") !== (position === "GOL")) {
    const { count, error } = await admin
      .from("evaluations")
      .select("id", { count: "exact", head: true })
      .eq("player_id", memberId);
    if (error) {
      return { success: false, message: "Não foi possível conferir as notas do jogador." };
    }
    if ((count ?? 0) > 0) {
      return { success: false, message: ROLE_LOCKED, errors: { position: [ROLE_LOCKED] } };
    }
  }

  const { data: account, error: accountError } = await admin.auth.admin.getUserById(member.user_id);
  if (accountError || !account.user) {
    return { success: false, message: "Não foi possível encontrar a conta do jogador." };
  }
  const currentUsername = emailToUsername(account.user.email ?? "");
  // Conta com e-mail não tem usuário; o campo vem vazio e é ignorado.
  const nextUsername = currentUsername && username ? username : currentUsername;

  if (nextUsername && nextUsername !== currentUsername) {
    const { data: taken } = await admin.from("profiles").select("id").eq("username", nextUsername).maybeSingle();
    if (taken) {
      return { success: false, message: USERNAME_TAKEN, errors: { username: [USERNAME_TAKEN] } };
    }
    const { error } = await admin.auth.admin.updateUserById(member.user_id, {
      email: usernameToEmail(nextUsername),
      email_confirm: true,
    });
    if (error) {
      return error.code === "email_exists"
        ? { success: false, message: USERNAME_TAKEN, errors: { username: [USERNAME_TAKEN] } }
        : { success: false, message: "Não foi possível trocar o usuário. Tente de novo." };
    }
  }

  const profileUpdate = await admin
    .from("profiles")
    .update({ full_name: fullName, username: nextUsername })
    .eq("id", member.user_id);
  const memberUpdate = await supabase
    .from("group_members")
    .update({ nickname, position })
    .eq("id", memberId);

  if (profileUpdate.error || memberUpdate.error) {
    // Login e perfil precisam bater: volta o e-mail técnico se o perfil falhou.
    if (profileUpdate.error && nextUsername !== currentUsername && currentUsername) {
      await admin.auth.admin.updateUserById(member.user_id, {
        email: usernameToEmail(currentUsername),
        email_confirm: true,
      });
    }
    return { success: false, message: "Não foi possível salvar. Tente de novo." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
