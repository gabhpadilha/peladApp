import type { CardThemeKey } from "@/lib/card-themes";
import type { Player } from "@/types/player";

export const AWARD_KINDS = ["craque", "gol", "bola_murcha"] as const;
export type AwardKind = (typeof AWARD_KINDS)[number];

export const AWARD_LABELS: Record<AwardKind, { title: string; question: string; hint: string }> = {
  craque: {
    title: "Craque da Rodada",
    question: "Quem foi o craque da rodada?",
    hint: "O melhor em campo. A carta vem com +1 em cada atributo.",
  },
  gol: {
    title: "Gol da Semana",
    question: "Quem fez o gol mais bonito?",
    hint: "O golaço da rodada. A carta vem com +1 em cada atributo.",
  },
  bola_murcha: {
    title: "Bola Murcha",
    question: "Quem foi a bola murcha?",
    hint: "Aquele que não estava nos seus dias. Vale a zoeira.",
  },
};

/**
 * Carta especial colecionável: foto congelada do jogador no dia do prêmio.
 * `card` traz OVR/atributos da carta (com o bônus) e o apelido/foto atuais.
 */
export type Award = {
  id: string;
  kind: AwardKind;
  theme: CardThemeKey;
  votes: number;
  matchId: string;
  round: number;
  /** Data do jogo, `AAAA-MM-DD`. */
  date: string;
  memberId: string;
  card: Player;
};
