import "server-only";
import { computeOvr } from "@/lib/ovr";
import { createClient } from "@/lib/supabase/server";
import { isOvrEvaluation, type Evaluation } from "@/types/match";
import type { PlayerAttribute } from "@/types/player";

const SCORE_COLUMNS = [
  "vel", "chu", "pas", "dri", "def", "fis",
  "ref", "ela", "pos", "sai", "rep", "pes",
] as const satisfies readonly PlayerAttribute[];

/**
 * Avaliações das rodadas fechadas da pelada que contam na média, sem o avaliador
 * (anônimas), no formato usado por `lib/ovr.ts`. O banco já tira a maior e a
 * menor de cada jogador em cada rodada (`counted_evaluations`, a partir de
 * `TRIMMED_MEAN_MIN_RATINGS` notas), então tudo o que sai daqui usa a média aparada.
 * Notas de quem jogou fora da posição vêm com `offPosition`: contam na nota da
 * rodada, mas o OVR e os atributos as ignoram (`isOvrEvaluation`).
 */
export async function getGroupEvaluations(groupId: string): Promise<Evaluation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_scores", { target_group: groupId });
  if (error) throw error;

  return data.map((row) => {
    const scores: Partial<Record<PlayerAttribute, number>> = {};
    for (const column of SCORE_COLUMNS) {
      const value = row[column];
      if (value !== null) scores[column] = value;
    }
    return {
      id: row.evaluation_id,
      matchId: row.match_id,
      evaluatorId: "",
      playerId: row.player_id,
      scores,
      offPosition: row.off_position,
    };
  });
}

/** OVR de cada membro (soma das avaliações ÷ quantidade), `null` se nunca avaliado. */
export function getOvrByMember(evaluations: readonly Evaluation[]): Map<string, number | null> {
  // Map.groupBy só existe a partir do Node 21; o projeto roda no 20.
  const byPlayer = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    if (!isOvrEvaluation(evaluation)) continue;
    const received = byPlayer.get(evaluation.playerId) ?? [];
    received.push(evaluation);
    byPlayer.set(evaluation.playerId, received);
  }
  return new Map([...byPlayer].map(([playerId, received]) => [playerId, computeOvr(received)]));
}
