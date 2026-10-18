/** Faixas da carta base (desempenho contínuo), pelo OVR. */
export type CardTier = "bronze" | "silver" | "gold" | "rare";

/** OVR mínimo de cada faixa. Calibrar quando houver dados reais. */
export const CARD_TIER_MIN_OVR = {
  silver: 65,
  gold: 75,
  rare: 85,
} as const;

export const CARD_TIER_LABELS: Record<CardTier, string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
  rare: "Ouro Raro",
};

export function getCardTier(ovr: number): CardTier {
  if (ovr >= CARD_TIER_MIN_OVR.rare) return "rare";
  if (ovr >= CARD_TIER_MIN_OVR.gold) return "gold";
  if (ovr >= CARD_TIER_MIN_OVR.silver) return "silver";
  return "bronze";
}
