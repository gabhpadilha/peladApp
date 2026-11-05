"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GOALS_MAX } from "@/lib/goal-rules";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type GoalsActionResult = { success: true } | { success: false; message: string };

const reportSchema = z.object({
  matchId: z.uuid(),
  memberId: z.uuid(),
  goals: z.number().int().min(0).max(GOALS_MAX),
});
const confirmSchema = z.object({
  matchId: z.uuid(),
  memberId: z.uuid(),
  confirmed: z.boolean(),
  /** O número que o colega viu na tela: se mudou, o banco recusa (PA008). */
  expectedGoals: z.number().int().min(0).max(GOALS_MAX).optional(),
});
const finishSchema = z.object({ matchId: z.uuid() });
const unlockSchema = z.object({ matchId: z.uuid() });

/** Mensagens das recusas do banco (as regras moram nas funções). */
function friendlyMessage(message: string): string {
  if (message.includes("round is not open")) return "Essa rodada já foi fechada.";
  if (message.includes("goals changed")) return "O número de gols mudou. Confira de novo.";
  if (message.includes("goals stage is closed")) return "A etapa dos gols já fechou. Peça ao organizador para corrigir.";
  if (message.includes("everyone reports")) return "Espere todo mundo informar os gols para conferir.";
  if (message.includes("only organizers")) return "Só o organizador pode fazer isso.";
  if (message.includes("cannot confirm your own")) return "Você não confirma os próprios gols.";
  if (message.includes("who reported")) return "Quem marcou esses gols não pode confirmá-los.";
  if (message.includes("no goals to confirm")) return "Esse jogador não informou gols para confirmar.";
  if (message.includes("between 0 and 15")) return `Informe de 0 a ${GOALS_MAX} gols.`;
  if (message.includes("not in this round") || message.includes("only players of this round")) return "Só quem jogou a rodada participa.";
  return "Não salvou. Confira a conexão e toque de novo.";
}

function refresh(matchId: string) {
  revalidatePath(`/avaliar/${matchId}`);
  revalidatePath(`/rodadas/${matchId}`);
}

/** Informa (ou corrige) os gols de um presente: o próprio ou, por quem não informou, o organizador. */
export async function reportGoals(input: z.infer<typeof reportSchema>): Promise<GoalsActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: `Informe de 0 a ${GOALS_MAX} gols.` };
  await requireActiveMembership(`/rodadas/${parsed.data.matchId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_goals", {
    target_match: parsed.data.matchId,
    target_member: parsed.data.memberId,
    goal_count: parsed.data.goals,
  });
  if (error) {
    console.error("reportGoals", error);
    return { success: false, message: friendlyMessage(error.message) };
  }
  refresh(parsed.data.matchId);
  return { success: true };
}

/** Confirma ("sim") ou não os gols de um colega. */
export async function confirmGoals(input: z.infer<typeof confirmSchema>): Promise<GoalsActionResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Não salvou. Confira a conexão e toque de novo." };
  await requireActiveMembership(`/rodadas/${parsed.data.matchId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_goals", {
    target_match: parsed.data.matchId,
    target_member: parsed.data.memberId,
    is_confirmed: parsed.data.confirmed,
    expected_goals: parsed.data.expectedGoals,
  });
  if (error) {
    console.error("confirmGoals", error);
    return { success: false, message: friendlyMessage(error.message) };
  }
  refresh(parsed.data.matchId);
  return { success: true };
}

/** O organizador libera as notas sem esperar os gols de todo mundo (quem não informou fica com 0). */
export async function unlockRatings(input: z.infer<typeof unlockSchema>): Promise<GoalsActionResult> {
  const parsed = unlockSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Não salvou. Confira a conexão e toque de novo." };
  await requireActiveMembership(`/rodadas/${parsed.data.matchId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("unlock_ratings", { target_match: parsed.data.matchId });
  if (error) {
    console.error("unlockRatings", error);
    return { success: false, message: friendlyMessage(error.message) };
  }
  refresh(parsed.data.matchId);
  return { success: true };
}

/** Conclui a conferência dos gols dos colegas (a etapa dos gols fecha quando todos concluem). */
export async function finishGoalCheck(input: z.infer<typeof finishSchema>): Promise<GoalsActionResult> {
  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Não salvou. Confira a conexão e toque de novo." };
  await requireActiveMembership(`/rodadas/${parsed.data.matchId}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("finish_goal_check", { target_match: parsed.data.matchId });
  if (error) {
    console.error("finishGoalCheck", error);
    return { success: false, message: friendlyMessage(error.message) };
  }
  refresh(parsed.data.matchId);
  return { success: true };
}
