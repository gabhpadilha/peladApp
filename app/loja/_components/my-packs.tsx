"use client";

import { useState } from "react";
import { GiftIcon } from "lucide-react";
import { PackOpener } from "@/components/pack-opener";
import { Button } from "@/components/ui/button";
import { PACK_RARITY_NAMES, PACK_RARITY_ORDER, PACK_TIER_NAMES, type MyPack } from "@/lib/packs";

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** `2026-12` → "dezembro". */
function monthName(month: string): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month;
}

function oddsText(odds: MyPack["odds"]): string {
  return PACK_RARITY_ORDER.filter((rarity) => odds[rarity] !== undefined)
    .map((rarity) => `${PACK_RARITY_NAMES[rarity]} ${String(odds[rarity]).replace(".", ",")}%`)
    .join(" · ");
}

/** Pacotes guardados (ainda lacrados): abrir um ou todos em sequência. Some quando não há nenhum. */
export function MyPacks({ packs }: { packs: readonly MyPack[] }) {
  const [opening, setOpening] = useState<readonly MyPack[] | null>(null);
  const sealed = packs.filter((pack) => pack.openedAt === null);
  if (sealed.length === 0 && opening === null) return null;

  return (
    <section aria-labelledby="meus-pacotes" className="flex flex-col gap-3 rounded-xl border border-amber-300/30 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="meus-pacotes" className="flex items-center gap-2 font-display text-lg font-bold tracking-wide uppercase">
          <GiftIcon aria-hidden className="size-5 text-amber-300" />
          Meus pacotes · {sealed.length}
        </h2>
        {sealed.length > 1 && (
          <Button size="sm" onClick={() => setOpening(sealed)}>
            Abrir todos
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Cada rodada que você joga dá um pacote com uma skin de carta. Eles não vencem: abra quando quiser.</p>
      <ul className="flex flex-col gap-2">
        {sealed.map((pack) => (
          <li key={pack.id} className="flex items-center gap-3 rounded-lg border bg-background/60 p-3">
            <div aria-hidden className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md border border-primary/45 bg-gradient-to-b from-[#1d2c24] to-[#0e1712] font-display text-xs font-extrabold text-primary">
              R{pack.round}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-display text-base font-bold tracking-wide uppercase">{PACK_TIER_NAMES[pack.tier]}</span>
              <span className="text-xs text-muted-foreground">Rodada {pack.round} · skins de {monthName(pack.month)}</span>
              <span className="text-xs text-muted-foreground">{oddsText(pack.odds)}</span>
            </div>
            <Button size="sm" onClick={() => setOpening([pack])}>
              Abrir
            </Button>
          </li>
        ))}
      </ul>
      {opening && <PackOpener packs={opening} onClose={() => setOpening(null)} />}
    </section>
  );
}
