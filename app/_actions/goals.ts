"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GOAL_ERROR_MESSAGES } from "@/lib/goals";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type GoalActionResult = { success: true; message: string } | { success: false; message: string };

const acceptSchema = z.object({ optionKey: z.string().regex(/^[a-z0-9_]{3,40}$/) });

/** Aceita um objetivo do mês. A escolha é única por nível e só conta o que acontecer depois dela (o banco garante). */
export async function acceptGoal(input: { optionKey: string }): Promise<GoalActionResult> {
  const membership = await requireActiveMembership("/objetivos");
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: GOAL_ERROR_MESSAGES.PA041 };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_goal", { target_group: membership.groupId, chosen_key: parsed.data.optionKey });
  if (error) {
    const known = error.code ? GOAL_ERROR_MESSAGES[error.code] : undefined;
    if (!known) console.error("acceptGoal: recusado", error);
    return { success: false, message: known ?? "Não foi possível agora. Confira a conexão e tente de novo." };
  }

  revalidatePath("/", "layout");
  return { success: true, message: "Objetivo aceito. Vale o que você fizer daqui para a frente." };
}
