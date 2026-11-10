import { fetchAllRows } from "@/lib/fetch-all";
import "server-only";
import { computeCareerCard } from "@/lib/ovr";
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
  const data = await fetchAllRows((from, to) =>
    supabase.rpc("get_group_scores", { target_group: groupId }).order("evaluation_id").range(from, to),
  );

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

/** OVR de cada membro (média dos OVRs das últimas 5 rodadas, com o bônus de gols delas), `null` se nunca avaliado. */
export function getOvrByMember(
  evaluations: readonly Evaluation[],
  roundOrder: ReadonlyMap<string, number>,
  confirmedGoals: ReadonlyMap<string, number> = new Map(),
): Map<string, number | null> {
  // Map.groupBy só existe a partir do Node 21; o projeto roda no 20.
  const byPlayer = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    if (!isOvrEvaluation(evaluation)) continue;
    const received = byPlayer.get(evaluation.playerId) ?? [];
    received.push(evaluation);
    byPlayer.set(evaluation.playerId, received);
  }
  return new Map(
    [...byPlayer].map(([playerId, received]) => {
      const goalsByMatch = new Map<string, number>();
      for (const evaluation of received) {
        const goals = confirmedGoals.get(`${evaluation.matchId}:${playerId}`);
        if (goals) goalsByMatch.set(evaluation.matchId, goals);
      }
      return [playerId, computeCareerCard(received, roundOrder, goalsByMatch).ovr];
    }),
  );
}
