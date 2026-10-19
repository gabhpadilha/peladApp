"use server";

import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateTempPassword } from "@/lib/temp-password";
import { emailToUsername } from "@/lib/username";

export type ResetMemberPasswordResult =
  | { success: true; nickname: string; login: string; tempPassword: string }
  | { success: false; message: string };

/**
 * Dono gera uma senha nova para um jogador que esqueceu a dele (sem e-mail,
 * não existe "esqueci a senha"). O jogador troca depois, se quiser.
 */
export async function resetMemberPassword(memberId: string): Promise<ResetMemberPasswordResult> {
  const membership = await requireActiveMembership("/elenco");
  if (!membership.isOwner) {
    return { success: false, message: "Só o dono da pelada redefine senhas." };
  }
  if (!z.uuid().safeParse(memberId).success) {
    return { success: false, message: "Jogador inválido." };
  }
  if (!hasAdminEnv()) {
    return { success: false, message: "Falta a SUPABASE_SECRET_KEY no .env.local." };
  }

  // Confere com a sessão do organizador (RLS) que o jogador é da pelada dele.
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("group_members")
    .select("user_id, nickname")
    .eq("id", memberId)
    .eq("group_id", membership.groupId)
    .maybeSingle();
  if (!member) {
    return { success: false, message: "Jogador não encontrado nessa pelada." };
  }
  if (member.user_id === membership.ownerUserId) {
    return { success: false, message: "Sua própria senha se troca em \"Sua senha\"." };
  }

  const admin = createAdminClient();
  const { data: target, error: lookupError } = await admin.auth.admin.getUserById(member.user_id);
  if (lookupError || !target.user) {
    return { success: false, message: "Não foi possível encontrar a conta do jogador." };
  }

  const tempPassword = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(member.user_id, { password: tempPassword });
  if (error) {
    return { success: false, message: "Não foi possível redefinir a senha. Tente de novo." };
  }

  const email = target.user.email ?? "";
  return {
    success: true,
    nickname: member.nickname,
    login: emailToUsername(email) ?? email,
    tempPassword,
  };
}
