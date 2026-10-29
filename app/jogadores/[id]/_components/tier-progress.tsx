import { CARD_TIER_LABELS, getTierProgress } from "@/lib/card-tier";
import { cn } from "@/lib/utils";

const TIER_BAR: Record<keyof typeof CARD_TIER_LABELS, string> = {
  bronze: "bg-rarity-bronze-frame",
  silver: "bg-rarity-silver-frame",
  gold: "bg-rarity-gold-frame",
  rare: "bg-rarity-rare-frame",
};

type TierProgressProps = {
  ovr: number;
};

/** Quanto falta para a carta subir de faixa (a cor da barra é a da faixa atual). */
export function TierProgress({ ovr }: TierProgressProps) {
  const progress = getTierProgress(ovr);

  return (
    <section aria-labelledby="tier-progress-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="tier-progress-title" className="font-display text-lg font-bold tracking-wide uppercase">
          {progress.next ? "Próxima patente" : "Patente máxima"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {progress.next ? (
            <>
              faltam <span className="font-display text-lg font-bold text-foreground tabular-nums">{progress.next.missing}</span>{" "}
              de OVR
            </>
          ) : (
            "você chegou no topo"
          )}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label={
          progress.next
            ? `${CARD_TIER_LABELS[progress.tier]} para ${CARD_TIER_LABELS[progress.next.tier]}`
            : CARD_TIER_LABELS[progress.tier]
        }
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-3 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", TIER_BAR[progress.tier])}
          // Largura vem do dado.
          style={{ width: `${Math.max(progress.percent, 4)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {CARD_TIER_LABELS[progress.tier]} · OVR <span className="tabular-nums">{ovr}</span>
        </span>
        {progress.next && (
          <span>
            {CARD_TIER_LABELS[progress.next.tier]} · <span className="tabular-nums">{progress.next.minOvr}</span>
          </span>
        )}
      </div>
    </section>
  );
}
