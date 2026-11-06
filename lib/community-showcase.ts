import "server-only";
import type { League } from "@/lib/league";
import type { ShowcasePlayer, ShowcaseTotals } from "@/lib/community";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

/** Meses (`AAAA-MM`) com rodada fechada. */
function getClosedMonths(league: League): string[] {
  return [...new Set(league.matches.filter((match) => match.status === "closed").map((match) => match.date.slice(0, 7)))];
}

/**
 * Recorte público da pelada a partir da liga da sessão de quem chama (o organizador ou o Administrador da própria
 * pelada): ranking e gols de todos os tempos e de cada mês, só de jogadores ativos. A comunidade nunca lê as tabelas
 * privadas: lê isto, filtrado pelo aceite de cada jogador (ver `get_group_showcase`).
 */
export function buildShowcasePlayers(league: League): ShowcasePlayer[] {
  const months = getClosedMonths(league);
  const pointsAll = league.getRankingPoints();
  const goalsAll = league.getGoalTotals();
  const pointsByMonth = new Map(months.map((month) => [month, league.getRankingPoints(month)]));
  const goalsByMonth = new Map(months.map((month) => [month, league.getGoalTotals(month)]));

  return league.activePlayers.map((player) => {
    const totalsOf = (points?: { points: number; rounds: number }, goals?: { goals: number; games: number }): ShowcaseTotals => ({
      points: points?.points ?? 0,
      rounds: points?.rounds ?? 0,
      goals: goals?.goals ?? 0,
      games: goals?.games ?? 0,
    });
    return {
      id: player.id,
      nickname: player.nickname,
      position: player.position,
      ovr: player.ovr,
      level: player.level ?? 0,
      photo: player.photo,
      cardSkin: player.cardSkin ?? null,
      attributes: { ...player.attributes },
      total: totalsOf(pointsAll.get(player.id), goalsAll.get(player.id)),
      byMonth: Object.fromEntries(
        months.map((month) => [month, totalsOf(pointsByMonth.get(month)?.get(player.id), goalsByMonth.get(month)?.get(player.id))]),
      ),
    };
  });
}

/** Grava o recorte público da pelada (chave secreta; chamar só depois de checar quem é o usuário e a pelada dele). */
export async function saveShowcase(groupId: string, league: League): Promise<void> {
  const { error } = await createAdminClient()
    .from("group_showcase")
    .upsert({ group_id: groupId, players: buildShowcasePlayers(league) as unknown as Json, updated_at: new Date().toISOString() });
  if (error) console.error("saveShowcase", error);
}
