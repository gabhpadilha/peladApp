import { cn } from "@/lib/utils";
import { CARD_TIER_LABELS, getCardTier, type CardTier } from "@/lib/card-tier";

const BADGE_BY_TIER: Record<CardTier, string> = {
  bronze: "bg-rarity-bronze-frame text-rarity-bronze-foreground",
  silver: "bg-rarity-silver-frame text-rarity-silver-foreground",
  gold: "bg-rarity-gold-frame text-rarity-gold-foreground",
  rare: "bg-linear-to-br from-rarity-rare-from to-rarity-rare-to text-rarity-rare-foreground ring-1 ring-rarity-rare-frame",
};

type OvrBadgeProps = {
  ovr: number | null;
  className?: string;
};

/** OVR compacto na cor da faixa da carta base, para listas e cabeçalho. */
export function OvrBadge({ ovr, className }: OvrBadgeProps) {
  const tier = getCardTier(ovr ?? 0);

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
