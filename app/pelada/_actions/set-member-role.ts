"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  memberId: z.uuid(),
  role: z.enum(["organizer", "player"]),
});

export type SetMemberRoleResult = { success: true } | { success: false; message: string };

/** Promove a organizador ou volta a jogador. Só o dono da pelada; ele nunca se rebaixa. */
export async function setMemberRole(
  memberId: string,
  role: "organizer" | "player",
): Promise<SetMemberRoleResult> {
  const membership = await requireActiveMembership("/pelada");
  if (!membership.isOwner) {
    return { success: false, message: "Só o dono da pelada muda quem é organizador." };
  }
  if (memberId === membership.memberId) {
    return { success: false, message: "O dono da pelada é sempre organizador." };
  }

  const validation = inputSchema.safeParse({ memberId, role });
  if (!validation.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", {
    target_member: validation.data.memberId,
    new_role: validation.data.role,
  });
  if (error) {
    return { success: false, message: "Não foi possível mudar o papel." };
  }

  revalidatePath("/pelada");
  return { success: true };
}
