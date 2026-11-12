"use client";

import Link from "next/link";
import { RarityLabel } from "@/components/rarity-label";
import { ShowcaseCard } from "@/components/showcase-card";
import { Button } from "@/components/ui/button";
import { PACK_RARITY_ORDER, type PackRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";
import { getCardSkin, type CardSkinKey } from "@/types/card-skin";

export type PackContentItem = { skin: CardSkinKey; rarity: PackRarity; wasDuplicate: boolean };

type PackContentsProps = {
  items: readonly PackContentItem[];
  /** Ex.: "Campeão de novembro" ou "2º lugar de novembro". */
  subtitle: string;
  onClose: () => void;
};

/** Da mais rara para a mais comum (lendária primeiro). */
function byRarity(a: PackContentItem, b: PackContentItem) {
  return PACK_RARITY_ORDER.indexOf(b.rarity) - PACK_RARITY_ORDER.indexOf(a.rarity);
}

/**
 * Tela "O que veio no pacote" dos pacotes de prêmio do mês (pedido do dono do app em 2026-11-12): depois da animação, que mostra
 * a skin mais rara, aparecem todas as skins do pacote lado a lado, da mais rara para a mais comum. Skin que o jogador já tinha
 * vira cópia extra (vender no Mercado ou na venda rápida). Pacote de 4: grade 2 × 2; de 3: uma linha.
 */
export function PackContents({ items, subtitle, onClose }: PackContentsProps) {
  const sorted = items.toSorted(byRarity);
  const isGrid = sorted.length === 4;

  return (
    <div className="flex min-h-full flex-col items-center gap-6 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] text-white">
      <header className="flex flex-col items-center gap-1 text-center animate-in fade-in">
        <span className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Prêmio do mês · {subtitle}</span>
        <h2 className="font-display text-3xl font-extrabold uppercase">O que veio no pacote</h2>
        <p className="text-sm text-white/70">{sorted.length} skins diferentes</p>
      </header>

      <ol className={cn("grid w-full max-w-sm gap-x-3 gap-y-4", isGrid ? "max-w-[17rem] grid-cols-2" : "grid-cols-3")}>
        {sorted.map((item) => (
          <li key={item.skin} className="flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ShowcaseCard skin={item.skin} />
            <span className="mt-1 text-center font-display text-base leading-tight font-bold">{getCardSkin(item.skin).name}</span>
            <RarityLabel rarity={item.rarity} />
            {item.wasDuplicate ? (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">Repetida</span>
            ) : (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Nova</span>
            )}
          </li>
        ))}
      </ol>

      {sorted.some((item) => item.wasDuplicate) && (
        <p className="max-w-xs text-center text-xs text-white/70">
          As repetidas ficam em Minhas cartas: dá para vender no Mercado ou na venda rápida.
        </p>
      )}

      <div className="mt-auto flex w-full max-w-xs flex-col items-center gap-2">
        <Button size="lg" className="h-12 w-full text-base" onClick={onClose}>
          Fechar
        </Button>
        <Link href="/eu#minhas-cartas" onClick={onClose} className="flex h-11 items-center text-sm text-white/70 underline-offset-4 hover:underline">
          Ver em Minhas cartas
        </Link>
      </div>
    </div>
  );
}
