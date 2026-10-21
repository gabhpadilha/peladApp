import "server-only";
import { z } from "zod";
import { getLeague } from "@/lib/league";
import type { CardThemeKey } from "@/lib/card-themes";
import type { Award, AwardKind } from "@/types/award";
import type { Match } from "@/types/match";

/**
 * Ordem da revelação: a zoeira abre, o Melhor Jogador e o Jogador do Mês (só na
 * rodada da última quinta) fecham; o Time da Semana vem por último, em campo.
 */
const REVEAL_ORDER: readonly AwardKind[] = [
  "bola_murcha",
  "fominha",
  "fair_play",
  "drible",
  "defensor",
  "goleiro",
  "atacante",
  "gol",
  "craque",
  "jogador_do_mes",
];

export type MatchWinners = {
  match: Match;
  /** Tema das cartas da rodada (o pacote veste o mesmo tema). */
  theme: CardThemeKey;
  /** Uma carta por vez, na ordem da revelação (empate = uma carta para cada). */
  revealed: Award[];
  /** Time da Semana (pode passar de 5 com empate). */
  team: Award[];
};

/** Cartas especiais de uma rodada fechada, para a animação. `null` se a rodada não existe ou está aberta. */
export async function getMatchWinners(matchId: string): Promise<MatchWinners | null> {
  if (!z.uuid().safeParse(matchId).success) return null;

  const league = await getLeague(`/rodadas/${matchId}/vencedores`);
  const match = league.matches.find((candidate) => candidate.id === matchId);
  if (!match || match.status !== "closed") return null;

  const awards = league.awards.filter((award) => award.matchId === match.id);
  const revealed = awards
    .filter((award) => award.kind !== "time_da_semana")
    .toSorted((a, b) => REVEAL_ORDER.indexOf(a.kind) - REVEAL_ORDER.indexOf(b.kind));
  const team = awards
    .filter((award) => award.kind === "time_da_semana")
    .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return { match, theme: awards[0]?.theme ?? "default", revealed, team };
}
