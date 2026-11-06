"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveShowcase } from "@/lib/community-showcase";
import { REACTIONS, type ReactionKey } from "@/lib/community";
import { getLeague } from "@/lib/league";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type CommunityActionResult = { success: true } | { success: false; message: string };

const GENERIC = "Não deu certo agora. Confira a conexão e tente de novo.";

/** O Administrador liga ou desliga a pelada na comunidade; ao ligar, grava o recorte público (ranking e gols). */
export async function setGroupListed(listed: boolean): Promise<CommunityActionResult> {
  const membership = await requireActiveMembership("/elenco");
  if (!membership.isOwner) return { success: false, message: "Só o administrador da pelada liga a comunidade." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_group_listed", { target_group: membership.groupId, listed });
  if (error) {
    console.error("setGroupListed", error);
    return { success: false, message: GENERIC };
  }
  if (listed) await saveShowcase(membership.groupId, await getLeague("/elenco"));

  revalidatePath("/", "layout");
  return { success: true };
}

/** Cada jogador liga ou desliga o próprio perfil fora da pelada (ranking público, perfil e feed). */
export async function setPublicProfile(visible: boolean): Promise<CommunityActionResult> {
  const membership = await requireActiveMembership("/eu");
  const { error } = await (await createClient()).rpc("set_public_profile", { target_member: membership.memberId, visible });
  if (error) {
    console.error("setPublicProfile", error);
    return { success: false, message: GENERIC };
  }
  revalidatePath("/", "layout");
  return { success: true };
}

/** O dono da carta publica a conquista no feed (só com a pelada e o perfil ligados). */
export async function publishAward(awardId: string): Promise<CommunityActionResult> {
  await requireActiveMembership("/comunidade");
  if (!z.uuid().safeParse(awardId).success) return { success: false, message: "Não achei essa carta." };
  const { error } = await (await createClient()).rpc("publish_award", { target_award: awardId });
  if (error) {
    console.error("publishAward", error);
    return {
      success: false,
      message:
        error.code === "42501"
          ? "Para publicar, a sua pelada e o seu perfil precisam estar na comunidade (Eu → Comunidade)."
          : GENERIC,
    };
  }
  revalidatePath("/comunidade");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function unpublishPost(postId: string): Promise<CommunityActionResult> {
  await requireActiveMembership("/comunidade");
  if (!z.uuid().safeParse(postId).success) return { success: false, message: "Não achei essa publicação." };
  const { error } = await (await createClient()).rpc("unpublish_post", { target_post: postId });
  if (error) {
    console.error("unpublishPost", error);
    return { success: false, message: GENERIC };
  }
  revalidatePath("/comunidade");
  return { success: true };
}

/** Reage a uma publicação (uma reação por pessoa; `null` tira a reação). */
export async function setReaction(postId: string, reaction: ReactionKey | null): Promise<CommunityActionResult> {
  await requireActiveMembership("/comunidade");
  const valid = z.uuid().safeParse(postId).success && (reaction === null || REACTIONS.some((option) => option.key === reaction));
  if (!valid) return { success: false, message: GENERIC };
  const { error } = await (await createClient()).rpc("set_reaction", {
    target_post: postId,
    // O tipo gerado não aceita nulo, mas a função do banco usa nulo para tirar a reação.
    reaction: reaction as string,
  });
  if (error) {
    console.error("setReaction", error);
    return { success: false, message: GENERIC };
  }
  revalidatePath("/comunidade");
  return { success: true };
}
