"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateAdminGroupSchema, type UpdateAdminGroupInput } from "@/types/group-schema";
import { groupConflictMessage, toGroupColumns, toPrivateColumns } from "./group-rows";

export type UpdateAdminGroupResult =
  | { success: true }
  | { success: false; message: string; errors?: Partial<Record<keyof UpdateAdminGroupInput, string[]>> };

/** Admin da plataforma edita cadastro, código, limite do plano, contato e observações da pelada. */
export async function updateAdminGroup(input: UpdateAdminGroupInput): Promise<UpdateAdminGroupResult> {
  if (!(await getPlatformAdminId())) return { success: false, message: "Você não tem permissão para isso." };

  const validation = updateAdminGroupSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Tem campo com problema. Veja os avisos em vermelho.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }
  const { groupId, ...details } = validation.data;
  const admin = createAdminClient();

  const { error } = await admin.from("groups").update(toGroupColumns(details)).eq("id", groupId);
  if (error) {
    const conflict = groupConflictMessage(error);
    if (conflict) return { success: false, message: conflict.message, errors: { [conflict.field]: [conflict.message] } };
    console.error("updateAdminGroup", error);
    return { success: false, message: "Algo falhou do nosso lado. Tente de novo em instantes." };
  }
  const privateRes = await admin.from("group_private").upsert({ group_id: groupId, ...toPrivateColumns(details) });
  if (privateRes.error) console.error("updateAdminGroup: group_private", privateRes.error);

  revalidatePath("/admin");
  return { success: true };
}
