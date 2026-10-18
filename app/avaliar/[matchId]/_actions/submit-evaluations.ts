"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";
import { getRatingSession } from "../_data-access/get-rating-session";
import { submitEvaluationsSchema, type SubmitEvaluationsInput } from "../_schemas/evaluation-schema";

const UNIQUE_VIOLATION = "23505";

export type SubmitEvaluationsResult =
  | { success: true; ratedCount: number }
  | { success: false; message: string };

/**
 * Envia, de uma vez, as notas que o jogador logado deu na rodada.
 * Tudo é conferido de novo aqui (rodada aberta, presença, papel de cada avaliado);
 * o banco ainda garante notas 1–10, sem autoavaliação e só entre presentes.
 */
export async function submitEvaluations(input: SubmitEvaluationsInput): Promise<SubmitEvaluationsResult> {
  const membership = await requireActiveMembership(`/avaliar/${input.matchId}`);

  const validation = submitEvaluationsSchema.safeParse(input);
  if (!validation.success) {
    const [firstIssue] = z.flattenError(validation.error).formErrors;
    return { success: false, message: firstIssue ?? "Notas inválidas. Confira e tente de novo." };
  }
  const { matchId, evaluations } = validation.data;

  const session = await getRatingSession(matchId);
  if (session.status === "submitted") {
    return { success: false, message: "Você já enviou as notas dessa rodada." };
  }
  if (session.status !== "open") {
    return { success: false, message: "Essa rodada não está aceitando notas." };
  }

  const roleByTarget = new Map(session.targets.map((target) => [target.player.id, target.player.role]));
  const rows: TablesInsert<"evaluations">[] = [];
  for (const evaluation of evaluations) {
    // O papel vem do banco, não do navegador.
    if (roleByTarget.get(evaluation.playerId) !== evaluation.role) {
      return { success: false, message: "Algum jogador avaliado não estava nessa rodada." };
    }
    rows.push({
      match_id: matchId,
      evaluator_id: membership.memberId,
      player_id: evaluation.playerId,
      ...evaluation.scores,
    });
  }

  const supabase = await createClient();
  // Uma única inserção: ou todas as notas entram, ou nenhuma.
  const { error } = await supabase.from("evaluations").insert(rows);
  if (error) {
    return {
      success: false,
      message:
        error.code === UNIQUE_VIOLATION
          ? "Você já enviou as notas dessa rodada."
          : "Não foi possível enviar as notas. Tente de novo.",
    };
  }

  revalidatePath("/", "layout");
  return { success: true, ratedCount: rows.length };
}
