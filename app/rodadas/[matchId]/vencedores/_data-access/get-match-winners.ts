import "server-only";
import { z } from "zod";
import { getOwnPurchases } from "@/app/loja/_data-access/get-shop";
import { getLeague } from "@/lib/league";
import type { CardThemeKey } from "@/lib/card-themes";
import type { RoundRewards } from "@/lib/progression";
import type { Award, AwardKind } from "@/types/award";
import type { Match } from "@/types/match";
import type { Player } from "@/types/player";

/**
 * Ordem das cartas: a zoeira abre e os prêmios mais importantes vêm depois. O
 * Time da Semana, o Time do Mês (só na rodada da última quinta) e o Melhor
 * Jogador, nessa ordem, ficam no fim (`buildSteps` em `winners-reveal.tsx`).
 */
const REVEAL_ORDER: readonly AwardKind[] = [
  "bola_murcha",
  "fominha",
  "foguete",
  "garcom",
  "drible",
  "motor",
  "criativo",
  "defensor",
  "goleiro",
  "atacante",
  "gol",
  "jogador_do_mes",
  "craque",
];

export type MatchWinners = {
  match: Match;
  /** Tema das cartas da rodada (o pacote veste o mesmo tema). */
  theme: CardThemeKey;
  /** Uma carta por vez, na ordem da revelação (empate = uma carta para cada). */
  revealed: Award[];
  /** Time da Semana (pode passar de 5 com empate). */
  team: Award[];
  /** O que a rodada deu a quem abriu o pacote (XP e CanchaCoins), com o saldo e a carta de hoje. */
  rewards?: (RoundRewards & { balance: number; card: Player | null }) | null;
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

  const memberId = league.currentMemberId;
  const roundRewards = league.getRoundRewards(memberId, match.id);
  const rewards = roundRewards
    ? {
        ...roundRewards,
        balance: Math.max(0, league.getProgression(memberId).coinsEarned - (await getOwnPurchases(memberId)).spent),
        card: league.players.find((player) => player.id === memberId) ?? null,
      }
    : null;

  return { match, theme: awards[0]?.theme ?? "default", revealed, team, rewards };
}
