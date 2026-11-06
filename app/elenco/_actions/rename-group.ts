"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type RenameGroupResult = { success: true; name: string } | { success: false; message: string };

const renameSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome para a pelada.").max(60, "Use no máximo 60 caracteres."),
});

/** Nome já usado por outra pelada (função `rename_group`, código PA010; não conta maiúscula, acento nem pontuação). */
const NAME_IN_USE = "PA010";

/** O Administrador renomeia a própria pelada. O banco garante que só o dono renomeia e que o nome é único. */
export async function renameGroup(input: { name: string }): Promise<RenameGroupResult> {
  const membership = await requireActiveMembership("/elenco");
  if (!membership.isOwner) return { success: false, message: "Só o administrador da pelada muda o nome." };

  const validation = renameSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, message: z.flattenError(validation.error).fieldErrors.name?.[0] ?? "Confira o nome." };
  }

  const { error } = await (await createClient()).rpc("rename_group", { target_group: membership.groupId, new_name: validation.data.name });
  if (error) {
    if (error.code === NAME_IN_USE) {
      return { success: false, message: "Esse nome já está em uso por outra pelada. Escolha outro." };
    }
    console.error("renameGroup", error);
    return { success: false, message: "Não deu para mudar o nome agora. Confira a conexão e tente de novo." };
  }

  revalidatePath("/", "layout");
  return { success: true, name: validation.data.name };
}
