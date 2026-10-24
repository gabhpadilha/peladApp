import { CoinsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const coinsFormatter = new Intl.NumberFormat("pt-BR");

export function formatCoins(value: number): string {
  return coinsFormatter.format(value);
}

/** Saldo de CanchaCoins (CC). */
export function CoinPill({ value, className }: { value: number; className?: string }) {
  return (
    <span
      aria-label={`${formatCoins(value)} CanchaCoins`}
      className={cn("inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5", className)}
    >
      <CoinsIcon aria-hidden className="size-4 text-amber-300" />
      <span className="font-display text-lg leading-none font-bold text-amber-200 tabular-nums">{formatCoins(value)}</span>
      <span className="text-xs text-amber-200/70">CC</span>
    </span>
  );
}
