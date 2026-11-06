"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { PLAYER_PHOTOS_BUCKET } from "@/lib/player-photo";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResolveDeletionResult = { success: true } | { success: false; message: string };

const GENERIC = "Algo falhou do nosso lado. Tente de novo em instantes.";

/**
 * Admin da plataforma resolve um pedido de exclusão de conta: "dismiss" só tira o pedido da fila; "delete" apaga a conta
 * (cartas, notas dadas e recebidas, gols e compras saem em cascata, e o OVR e o ranking dos outros se recalculam).
 * Nunca apaga admin da plataforma nem o Administrador de uma pelada (o banco também barra o dono).
 */
export async function resolveDeletionRequest(requestId: string, action: "delete" | "dismiss"): Promise<ResolveDeletionResult> {
  if (!(await getPlatformAdminId())) return { success: false, message: "Você não tem permissão para isso." };
  if (!z.uuid().safeParse(requestId).success) return { success: false, message: "Pedido não encontrado." };

  const admin = createAdminClient();
  const { data: request } = await admin.from("account_deletion_requests").select("id, user_id").eq("id", requestId).maybeSingle();
  if (!request) return { success: false, message: "Pedido não encontrado (talvez a pessoa já tenha desistido)." };

  if (action === "dismiss") {
    await admin.from("account_deletion_requests").delete().eq("id", requestId);
    revalidatePath("/admin");
    return { success: true };
  }

  const [{ data: profile }, { data: owned }, { data: members }] = await Promise.all([
    admin.from("profiles").select("is_platform_admin").eq("id", request.user_id).maybeSingle(),
    admin.from("groups").select("name").eq("created_by", request.user_id),
    admin.from("group_members").select("id").eq("user_id", request.user_id),
  ]);
  if (profile?.is_platform_admin) return { success: false, message: "É admin da plataforma: tire a marca de admin antes." };
  if (owned && owned.length > 0) {
    return { success: false, message: `É o Administrador da pelada ${owned[0].name}. Exclua a pelada antes de apagar a conta.` };
  }

  // Fotos (best effort: arquivo sobrando no Storage não atrapalha).
  for (const member of members ?? []) {
    try {
      const { data: files } = await admin.storage.from(PLAYER_PHOTOS_BUCKET).list(member.id);
      if (files?.length) await admin.storage.from(PLAYER_PHOTOS_BUCKET).remove(files.map((file) => `${member.id}/${file.name}`));
    } catch (storageError) {
      console.error("resolveDeletionRequest: fotos", storageError);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(request.user_id);
  if (error) {
    console.error("resolveDeletionRequest", error);
    return { success: false, message: GENERIC };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
