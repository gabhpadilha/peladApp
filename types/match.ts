import type { PlayerAttribute } from "@/types/player";

/**
 * `open`: notas ainda chegando; não entram no OVR.
 * `closed`: rodada fechada; as notas contam no OVR.
 */
export type MatchStatus = "open" | "closed";

/** Rodada. Sem placar: os times revezam e o resultado fica no WhatsApp. */
export type Match = {
  id: string;
  round: number;
  /** Data do jogo, `AAAA-MM-DD`. */
  date: string;
  status: MatchStatus;
  /** Ids de membro (`group_members.id`) de quem jogou. */
  presentPlayerIds: string[];
};

/** Nota inteira de 1 a 10 dada a um atributo. */
export type Score = number;

/**
 * Notas que um jogador deu a outro numa partida. `evaluatorId` só vem
 * preenchido nas notas que o próprio usuário deu (as demais são anônimas).
 */
export type Evaluation = {
  id: string;
  matchId: string;
  evaluatorId: string;
  playerId: string;
  scores: Partial<Record<PlayerAttribute, Score>>;
};
