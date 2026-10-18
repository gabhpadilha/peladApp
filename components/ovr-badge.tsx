import { cn } from "@/lib/utils";
import { CARD_TIER_LABELS, getCardTier, type CardTier } from "@/lib/card-tier";

const BADGE_BY_TIER: Record<CardTier, string> = {
  bronze: "bg-rarity-bronze-frame text-rarity-bronze-foreground",
  silver: "bg-rarity-silver-frame text-rarity-silver-foreground",
  gold: "bg-rarity-gold-frame text-rarity-gold-foreground",
  special: "bg-rarity-special-to text-rarity-special-foreground ring-1 ring-rarity-special-frame",
  mvp: "bg-rarity-mvp-to text-rarity-mvp-foreground ring-1 ring-rarity-mvp-frame",
};

type OvrBadgeProps = {
  ovr: number | null;
  isMvp?: boolean;
  className?: string;
};

/** OVR compacto na cor da faixa da carta, para listas e cabeçalho. */
export function OvrBadge({ ovr, isMvp = false, className }: OvrBadgeProps) {
  const tier = getCardTier(ovr ?? 0, isMvp);

  return (
    <span
      title={`Carta ${CARD_TIER_LABELS[tier]}`}
      className={cn(
        "inline-flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 font-display text-base font-extrabold tabular-nums",
        BADGE_BY_TIER[tier],
        className,
      )}
    >
      {ovr ?? "–"}
    </span>
  );
}
