"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { REACTIONS, type ReactionKey } from "@/lib/community";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type CommunityActionResult = { success: true } | { success: false; message: string };

const GENERIC = "Não deu certo agora. Confira a conexão e tente de novo.";

/** O dono da carta publica a conquista no feed. */
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
          ? "Não foi possível publicar essa carta. Só o dono dela publica, e pelada suspensa não aparece na comunidade."
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
