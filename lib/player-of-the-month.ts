/** Quinta-feira em `Date.getUTCDay()`. */
const THURSDAY = 4;

function lastThursdayOfMonth(year: number, monthIndex: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const back = (lastDay.getUTCDay() - THURSDAY + 7) % 7;
  return new Date(Date.UTC(year, monthIndex, lastDay.getUTCDate() - back));
}

/**
 * Dia (`AAAA-MM-DD`) em que sai a próxima carta Jogador do Mês: a última
 * quinta-feira do mês de `today` ou, se ela já passou, a do mês seguinte.
 * Espelha a regra de `compute_match_awards` (a carta sai ao fechar a rodada desse dia).
 */
export function getNextPlayerOfTheMonthDate(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  let target = lastThursdayOfMonth(date.getUTCFullYear(), date.getUTCMonth());
  if (target < date) target = lastThursdayOfMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
  return target.toISOString().slice(0, 10);
}
