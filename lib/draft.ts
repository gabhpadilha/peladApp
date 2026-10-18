/**
 * Sorteio equilibrado dos times pelo OVR.
 * Goleiros vão primeiro (um por time); a linha entra do maior para o menor
 * OVR, sempre no time com menos jogadores e, no empate, com menor soma.
 */

/** Futsal: 4 na linha + 1 goleiro. */
export const PLAYERS_PER_TEAM = 5;
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 12;
/** OVR assumido para quem ainda não tem nota e não há média para usar. */
const UNRATED_FALLBACK_OVR = 50;
/** Variação aleatória (±metade) para cada novo sorteio sair diferente. */
const SHUFFLE_SPREAD = 6;

export type DraftPlayer = {
  id: string;
  role: "outfield" | "goalkeeper";
  ovr: number | null;
};

export type DraftTeam = {
  /** 1, 2, 3… */
  number: number;
  playerIds: string[];
  /** Soma dos OVRs usados no sorteio (sem a variação aleatória). */
  totalOvr: number;
  hasGoalkeeper: boolean;
};

/** Quantos times fazem sentido para N confirmados (mínimo 2). */
export function getDefaultTeamCount(playerCount: number): number {
  const byTeamSize = Math.round(playerCount / PLAYERS_PER_TEAM);
  return Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, byTeamSize));
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function draftTeams(
  players: readonly DraftPlayer[],
  teamCount: number,
  random: () => number = Math.random,
): DraftTeam[] {
  const count = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.floor(teamCount)));
  const knownOvrs = players.flatMap((player) => (player.ovr === null ? [] : [player.ovr]));
  const fallbackOvr = Math.round(average(knownOvrs) ?? UNRATED_FALLBACK_OVR);

  const rated = players.map((player) => {
    const ovr = player.ovr ?? fallbackOvr;
    return { ...player, ovr, sortKey: ovr + (random() - 0.5) * SHUFFLE_SPREAD };
  });
  const bySortKey = (a: { sortKey: number }, b: { sortKey: number }) => b.sortKey - a.sortKey;

  const teams = Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    playerIds: [] as string[],
    totalOvr: 0,
    hasGoalkeeper: false,
  }));

  // Um goleiro por time; goleiros a mais jogam na linha.
  const goalkeepers = rated.filter((player) => player.role === "goalkeeper").toSorted(bySortKey);
  const teamsForGoalkeepers = goalkeepers.slice(0, count);
  teamsForGoalkeepers.forEach((goalkeeper, index) => {
    // O melhor goleiro vai para o último time, que recebe a linha por último.
    const team = teams[count - 1 - index];
    team.playerIds.push(goalkeeper.id);
    team.totalOvr += goalkeeper.ovr;
    team.hasGoalkeeper = true;
  });

  const linePlayers = [
    ...rated.filter((player) => player.role === "outfield"),
    ...goalkeepers.slice(count),
  ].toSorted(bySortKey);

  for (const player of linePlayers) {
    const target = teams.reduce((best, team) => {
      if (team.playerIds.length !== best.playerIds.length) {
        return team.playerIds.length < best.playerIds.length ? team : best;
      }
      return team.totalOvr < best.totalOvr ? team : best;
    });
    target.playerIds.push(player.id);
    target.totalOvr += player.ovr;
  }

  return teams;
}
