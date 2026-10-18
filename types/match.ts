import type { PlayerAttribute } from "@/types/player";

/**
 * `open`: notas ainda chegando; não entram no OVR.
 * `closed`: rodada fechada; as notas contam no OVR.
 */
export type MatchStatus = "open" | "closed";

export type Match = {
  id: string;
  round: number;
  /** Data do jogo, `AAAA-MM-DD`. */
  date: string;
  status: MatchStatus;
  presentPlayerIds: string[];
  score: { teamA: number; teamB: number };
};

export type UpcomingMatch = {
  /** `AAAA-MM-DD`. */
  date: string;
  /** `HH:mm`. */
  time: string;
  venue: string;
  confirmedCount: number;
  capacity: number;
};

/** Nota inteira de 1 a 10 dada a um atributo. */
export type Score = number;

/** Notas que um jogador (`evaluatorId`) deu a outro (`playerId`) numa partida. */
export type Evaluation = {
  id: string;
  matchId: string;
  evaluatorId: string;
  playerId: string;
  scores: Partial<Record<PlayerAttribute, Score>>;
};
