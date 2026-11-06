"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { PLAYER_PHOTOS_BUCKET } from "@/lib/player-photo";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAdminGroupResult =
  | { success: true; removedAccounts: number }
  | { success: false; message: string };

const GENERIC = "Algo falhou do nosso lado. Tente de novo em instantes.";

/** Compara o nome digitado com o da pelada sem diferenciar maiúscula nem espaços nas pontas. */
function sameName(typed: string, groupName: string): boolean {
  return typed.trim().toLocaleLowerCase("pt-BR") === groupName.trim().toLocaleLowerCase("pt-BR");
}

/**
 * Admin da plataforma exclui uma pelada de vez do banco (irreversível). Para confirmar, digita o nome dela.
 * Saem em cascata: jogadores, rodadas, notas, votos, cartas, gols, compras, publicações do feed e o cadastro do admin.
 * Também saem as fotos e as CONTAS de quem só estava nessa pelada. Contas que estão em outra pelada ficam, e contas de
 * admin da plataforma nunca são apagadas (senão apagar a sua pelada apagaria o seu acesso ao painel).
 */
export async function deleteAdminGroup(groupId: string, confirmName: string): Promise<DeleteAdminGroupResult> {
  if (!(await getPlatformAdminId())) return { success: false, message: "Você não tem permissão para isso." };
  if (!z.uuid().safeParse(groupId).success) return { success: false, message: "Pelada não encontrada." };

  const admin = createAdminClient();
  const { data: group } = await admin.from("groups").select("name").eq("id", groupId).maybeSingle();
  if (!group) return { success: false, message: "Pelada não encontrada." };
  if (!sameName(confirmName, group.name)) {
    return { success: false, message: "O nome digitado não confere com o da pelada. Nada foi apagado." };
  }

  const { data: members } = await admin.from("group_members").select("id, user_id").eq("group_id", groupId);
  const memberIds = (members ?? []).map((member) => member.id);
  const userIds = [...new Set((members ?? []).map((member) => member.user_id))];

  // Quem tem conta só nessa pelada (e não é admin da plataforma) perde a conta junto.
  const [{ data: elsewhere }, { data: admins }] = await Promise.all([
    userIds.length
      ? admin.from("group_members").select("user_id").in("user_id", userIds).neq("group_id", groupId)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
    userIds.length
      ? admin.from("profiles").select("id").in("id", userIds).eq("is_platform_admin", true)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  const keep = new Set([...(elsewhere ?? []).map((row) => row.user_id), ...(admins ?? []).map((row) => row.id)]);
  const accountsToDelete = userIds.filter((userId) => !keep.has(userId));

  // Fotos (best effort: arquivo sobrando no Storage não atrapalha nada).
  for (const memberId of memberIds) {
    try {
      const { data: files } = await admin.storage.from(PLAYER_PHOTOS_BUCKET).list(memberId);
      if (files?.length) await admin.storage.from(PLAYER_PHOTOS_BUCKET).remove(files.map((file) => `${memberId}/${file.name}`));
    } catch (storageError) {
      console.error("deleteAdminGroup: fotos", storageError);
    }
  }

  const { error } = await admin.from("groups").delete().eq("id", groupId);
  if (error) {
    console.error("deleteAdminGroup", error);
    return { success: false, message: GENERIC };
  }

  let removedAccounts = 0;
  for (const userId of accountsToDelete) {
    const { error: userError } = await admin.auth.admin.deleteUser(userId);
    if (userError) console.error("deleteAdminGroup: conta", userId, userError);
    else removedAccounts += 1;
  }

  revalidatePath("/", "layout");
  return { success: true, removedAccounts };
}
