"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership, requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ownProfileSchema, type FieldErrors, type OwnProfileInput } from "@/types/member-schema";

export type UpdateOwnProfileResult =
  | { success: true }
  | { success: false; message: string; errors?: FieldErrors<OwnProfileInput> };

/**
 * O próprio jogador troca nome e apelido. Roda com a sessão dele (RLS): o
 * banco só deixa mexer na própria linha, e posição/usuário ficam com o dono.
 */
export async function updateOwnProfile(input: OwnProfileInput): Promise<UpdateOwnProfileResult> {
  const userId = await requireUserId("/elenco");
  const membership = await requireActiveMembership("/elenco");

  const validation = ownProfileSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }

  const { fullName, nickname } = validation.data;
  const supabase = await createClient();
  const [profileUpdate, memberUpdate] = await Promise.all([
    supabase.from("profiles").update({ full_name: fullName }).eq("id", userId),
    supabase.from("group_members").update({ nickname }).eq("id", membership.memberId),
  ]);
  if (profileUpdate.error || memberUpdate.error) {
    return { success: false, message: "Não foi possível salvar. Tente de novo." };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
