import { getCardTier, type CardTier } from "@/lib/card-tier";

/**
 * Patentes da carta, no lugar de Bronze/Prata/Ouro (decisão do dono do app em
 * 2026-10-28). Usam os mesmos cortes de OVR das faixas (`CARD_TIER_MIN_OVR`),
 * mais a Peneira para quem ainda não tem OVR.
 */
export type CardRank = "peneira" | "base" | "profissional" | "selecao" | "lenda";

const RANK_BY_TIER: Record<CardTier, CardRank> = {
  bronze: "base",
  silver: "profissional",
  gold: "selecao",
  rare: "lenda",
};

export const CARD_RANK_LABELS: Record<CardRank, string> = {
  peneira: "Peneira",
  base: "Base",
  profissional: "Profissional",
  selecao: "Seleção",
  lenda: "Lenda",
};

export function getCardRank(ovr: number | null): CardRank {
  return ovr === null ? "peneira" : RANK_BY_TIER[getCardTier(ovr)];
}

/**
 * Cor lisa de cada patente: o selo da carta padrão (fosca) e o OVR nas listas usam a
 * mesma, para a carta e o resto do app falarem a mesma língua.
 */
export const RANK_FLAT_CLASSES: Record<CardRank, string> = {
  peneira: "bg-[#c9cec9] text-[#0b130f]",
  base: "bg-[#9ccbad] text-[#0b130f]",
  profissional: "bg-[#cfe58a] text-[#0b130f]",
  selecao: "bg-[#dcc074] text-[#0b130f]",
  lenda: "bg-[#d9cbe8] text-[#0b130f]",
};
