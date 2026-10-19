import { z } from "zod";
import { BENCH_TEAM, MATCH_TEAMS } from "@/lib/draft";

const MIN_ON_COURT = 2;

export const newMatchSchema = z.object({
  playedOn: z.iso.date("Escolha a data do jogo."),
  players: z
    .array(
      z.object({
        memberId: z.uuid(),
        /** 1 ou 2 = time em quadra; 0 = banco de reserva. */
        team: z.int().min(BENCH_TEAM).max(MATCH_TEAMS),
      }),
    )
    .refine(
      (players) => players.filter((player) => player.team !== BENCH_TEAM).length >= MIN_ON_COURT,
      `Marque pelo menos ${MIN_ON_COURT} confirmados e sorteie os times.`,
    ),
});

export type NewMatchInput = z.infer<typeof newMatchSchema>;
