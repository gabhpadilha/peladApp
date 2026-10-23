import { averageEvaluations, computeAttributes, computeOvr } from "@/lib/ovr";
import { isOvrEvaluation, type Evaluation, type Match } from "@/types/match";
import {
  GOALKEEPER_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  type Player,
  type PlayerProfile,
} from "@/types/player";

export type MatchPerformance = {
  match: Match;
  wasPresent: boolean;
  /** Média das notas recebidas na rodada, escala 0–99; `null` se ausente ou sem notas. */
  score: number | null;
  evaluationCount: number;
  /** Jogou fora da posição do cadastro ("Jogou no gol"): a nota não entrou no OVR. */
  offPosition: boolean;
};

export type PendingEvaluation = {
  match: Match;
  playersToRate: number;
};

/** Chave "rodada:jogador" das notas que o logado já deu. */
export function ratedKey(matchId: string, playerId: string): string {
  return `${matchId}:${playerId}`;
}

export function getClosedMatches(matches: readonly Match[]): Match[] {
  return matches
    .filter((match) => match.status === "closed")
    .toSorted((a, b) => a.round - b.round);
}

export function getLatestClosedMatch(matches: readonly Match[]): Match | null {
  return getClosedMatches(matches).at(-1) ?? null;
}

function buildPlayer(profile: PlayerProfile, evaluations: readonly Evaluation[]): Player {
  const ovr = computeOvr(evaluations);
  if (profile.role === "goalkeeper") {
    return { ...profile, ovr, attributes: computeAttributes(evaluations, GOALKEEPER_ATTRIBUTES) };
  }
  return { ...profile, ovr, attributes: computeAttributes(evaluations, OUTFIELD_ATTRIBUTES) };
}

/**
 * Calcula OVR e atributos de cada jogador com as avaliações das rodadas fechadas.
 * `upToRound` limita o histórico (ex.: rodada anterior, para medir a variação do OVR).
 */
export function buildPlayers(
  profiles: readonly PlayerProfile[],
  matches: readonly Match[],
  evaluations: readonly Evaluation[],
  { upToRound }: { upToRound?: number } = {},
): Player[] {
  const countedMatchIds = new Set(
    getClosedMatches(matches)
      .filter((match) => upToRound === undefined || match.round <= upToRound)
      .map((match) => match.id),
  );
  // Performance: agrupa as notas por jogador numa passada só. Antes, cada perfil
  // filtrava a lista inteira (O(jogadores × notas)); agora é O(jogadores + notas).
  // A ordem das notas de cada um é a mesma, então médias e arredondamentos não mudam.
  const receivedByPlayer = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    if (!countedMatchIds.has(evaluation.matchId) || !isOvrEvaluation(evaluation)) continue;
    const received = receivedByPlayer.get(evaluation.playerId);
    if (received) received.push(evaluation);
    else receivedByPlayer.set(evaluation.playerId, [evaluation]);
  }

  return profiles.map((profile) => buildPlayer(profile, receivedByPlayer.get(profile.id) ?? []));
}

/** Variação do OVR causada pela última rodada fechada. */
export function getOvrDelta(current: Player, previous: Player | undefined): number | null {
  if (current.ovr === null || previous?.ovr == null) return null;
  return current.ovr - previous.ovr;
}

export function getMatchPerformances(
  playerId: string,
  matches: readonly Match[],
  evaluations: readonly Evaluation[],
): MatchPerformance[] {
  // Performance: notas do jogador agrupadas por rodada numa passada só, em vez de
  // filtrar a lista inteira a cada rodada (O(rodadas × notas) → O(rodadas + notas)).
  const receivedByMatch = new Map<string, Evaluation[]>();
  for (const evaluation of evaluations) {
    if (evaluation.playerId !== playerId) continue;
    const received = receivedByMatch.get(evaluation.matchId);
    if (received) received.push(evaluation);
    else receivedByMatch.set(evaluation.matchId, [evaluation]);
  }

  return getClosedMatches(matches).map((match) => {
    const received = receivedByMatch.get(match.id) ?? [];
    return {
      match,
      wasPresent: match.presentPlayerIds.includes(playerId),
      score: averageEvaluations(received),
      evaluationCount: received.length,
      offPosition: received.some((evaluation) => evaluation.offPosition),
    };
  });
}

/**
 * Rodadas abertas em que o jogador esteve presente e ainda falta dar nota para
 * alguém: nunca enviou, ou o organizador trocou a posição de quem ele já tinha
 * avaliado (a nota no tipo errado sai e volta a faltar).
 */
export function getPendingEvaluations(
  playerId: string,
  matches: readonly Match[],
  givenEvaluations: readonly Evaluation[],
): PendingEvaluation[] {
  const given = new Set(
    givenEvaluations
      .filter((evaluation) => evaluation.evaluatorId === playerId)
      .map((evaluation) => ratedKey(evaluation.matchId, evaluation.playerId)),
  );
  return matches
    .filter((match) => match.status === "open" && match.presentPlayerIds.includes(playerId))
    .map((match) => ({
      match,
      playersToRate: match.presentPlayerIds.filter((id) => id !== playerId && !given.has(ratedKey(match.id, id))).length,
    }))
    .filter((pending) => pending.playersToRate > 0);
}

/** Quantos presentes já enviaram notas numa rodada. */
export function getSubmissionProgress(match: Match, evaluations: readonly Evaluation[]) {
  const evaluatorIds = new Set(
    evaluations
      .filter((evaluation) => evaluation.matchId === match.id)
      .map((evaluation) => evaluation.evaluatorId),
  );
  return { submitted: evaluatorIds.size, expected: match.presentPlayerIds.length };
}

/**
 * Ranking por OVR de um papel. Goleiro e linha nunca são comparados entre si.
 * Não avaliados ficam por último.
 */
export function rankPlayers(players: readonly Player[], role: Player["role"]): Player[] {
  return players
    .filter((player) => player.role === role)
    .toSorted((a, b) => (b.ovr ?? -1) - (a.ovr ?? -1));
}
