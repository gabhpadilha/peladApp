/**
 * Sorteio da rodada (`draftMatch`): sempre 2 times, Branco (1) e Preto (2), com
 * 5 titulares cada (1 goleiro + 4 na linha). Quem é titular é sorteado de
 * verdade (justo para todos) e os dois times de titulares são equilibrados
 * pelo OVR (`draftTeams`): goleiros primeiro (um por time) e a linha do maior
 * para o menor OVR, sempre no time com menos jogadores e, no empate, menor
 * soma. O excedente vira reservas, divididos igualmente entre os dois times
 * (um a mais se for ímpar), também equilibrando o OVR.
 */

/** Futsal: 4 na linha + 1 goleiro. */
export const PLAYERS_PER_TEAM = 5;
/** A rodada sempre tem 2 times: Branco (1) e Preto (2). */
export const MATCH_TEAMS = 2;
const GOALKEEPERS_ON_COURT = MATCH_TEAMS;
const PLAYERS_ON_COURT = MATCH_TEAMS * PLAYERS_PER_TEAM;
/** Limites de `draftTeams` (o banco aceita até 12 times por rodada). */
const MIN_TEAMS = 2;
const MAX_TEAMS = 12;
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

/** Embaralha sem viés (Fisher–Yates). */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export type MatchTeam = DraftTeam & {
  /** Reservas do time (o excedente da rodada, dividido igualmente). */
  reserveIds: string[];
};

export type MatchDraft = {
  /** Sempre 2 times: `number` 1 = Branco, 2 = Preto. */
  teams: MatchTeam[];
};

/**
 * 2 times (Branco e Preto) com titulares e reservas. Sorteia 2 goleiros (os
 * outros disputam a linha) e completa as 10 vagas sorteando a linha; o
 * excedente vira reservas, repartidos entre os times pelo OVR (sempre no time
 * com menos reservas e, no empate, menor soma). Faltou goleiro: um jogador de
 * linha completa o time ("rodízio no gol").
 */
export function draftMatch(players: readonly DraftPlayer[], random: () => number = Math.random): MatchDraft {
  const goalkeepers = shuffle(
    players.filter((player) => player.role === "goalkeeper"),
    random,
  );
  const goalkeepersOnCourt = goalkeepers.slice(0, GOALKEEPERS_ON_COURT);
  const linePool = shuffle(
    [...players.filter((player) => player.role === "outfield"), ...goalkeepers.slice(GOALKEEPERS_ON_COURT)],
    random,
  );
  const lineOnCourt = linePool.slice(0, PLAYERS_ON_COURT - goalkeepersOnCourt.length);
  const surplus = linePool.slice(lineOnCourt.length);

  const starters = draftTeams([...goalkeepersOnCourt, ...lineOnCourt], MATCH_TEAMS, random);
  const teams: MatchTeam[] = starters.map((team) => ({ ...team, reserveIds: [] }));

  // Reservas: do maior para o menor OVR (com a mesma variação do sorteio), sempre
  // no time com menos reservas; no empate, no de menor soma (titulares + reservas).
  const knownOvrs = players.flatMap((player) => (player.ovr === null ? [] : [player.ovr]));
  const fallbackOvr = Math.round(average(knownOvrs) ?? UNRATED_FALLBACK_OVR);
  const ordered = surplus
    .map((player) => {
      const ovr = player.ovr ?? fallbackOvr;
      return { id: player.id, ovr, sortKey: ovr + (random() - 0.5) * SHUFFLE_SPREAD };
    })
    .toSorted((a, b) => b.sortKey - a.sortKey);
  const totals = teams.map((team) => team.totalOvr);
  for (const reserve of ordered) {
    const index = teams.reduce((best, team, current) => {
      if (team.reserveIds.length !== teams[best].reserveIds.length) {
        return team.reserveIds.length < teams[best].reserveIds.length ? current : best;
      }
      if (totals[current] !== totals[best]) return totals[current] < totals[best] ? current : best;
      return random() < 0.5 ? current : best;
    }, 0);
    teams[index].reserveIds.push(reserve.id);
    totals[index] += reserve.ovr;
  }

  return { teams };
}
