import { z } from "zod";
import { MATCH_TEAMS } from "@/lib/draft";

const MIN_STARTERS = 2;

export const newMatchSchema = z.object({
  playedOn: z.iso.date("Escolha a data do jogo."),
  players: z
    .array(
      z.object({
        memberId: z.uuid(),
        /** 1 = Branco, 2 = Preto. */
        team: z.int().min(1).max(MATCH_TEAMS),
        /** Reserva do time (começa no banco). */
        reserve: z.boolean(),
      }),
    )
    .refine(
      (players) => players.filter((player) => !player.reserve).length >= MIN_STARTERS,
      `Marque pelo menos ${MIN_STARTERS} confirmados e sorteie os times.`,
    ),
});

export type NewMatchInput = z.infer<typeof newMatchSchema>;
