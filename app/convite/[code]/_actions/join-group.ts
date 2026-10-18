"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId, setActiveGroup } from "@/lib/session";
import { getDatabaseErrorMessage } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { joinGroupSchema, type FieldErrors, type JoinGroupInput } from "@/types/member-schema";

export type JoinGroupResult = {
  success: false;
  message: string;
  errors?: FieldErrors<JoinGroupInput>;
};

/** Entra na pelada pelo convite e abre a home já nela. */
export async function joinGroup(input: JoinGroupInput): Promise<JoinGroupResult> {
  const userId = await requireUserId(`/convite/${input.inviteCode}`);

  const validation = joinGroupSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      message: "Confira os campos.",
      errors: z.flattenError(validation.error).fieldErrors,
    };
  }
  const { fullName, nickname, position, inviteCode } = validation.data;

  const supabase = await createClient();
  const profileUpdate = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);
  if (profileUpdate.error) {
    return {
      success: false,
      message: getDatabaseErrorMessage(profileUpdate.error, "Não foi possível salvar seu nome."),
    };
  }

  const { data: groupId, error } = await supabase.rpc("join_group", {
    code: inviteCode,
    member_nickname: nickname,
    member_position: position,
  });
  if (error || !groupId) {
    return { success: false, message: "Convite inválido ou expirado." };
  }

  await setActiveGroup(groupId);
  redirect("/");
}
