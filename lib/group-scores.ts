import "server-only";
import { computeOvr } from "@/lib/ovr";
import { createClient } from "@/lib/supabase/server";
import type { Evaluation } from "@/types/match";
import type { PlayerAttribute } from "@/types/player";

const SCORE_COLUMNS = [
  "vel", "chu", "pas", "dri", "def", "fis",
  "ref", "ela", "pos", "sai", "rep", "pes",
] as const satisfies readonly PlayerAttribute[];

/**
 * Avaliações das rodadas fechadas da pelada, sem o avaliador (anônimas),
 * no formato usado por `lib/ovr.ts`.
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
    };
  });
}

/** OVR de cada membro (soma das avaliações ÷ quantidade), `null` se nunca avaliado. */
export function getOvrByMember(evaluations: readonly Evaluation[]): Map<string, number | null> {
  // Map.groupBy só existe a partir do Node 21; o projeto roda no 20.
  const byPlayer = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    const received = byPlayer.get(evaluation.playerId) ?? [];
    received.push(evaluation);
    byPlayer.set(evaluation.playerId, received);
  }
  return new Map([...byPlayer].map(([playerId, received]) => [playerId, computeOvr(received)]));
}
