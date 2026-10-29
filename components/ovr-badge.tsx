import { cn } from "@/lib/utils";
import { CARD_RANK_LABELS, getCardRank, RANK_FLAT_CLASSES } from "@/lib/card-rank";

type OvrBadgeProps = {
  ovr: number | null;
  className?: string;
};

/** OVR compacto na cor da patente (a mesma do selo da carta), para listas e cabeçalho. */
export function OvrBadge({ ovr, className }: OvrBadgeProps) {
  const rank = getCardRank(ovr);

  return (
    <span
      title={`Patente ${CARD_RANK_LABELS[rank]}`}
      className={cn(
        "inline-flex h-7 min-w-9 items-center justify-center rounded-md px-1.5 font-display text-base font-extrabold tabular-nums",
        RANK_FLAT_CLASSES[rank],
        className,
      )}
    >
      {ovr ?? "–"}
    </span>
  );
}
