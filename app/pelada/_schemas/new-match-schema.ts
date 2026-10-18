import { z } from "zod";
import { MAX_TEAMS } from "@/lib/draft";

const MIN_PRESENT_PLAYERS = 2;

export const newMatchSchema = z.object({
  playedOn: z.iso.date("Escolha a data do jogo."),
  players: z
    .array(
      z.object({
        memberId: z.uuid(),
        team: z.int().min(1).max(MAX_TEAMS),
      }),
    )
    .min(MIN_PRESENT_PLAYERS, `Marque pelo menos ${MIN_PRESENT_PLAYERS} confirmados e sorteie os times.`),
});

export type NewMatchInput = z.infer<typeof newMatchSchema>;
