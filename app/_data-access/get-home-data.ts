import { getCurrentCardEvent, type CardThemeKey, type CurrentCardEvent } from "@/lib/card-themes";
import { getActiveSale, type ShopSale } from "@/lib/shop-sale";
import { getLeague } from "@/lib/league";
import { averageEvaluations } from "@/lib/ovr";
import { getMatchPerformances, rankPlayers, type PendingEvaluation } from "@/lib/players";
import type { LevelProgress } from "@/lib/progression";
import { createClient } from "@/lib/supabase/server";
import { getOwnPurchases } from "@/app/loja/_data-access/get-shop";
import type { Award } from "@/types/award";
import type { Match } from "@/types/match";
import type { Player } from "@/types/player";

const TOP_PERFORMERS_SIZE = 3;

/** "Hoje" no fuso da pelada, `AAAA-MM-DD` (o servidor roda em UTC). */
const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export type RankedPlayer = { player: Player; position: number; delta: number | null };
export type RoundPerformer = { player: Player; score: number };
/** Rodada fechada com cartas que o jogador ainda não abriu ("Confira os vencedores"). */
export type WinnersAlert = { matchId: string; round: number; cardCount: number; hasTeam: boolean; theme: CardThemeKey };

export type HomeData = {
  groupName: string;
  currentPlayer: Player;
  currentDelta: number | null;
  currentRank: { position: number; total: number };
  gamesPlayed: number;
  evaluationsReceived: number;
  /** Cartas especiais do jogador logado (coleção). */
  myAwardCount: number;
  pending: PendingEvaluation[];
  latestRound: { match: Match; topPerformers: RoundPerformer[]; awards: Award[] } | null;
  openRound: { match: Match; submitted: number; expected: number } | null;
  outfieldRanking: RankedPlayer[];
  goalkeeperRanking: RankedPlayer[];
  /** Evento do mês das cartas especiais (tema sazonal ou clássico). */
  cardEvent: CurrentCardEvent;
  /** "Hoje" no fuso da pelada, `AAAA-MM-DD` (cartas de evento à venda no slide da Loja). */
  today: string;
  /** Promoção da Loja valendo hoje (ex.: Black Friday). */
  shopSale: ShopSale | null;
  winnersAlert: WinnersAlert | null;
  /** Aviso do bônus de boas-vindas, enquanto o jogador não o fechar. */
  showWelcomeBonus: boolean;
  /** Nível e saldo de PeladaCoins (slides de novidades). */
  levelProgress: LevelProgress;
  balance: number;
};

/** O jogador ainda não viu o aviso do bônus de primeiro login. */
async function hasUnseenWelcomeBonus(memberId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select("welcome_bonus_seen_at")
    .eq("id", memberId)
    .single();
  if (error) throw error;
  return data.welcome_bonus_seen_at === null;
}

/** Aviso da última rodada fechada, enquanto o jogador não abrir o pacote dela. */
async function getWinnersAlert(memberId: string, match: Match | null, awards: Award[]): Promise<WinnersAlert | null> {
  if (!match) return null;
  const roundAwards = awards.filter((award) => award.matchId === match.id);
  if (roundAwards.length === 0) return null;

  const supabase = await createClient();
  // O RLS só devolve as próprias linhas.
  const { count, error } = await supabase
    .from("award_reveals")
    .select("match_id", { count: "exact", head: true })
    .eq("match_id", match.id)
    .eq("member_id", memberId);
  if (error) throw error;
  if ((count ?? 0) > 0) return null;

  return {
    matchId: match.id,
    round: match.round,
    cardCount: roundAwards.filter((award) => award.kind !== "time_da_semana").length,
    hasTeam: roundAwards.some((award) => award.kind === "time_da_semana"),
    theme: roundAwards[0].theme,
  };
}

export async function getHomeData(): Promise<HomeData> {
  const league = await getLeague("/");
  const today = todayFormatter.format(new Date());
  const currentPlayer = league.players.find((player) => player.id === league.currentMemberId);
  if (!currentPlayer) {
    throw new Error("Jogador logado não encontrado na pelada");
  }

  const roleRanking = rankPlayers(league.activePlayers, currentPlayer.role);
  const performances = getMatchPerformances(currentPlayer.id, league.matches, league.evaluations);

  const toRanked = (player: Player, index: number): RankedPlayer => ({
    player,
    position: index + 1,
    delta: league.getDelta(player),
  });

  const latestMatch = league.latestClosedMatch;
  const topPerformers = latestMatch
    ? league.players
        .flatMap((player) => {
          const received = league.evaluations.filter(
            (evaluation) =>
              evaluation.matchId === latestMatch.id && evaluation.playerId === player.id,
          );
          const score = averageEvaluations(received);
          return score === null ? [] : [{ player, score }];
        })
        .toSorted((a, b) => b.score - a.score)
        .slice(0, TOP_PERFORMERS_SIZE)
    : [];

  const openMatch = league.matches.findLast((match) => match.status === "open");
  const [winnersAlert, showWelcomeBonus, purchases] = await Promise.all([
    getWinnersAlert(league.currentMemberId, latestMatch, league.awards),
    hasUnseenWelcomeBonus(league.currentMemberId),
    getOwnPurchases(league.currentMemberId),
  ]);
  const progression = league.getProgression(currentPlayer.id);

  return {
    groupName: league.membership.groupName,
    currentPlayer,
    currentDelta: league.getDelta(currentPlayer),
    currentRank: {
      position: roleRanking.findIndex((player) => player.id === currentPlayer.id) + 1,
      total: roleRanking.length,
    },
    gamesPlayed: performances.filter((performance) => performance.wasPresent).length,
    evaluationsReceived: performances.reduce(
      (total, performance) => total + performance.evaluationCount,
      0,
    ),
    myAwardCount: league.awards.filter((award) => award.memberId === currentPlayer.id).length,
    pending: league.pending,
    latestRound: latestMatch
      ? {
          match: latestMatch,
          topPerformers,
          awards: league.awards.filter((award) => award.matchId === latestMatch.id),
        }
      : null,
    openRound: openMatch
      ? {
          match: openMatch,
          submitted: league.submittedByMatch.get(openMatch.id) ?? 0,
          expected: openMatch.presentPlayerIds.length,
        }
      : null,
    // Completos: a home mostra o resumo e expande para o ranking inteiro.
    outfieldRanking: rankPlayers(league.activePlayers, "outfield").map(toRanked),
    goalkeeperRanking: rankPlayers(league.activePlayers, "goalkeeper").map(toRanked),
    cardEvent: getCurrentCardEvent(today),
    today,
    shopSale: getActiveSale(today),
    winnersAlert,
    showWelcomeBonus,
    levelProgress: progression,
    balance: progression.coinsEarned - purchases.spent,
  };
}
