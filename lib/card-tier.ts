export type CardTier = "bronze" | "silver" | "gold" | "special" | "mvp";

/** OVR mínimo de cada faixa. Calibrar quando houver dados reais. */
export const CARD_TIER_MIN_OVR = {
  silver: 65,
  gold: 75,
  special: 85,
} as const;

export const CARD_TIER_LABELS: Record<CardTier, string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
  special: "Especial",
  mvp: "Craque da Rodada",
};

/** Faixa da carta pelo OVR; o Craque da Rodada sobrepõe a faixa. */
export function getCardTier(ovr: number, isMvp = false): CardTier {
  if (isMvp) return "mvp";
  if (ovr >= CARD_TIER_MIN_OVR.special) return "special";
  if (ovr >= CARD_TIER_MIN_OVR.gold) return "gold";
  if (ovr >= CARD_TIER_MIN_OVR.silver) return "silver";
  return "bronze";
}
