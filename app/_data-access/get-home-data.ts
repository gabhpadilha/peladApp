import { getCurrentCardEvent, type CardThemeKey, type CurrentCardEvent } from "@/lib/card-themes";
import { getActiveSale, type ShopSale } from "@/lib/shop-sale";
import { getMyGoals, type MyGoals } from "@/app/objetivos/_data-access/get-goals";
import { getLeague } from "@/lib/league";
import { computeRoundOvr } from "@/lib/ovr";
import { getMatchPerformances, type PendingEvaluation } from "@/lib/players";
import { rankScorers, type Scorer } from "@/lib/goal-ranking";
import { rankByPoints, type RankedByPoints } from "@/lib/ranking-points";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Award } from "@/types/award";
import type { Match } from "@/types/match";
import type { Player } from "@/types/player";

const TOP_PERFORMERS_SIZE = 3;
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long" });

/** "Hoje" no fuso da pelada, `AAAA-MM-DD` (o servidor roda em UTC). */
const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

export type RankedPlayer = RankedByPoints<Player>;
export type TopScorer = Scorer<Player>;
export type RoundPerformer = { player: Player; score: number };
/** Rodada fechada com cartas que o jogador ainda não abriu ("Confira os vencedores"). */
export type WinnersAlert = { matchId: string; round: number; cardCount: number; hasTeam: boolean; theme: CardThemeKey };

export type HomeData = {
  groupName: string;
  currentPlayer: Player;
  currentDelta: number | null;
  /** Posição e pontos no ranking de todos os tempos. */
  currentRank: { position: number; total: number; points: number };
  gamesPlayed: number;
  evaluationsReceived: number;
  /** Cartas especiais do jogador logado (coleção). */
  myAwardCount: number;
  pending: PendingEvaluation[];
  latestRound: { match: Match; topPerformers: RoundPerformer[]; awards: Award[] } | null;
  openRound: { match: Match; submitted: number; expected: number } | null;
  /** Ranking por pontos do mês (`AAAA-MM`, o de hoje) e de todos os tempos; todos numa lista só. */
  monthRanking: RankedPlayer[];
  allTimeRanking: RankedPlayer[];
  /** Artilharia (gols confirmados) do mês e de todos os tempos, só quem marcou. */
  monthScorers: TopScorer[];
  allTimeScorers: TopScorer[];
  /** Mês do ranking, por extenso ("novembro"). */
  monthLabel: string;
  /** Evento do mês das cartas especiais (tema sazonal ou clássico). */
  cardEvent: CurrentCardEvent;
  /** "Hoje" no fuso da pelada, `AAAA-MM-DD` (cartas de evento à venda no slide da Loja). */
  today: string;
  /** Promoção da Loja valendo hoje (ex.: Black Friday). */
  shopSale: ShopSale | null;
  winnersAlert: WinnersAlert | null;
  /** Aviso do bônus de boas-vindas, enquanto o jogador não o fechar. */
  showWelcomeBonus: boolean;
  /** Objetivos do mês, ou `null` em pelada sem pacotes ligados (o cartão nem aparece). */
  goals: MyGoals | null;
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
  // O bônus de boas-vindas e os objetivos só precisam da sessão (já em cache): saem junto com a liga, em vez de esperar por ela.
  const membership = await requireActiveMembership("/");
  const [league, showWelcomeBonus, goals] = await Promise.all([
    getLeague("/"),
    hasUnseenWelcomeBonus(membership.memberId),
    getMyGoals(membership.groupId),
  ]);
  const currentPlayer = league.players.find((player) => player.id === league.currentMemberId);
  if (!currentPlayer) {
    throw new Error("Jogador logado não encontrado na pelada");
  }

  const today = todayFormatter.format(new Date());
  const monthRanking = rankByPoints(league.activePlayers, league.getRankingPoints(today.slice(0, 7)));
  const allTimeRanking = rankByPoints(league.activePlayers, league.getRankingPoints());
  const monthScorers = rankScorers(league.activePlayers, league.getGoalTotals(today.slice(0, 7)));
  const allTimeScorers = rankScorers(league.activePlayers, league.getGoalTotals());
  const myAllTime = allTimeRanking.find((entry) => entry.player.id === currentPlayer.id);
  const performances = getMatchPerformances(currentPlayer.id, league.matches, league.evaluations, league.confirmedGoals);

  const latestMatch = league.latestClosedMatch;
  const topPerformers = latestMatch
    ? league.players
        .flatMap((player) => {
          const received = league.evaluations.filter(
            (evaluation) =>
              evaluation.matchId === latestMatch.id && evaluation.playerId === player.id,
          );
          const score = computeRoundOvr(received, league.confirmedGoals.get(`${latestMatch.id}:${player.id}`) ?? 0);
          return score === null ? [] : [{ player, score }];
        })
        .toSorted((a, b) => b.score - a.score)
        .slice(0, TOP_PERFORMERS_SIZE)
    : [];

  const openMatch = league.matches.findLast((match) => match.status === "open");
  const winnersAlert = await getWinnersAlert(league.currentMemberId, latestMatch, league.awards);

  return {
    groupName: league.membership.groupName,
    currentPlayer,
    currentDelta: league.getDelta(currentPlayer),
    currentRank: {
      position: myAllTime?.position ?? 0,
      total: allTimeRanking.length,
      points: myAllTime?.points ?? 0,
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
    monthRanking,
    allTimeRanking,
    monthScorers,
    allTimeScorers,
    monthLabel: monthFormatter.format(new Date()),
    cardEvent: getCurrentCardEvent(today),
    today,
    shopSale: getActiveSale(today),
    winnersAlert,
    showWelcomeBonus,
    goals,
  };
}
