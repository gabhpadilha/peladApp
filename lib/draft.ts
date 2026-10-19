/**
 * Sorteio da rodada (`draftMatch`): sempre 2 times de 5 (1 goleiro + 4 na
 * linha). Quem joga é sorteado de verdade (justo para todos); quem sobra vai
 * para o banco de reserva. Depois, os 2 times são equilibrados pelo OVR
 * (`draftTeams`): goleiros primeiro (um por time) e a linha do maior para o
 * menor OVR, sempre no time com menos jogadores e, no empate, menor soma.
 */

/** Futsal: 4 na linha + 1 goleiro. */
export const PLAYERS_PER_TEAM = 5;
/** A rodada sempre tem 2 times em quadra; o resto vai para o banco. */
export const MATCH_TEAMS = 2;
const GOALKEEPERS_ON_COURT = MATCH_TEAMS;
const PLAYERS_ON_COURT = MATCH_TEAMS * PLAYERS_PER_TEAM;
/** Número de "time" do banco de reserva no formulário (no banco vira sem time). */
export const BENCH_TEAM = 0;
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

export type MatchDraft = {
  /** Sempre 2 times. */
  teams: DraftTeam[];
  /** Quem ficou de fora no sorteio (banco de reserva). */
  benchIds: string[];
};

/**
 * 2 times de 5 + banco. Sorteia 2 goleiros (os outros vão para a disputa da
 * linha) e completa as 10 vagas sorteando a linha; quem sobra fica no banco.
 * Faltou goleiro: um jogador de linha completa o time ("rodízio no gol").
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
  const bench = linePool.slice(lineOnCourt.length);

  return {
    teams: draftTeams([...goalkeepersOnCourt, ...lineOnCourt], MATCH_TEAMS, random),
    benchIds: bench.map((player) => player.id),
  };
}
