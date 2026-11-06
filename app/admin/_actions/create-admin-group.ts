"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_ACTIVE_GROUPS } from "@/lib/platform";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/temp-password";
import { USERNAME_PATTERN, usernameToEmail } from "@/lib/username";
import { createAdminGroupSchema, type CreateAdminGroupInput } from "@/types/group-schema";
import { groupConflictMessage, toGroupColumns, toPrivateColumns } from "./group-rows";

type FieldErrors = Partial<Record<keyof CreateAdminGroupInput, string[]>>;

export type CreateAdminGroupResult =
  | { success: true; groupName: string; nickname: string; username: string; tempPassword: string }
  | { success: false; message: string; errors?: FieldErrors };

const GENERIC_ERROR = "Algo falhou do nosso lado. Tente de novo em instantes.";

/**
 * Admin da plataforma cria uma pelada e a conta do dono (Administrador da pelada).
 * O usuário do dono vira `<usuario>.<código>`. Se algum passo falhar, desfaz o que já criou.
 */
export async function createAdminGroup(input: CreateAdminGroupInput): Promise<CreateAdminGroupResult> {
  if (!(await getPlatformAdminId())) return { success: false, message: "Você não tem permissão para isso." };

  const validation = createAdminGroupSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Tem campo com problema. Veja os avisos em vermelho.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }
  if (!hasAdminEnv()) {
    console.error("Falta a SUPABASE_SECRET_KEY (cliente admin indisponível).");
    return { success: false, message: GENERIC_ERROR };
  }

  const data = validation.data;
  const username = `${data.ownerUsername}.${data.slug}`;
  if (!USERNAME_PATTERN.test(username)) {
    const message = "Usuário + código passam de 20 caracteres. Encurte um dos dois.";
    return { success: false, message, errors: { ownerUsername: [message] } };
  }

  const admin = createAdminClient();

  const { count: activeCount } = await admin
    .from("groups")
    .select("id", { count: "exact", head: true })
    .is("suspended_at", null);
  if ((activeCount ?? 0) >= MAX_ACTIVE_GROUPS) {
    return { success: false, message: `Já são ${MAX_ACTIVE_GROUPS} peladas ativas. Suspenda uma antes de criar outra.` };
  }

  const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) {
    const message = "Esse usuário já existe. Escolha outro.";
    return { success: false, message, errors: { ownerUsername: [message] } };
  }

  const tempPassword = generateTempPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password: tempPassword,
    email_confirm: true,
  });
  if (createError || !created.user) {
    console.error("createAdminGroup: createUser", createError);
    return { success: false, message: "Não foi possível criar a conta do dono." };
  }
  const userId = created.user.id;

  const rollback = async () => {
    await admin.auth.admin.deleteUser(userId); // o perfil e as linhas ligadas saem em cascata
  };

  const { data: group, error: groupError } = await admin
    .from("groups")
    // name_key é calculado pelo trigger do banco (o tipo gerado só exige o campo).
    .insert({ ...toGroupColumns(data), name_key: "", created_by: userId })
    .select("id")
    .single();
  if (groupError || !group) {
    await rollback();
    const conflict = groupConflictMessage(groupError);
    if (conflict) return { success: false, message: conflict.message, errors: { [conflict.field]: [conflict.message] } };
    console.error("createAdminGroup: insert group", groupError);
    return { success: false, message: GENERIC_ERROR };
  }

  const steps = await Promise.all([
    admin.from("profiles").update({ full_name: data.fullName, username }).eq("id", userId),
    admin
      .from("group_members")
      .insert({ group_id: group.id, user_id: userId, role: "organizer", nickname: data.nickname, position: data.position }),
    admin.from("group_private").insert({ group_id: group.id, ...toPrivateColumns(data) }),
  ]);
  if (steps.some((step) => step.error)) {
    console.error("createAdminGroup: passos", steps.map((step) => step.error));
    await admin.from("groups").delete().eq("id", group.id);
    await rollback();
    return { success: false, message: GENERIC_ERROR };
  }

  revalidatePath("/admin");
  return { success: true, groupName: data.groupName, nickname: data.nickname, username, tempPassword };
}
