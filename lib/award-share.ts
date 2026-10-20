import type { Award } from "@/types/award";
import type { Match } from "@/types/match";

/**
 * Cartas especiais que o jogador ainda pode compartilhar nos stories
 * (decisão do dono do app): só as próprias e só as da rodada mais recente.
 * Criou a rodada seguinte (aberta ou fechada), as da anterior saem.
 */
export function getShareableAwardIds(
  awards: readonly Award[],
  matches: readonly Pick<Match, "round">[],
  memberId: string,
): string[] {
  if (matches.length === 0) return [];
  const latestRound = Math.max(...matches.map((match) => match.round));
  return awards
    .filter((award) => award.memberId === memberId && award.round === latestRound)
    .map((award) => award.id);
}
