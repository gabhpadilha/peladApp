"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SetMemberActiveResult = { success: true } | { success: false; message: string };

/** ~100 anos: o Auth não tem bloqueio "para sempre". */
const BAN_FOREVER = "876000h";

/**
 * Organizador desativa (quem saiu da pelada) ou reativa um jogador. O
 * histórico fica; a conta é bloqueada no Auth para o login parar de
 * funcionar, e desbloqueada ao reativar.
 */
export async function setMemberActive(memberId: string, active: boolean): Promise<SetMemberActiveResult> {
  const membership = await requireActiveMembership("/elenco");
  if (!membership.isOwner) {
    return { success: false, message: "Só o administrador da pelada desativa jogadores." };
  }
  if (!z.uuid().safeParse(memberId).success) {
    return { success: false, message: "Não achei esse jogador. Recarregue a página e tente de novo." };
  }
  if (memberId === membership.memberId) {
    return { success: false, message: "Você não pode desativar a si mesmo." };
  }
  if (!hasAdminEnv()) {
    console.error("Falta a SUPABASE_SECRET_KEY no .env.local (cliente admin indisponível).");
    return { success: false, message: "Algo falhou do nosso lado, não foi você. Tente de novo em instantes." };
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("group_id", membership.groupId)
    .maybeSingle();
  if (!member) {
    return { success: false, message: "Jogador não encontrado nessa pelada." };
  }

  // A função confere de novo que quem chama é organizador.
  const { error: rpcError } = await supabase.rpc("set_member_active", { target_member: memberId, active });
  if (rpcError) {
    return { success: false, message: "Não foi possível atualizar o jogador. Tente de novo." };
  }

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(member.user_id, {
    ban_duration: active ? "none" : BAN_FOREVER,
  });
  if (banError) {
    // Desfaz para pelada e login não ficarem diferentes.
    await supabase.rpc("set_member_active", { target_member: memberId, active: !active });
    return { success: false, message: "Não foi possível bloquear o login do jogador. Tente de novo." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
