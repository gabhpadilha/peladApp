/**
 * Gols confirmados pelos colegas (design em docs/superpowers/specs/2026-11-01-gols-confirmados-design.md).
 * As regras moram no banco (`report_goals`, `confirm_goals`, `unlock_ratings`, `ratings_open`);
 * as constantes daqui espelham o banco: mudou um, mude o outro.
 */

/** Quantos "sim" de outros presentes confirmam os gols (não importa quantos "não"). */
export const GOALS_MIN_CONFIRMATIONS = 3;
/** Limite de bom senso por rodada. */
export const GOALS_MAX = 15;

export type MatchGoal = {
  matchId: string;
  memberId: string;
  /** O que foi informado (0 a 15). */
  goals: number;
  /** Quem informou: o próprio jogador ou um organizador (por quem não informou). */
  reportedBy: string;
  yes: number;
  no: number;
  /** Um organizador confirmou sozinho (vale como os 3 "sim"; 2026-11-13, pedido do dono do app). */
  organizerConfirmed: boolean;
  /** 3 "sim" ou mais, ou a confirmação de um organizador: entra na estatística, na bolinha da carta e no Goleador. */
  isConfirmed: boolean;
};

export function isGoalConfirmed(goal: Pick<MatchGoal, "goals" | "yes" | "organizerConfirmed">): boolean {
  return goal.goals > 0 && (goal.organizerConfirmed || goal.yes >= GOALS_MIN_CONFIRMATIONS);
}

/** Estado da etapa dos gols numa rodada aberta, do ponto de vista de quem está logado. */
export type RoundGoalsState = {
  /** Gols informados de cada presente (quem não informou não aparece). */
  byMember: Record<string, MatchGoal>;
  /** Quem está logado já confirmou (true) ou negou (false) os gols de cada um. */
  myVotes: Record<string, boolean>;
  /** Presentes que ainda não informaram. */
  missingIds: string[];
  /** Presentes que informaram mas ainda não concluíram a conferência dos gols dos colegas. */
  pendingCheckIds: string[];
  /** Quem está logado já concluiu a conferência. */
  myChecked: boolean;
  /** Notas liberadas: todos informaram e conferiram (etapa dos gols fechada) ou o organizador liberou. */
  ratingsOpen: boolean;
};

/** Gols dos colegas que quem está logado pode conferir (1 gol ou mais, informados por outra pessoa). */
export function goalsToCheck(state: RoundGoalsState, memberId: string): MatchGoal[] {
  return Object.values(state.byMember).filter(
    (goal) => goal.goals > 0 && goal.memberId !== memberId && goal.reportedBy !== memberId,
  );
}

