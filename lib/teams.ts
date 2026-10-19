/** Os dois times de toda rodada: o número gravado no banco e como aparece. */
export const TEAM_NAMES: Readonly<Record<number, string>> = { 1: "Branco", 2: "Preto" };

/** "Branco" / "Preto" (ou "Time N" se algum dia houver mais times). */
export function teamName(team: number): string {
  return TEAM_NAMES[team] ?? `Time ${team}`;
}

/** Rótulo curto de quem jogou: "Branco", "Preto · reserva". */
export function teamRoleLabel(team: number | null, isReserve: boolean): string {
  if (team === null) return "";
  return isReserve ? `${teamName(team)} · reserva` : teamName(team);
}
