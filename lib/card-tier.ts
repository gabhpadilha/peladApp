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

const TIER_ORDER: readonly CardTier[] = ["bronze", "silver", "gold", "rare"];
const TIER_MIN: Record<CardTier, number> = { bronze: 0, ...CARD_TIER_MIN_OVR };

export type TierProgress = {
  tier: CardTier;
  /** Próxima faixa; `null` = já está na mais alta. */
  next: { tier: CardTier; minOvr: number; missing: number } | null;
  /** 0–100: quanto já andou da faixa atual até a próxima. */
  percent: number;
};

/** Onde o OVR está dentro da faixa e quanto falta para a próxima. */
export function getTierProgress(ovr: number): TierProgress {
  const tier = getCardTier(ovr);
  const nextTier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
  if (!nextTier) return { tier, next: null, percent: 100 };

  const start = TIER_MIN[tier];
  const end = TIER_MIN[nextTier];
  return {
    tier,
    next: { tier: nextTier, minOvr: end, missing: end - ovr },
    percent: Math.round(((ovr - start) / (end - start)) * 100),
  };
}

export function getCardTier(ovr: number): CardTier {
  if (ovr >= CARD_TIER_MIN_OVR.rare) return "rare";
  if (ovr >= CARD_TIER_MIN_OVR.gold) return "gold";
  if (ovr >= CARD_TIER_MIN_OVR.silver) return "silver";
  return "bronze";
}
