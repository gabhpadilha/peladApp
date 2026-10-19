"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PLAYER_PHOTOS_BUCKET } from "@/lib/player-photo";
import { requireActiveMembership, requireUserId } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";

export type RemovePlayerPhotoResult = { success: true } | { success: false; message: string };

/** Tira a foto da carta (volta às iniciais): o próprio jogador ou o dono. */
export async function removePlayerPhoto(memberId: string): Promise<RemovePlayerPhotoResult> {
  const userId = await requireUserId("/elenco");
  const membership = await requireActiveMembership("/elenco");
  if (!z.uuid().safeParse(memberId).success) {
    return { success: false, message: "Jogador inválido." };
  }
  if (!hasAdminEnv()) {
    return { success: false, message: "Falta a SUPABASE_SECRET_KEY no .env.local." };
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("group_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("group_id", membership.groupId)
    .maybeSingle();
  if (!member) {
    return { success: false, message: "Jogador não encontrado nessa pelada." };
  }
  if (member.user_id !== userId && !membership.isOwner) {
    return { success: false, message: "Você só pode tirar a sua própria foto." };
  }

  const { error } = await admin
    .from("group_members")
    .update({ photo_path: null, photo_kind: null })
    .eq("id", memberId);
  if (error) {
    return { success: false, message: "Não foi possível tirar a foto. Tente de novo." };
  }

  const storage = admin.storage.from(PLAYER_PHOTOS_BUCKET);
  const { data: files } = await storage.list(memberId);
  if (files && files.length > 0) await storage.remove(files.map((file) => `${memberId}/${file.name}`));

  revalidatePath("/", "layout");
  return { success: true };
}
