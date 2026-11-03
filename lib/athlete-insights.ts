import { getCardStats, type CardStat } from "@/lib/card-stats";
import type { Player } from "@/types/player";

/** A estatística da carta com valor (Ataque, Criação, Defesa; no gol, Paredão, Leitura, Saída). */
export type StatValue = { label: string; value: number };

function statValues(player: Player): StatValue[] {
  return getCardStats(player).flatMap((stat: CardStat) => (stat.value === null ? [] : [{ label: stat.label, value: stat.value }]));
}

/** Ponto forte e ponto a melhorar (maior e menor estatística da carta); `null` sem notas. */
export function getStatExtremes(player: Player): { strongest: StatValue; weakest: StatValue } | null {
  const values = statValues(player);
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => b.value - a.value);
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
}

/**
 * Média de cada estatística da carta entre os jogadores da mesma função (linha ou gol) que já têm nota,
 * pelo nome da estatística. Linha e goleiro nunca se misturam.
 */
export function getGroupStatAverages(players: readonly Player[], role: Player["role"]): Record<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const player of players) {
    if (player.role !== role) continue;
    for (const { label, value } of statValues(player)) {
      const total = totals.get(label);
      if (total) {
        total.sum += value;
        total.count += 1;
      } else {
        totals.set(label, { sum: value, count: 1 });
      }
    }
  }
  return Object.fromEntries([...totals].map(([label, { sum, count }]) => [label, Math.round(sum / count)]));
}
