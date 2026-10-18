import { z } from "zod";
import { SCORE_MAX, SCORE_MIN } from "@/lib/ovr";
import { AWARD_KINDS, type AwardKind } from "@/types/award";
import { GOALKEEPER_ATTRIBUTES, OUTFIELD_ATTRIBUTES } from "@/types/player";

const scoreSchema = z.int().min(SCORE_MIN).max(SCORE_MAX);

const outfieldScoresSchema = z.object(
  Object.fromEntries(OUTFIELD_ATTRIBUTES.map((key) => [key, scoreSchema])) as Record<
    (typeof OUTFIELD_ATTRIBUTES)[number],
    typeof scoreSchema
  >,
);

const goalkeeperScoresSchema = z.object(
  Object.fromEntries(GOALKEEPER_ATTRIBUTES.map((key) => [key, scoreSchema])) as Record<
    (typeof GOALKEEPER_ATTRIBUTES)[number],
    typeof scoreSchema
  >,
);

/** Notas de um jogador: os 6 atributos de linha OU os 6 de goleiro. */
export const playerEvaluationSchema = z.discriminatedUnion("role", [
  z.object({ playerId: z.uuid(), role: z.literal("outfield"), scores: outfieldScoresSchema }),
  z.object({ playerId: z.uuid(), role: z.literal("goalkeeper"), scores: goalkeeperScoresSchema }),
]);

/** Um voto (opcional) por prêmio: id do jogador indicado. */
export const roundVotesSchema = z.object(
  Object.fromEntries(AWARD_KINDS.map((kind) => [kind, z.uuid().optional()])) as Record<
    AwardKind,
    z.ZodOptional<z.ZodUUID>
  >,
);

export const submitEvaluationsSchema = z.object({
  matchId: z.uuid(),
  votes: roundVotesSchema,
  evaluations: z
    .array(playerEvaluationSchema)
    .min(1, "Avalie pelo menos um jogador.")
    .refine(
      (evaluations) => new Set(evaluations.map((evaluation) => evaluation.playerId)).size === evaluations.length,
      "Jogador avaliado duas vezes.",
    ),
});

export type PlayerEvaluationInput = z.infer<typeof playerEvaluationSchema>;
export type RoundVotesInput = z.infer<typeof roundVotesSchema>;
export type SubmitEvaluationsInput = z.infer<typeof submitEvaluationsSchema>;
