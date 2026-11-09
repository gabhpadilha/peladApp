import { DiamondIcon } from "lucide-react";
import { PACK_RARITY_NAMES, PACK_RARITY_ORDER, type PackRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";

/** Cor de cada raridade (mesma luz da abertura do pacote): comum cinza, rara azul, épica roxa, lendária dourada. */
const RARITY_STYLES: Record<PackRarity, string> = {
  comum: "border-zinc-400/40 bg-zinc-400/10 text-zinc-200",
  rara: "border-sky-400/50 bg-sky-400/10 text-sky-200",
  epica: "border-violet-400/55 bg-violet-400/10 text-violet-200",
  lendaria: "border-amber-300/60 bg-amber-300/10 text-amber-200",
};

/**
 * Legenda de raridade embaixo da carta (fora dela: a carta nunca muda). Além da cor, leva de 1 a 4 losangos acesos, para
 * não depender só da cor.
 */
export function RarityTag({ rarity, className }: { rarity: PackRarity; className?: string }) {
  const level = PACK_RARITY_ORDER.indexOf(rarity) + 1;
  return (
    <span
      className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold tracking-wide uppercase", RARITY_STYLES[rarity], className)}
    >
      <span aria-hidden className="flex gap-0.5">
        {PACK_RARITY_ORDER.map((item, index) => (
          <DiamondIcon key={item} className={cn("size-2.5", index < level ? "fill-current" : "opacity-30")} />
        ))}
      </span>
      {PACK_RARITY_NAMES[rarity]}
    </span>
  );
}
