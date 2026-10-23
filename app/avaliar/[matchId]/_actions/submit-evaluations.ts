"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { VOTE_AWARD_KINDS, canReceiveVote } from "@/types/award";
import type { TablesInsert } from "@/types/database";
import { getRatingSession } from "../_data-access/get-rating-session";
import { submitEvaluationsSchema, type SubmitEvaluationsInput } from "../_schemas/evaluation-schema";

const UNIQUE_VIOLATION = "23505";

export type SubmitEvaluationsResult =
  | { success: true; ratedCount: number; voteCount: number }
  | { success: false; message: string };

/**
 * Envia as notas e o voto no Gol da Rodada (VOTE_AWARD_KINDS) que o jogador
 * logado deu na rodada. Tudo é conferido de novo aqui (rodada aberta, presença,
 * nota para todos, papel de cada avaliado); o banco ainda garante notas 1–10, sem
 * autoavaliação e só entre presentes.
 */
export async function submitEvaluations(input: SubmitEvaluationsInput): Promise<SubmitEvaluationsResult> {
  const membership = await requireActiveMembership(`/avaliar/${input.matchId}`);

  const validation = submitEvaluationsSchema.safeParse(input);
  if (!validation.success) {
    const [firstIssue] = z.flattenError(validation.error).formErrors;
    return { success: false, message: firstIssue ?? "Notas inválidas. Confira e tente de novo." };
  }
  const { matchId, evaluations, votes } = validation.data;

  const session = await getRatingSession(matchId);
  if (session.status === "submitted") {
    return { success: false, message: "Você já enviou as notas dessa rodada." };
  }
  if (session.status !== "open") {
    return { success: false, message: "Essa rodada não está aceitando notas." };
  }

  // Envio só completo: nota para todos os outros presentes (o banco só fecha a
  // rodada com envios completos).
  const ratedIds = new Set(evaluations.map((evaluation) => evaluation.playerId));
  if (session.targets.some((target) => !ratedIds.has(target.player.id))) {
    return { success: false, message: "Dê nota para todos os jogadores da rodada antes de enviar." };
  }

  const roleByTarget = new Map(session.targets.map((target) => [target.player.id, target.player.role]));

  const evaluationRows: TablesInsert<"evaluations">[] = [];
  for (const evaluation of evaluations) {
    // O papel vem do banco, não do navegador.
    if (roleByTarget.get(evaluation.playerId) !== evaluation.role) {
      return { success: false, message: "Algum jogador avaliado não estava nessa rodada." };
    }
    evaluationRows.push({
      match_id: matchId,
      evaluator_id: membership.memberId,
      player_id: evaluation.playerId,
      ...evaluation.scores,
    });
  }

  const voteRows: TablesInsert<"round_votes">[] = [];
  for (const kind of VOTE_AWARD_KINDS) {
    const nomineeId = votes[kind];
    if (!nomineeId) continue;
    // Só quem jogou e não é você (os alvos já excluem o próprio jogador).
    const nomineeRole = roleByTarget.get(nomineeId);
    if (!nomineeRole) {
      return { success: false, message: "Algum voto foi para quem não estava nessa rodada." };
    }
    // Melhor Goleiro só para goleiros; Drible, Atacante e Defensor só para a linha.
    if (!canReceiveVote(kind, nomineeRole)) {
      return { success: false, message: "Algum voto foi para quem não pode receber esse prêmio." };
    }
    voteRows.push({ match_id: matchId, voter_id: membership.memberId, kind, nominee_id: nomineeId });
  }

  const supabase = await createClient();

  // Votos primeiro e com upsert: se as notas falharem, reenviar não duplica votos.
  if (voteRows.length > 0) {
    const { error: voteError } = await supabase
      .from("round_votes")
      .upsert(voteRows, { onConflict: "match_id,voter_id,kind" });
    if (voteError) {
      return { success: false, message: "Não foi possível registrar seus votos. Tente de novo." };
    }
  }

  // Uma única inserção: ou todas as notas entram, ou nenhuma.
  const { error } = await supabase.from("evaluations").insert(evaluationRows);
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
  return { success: true, ratedCount: evaluationRows.length, voteCount: voteRows.length };
}
