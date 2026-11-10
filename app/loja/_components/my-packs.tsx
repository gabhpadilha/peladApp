"use client";

import { useState } from "react";
import { GiftIcon } from "lucide-react";
import { PackCover } from "@/components/pack-cover";
import { PackOpener } from "@/components/pack-opener";
import { Button } from "@/components/ui/button";
import { PACK_TIER_NAMES, type MyPack } from "@/lib/packs";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** Quantos pacotes aparecem antes do "Mostrar todos": a lista não toma a tela com muitos guardados. */
const VISIBLE_PACKS = 3;

/** `2026-12` → "dez". */
function monthName(month: string): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month;
}

/** Pacotes guardados (ainda lacrados), em linhas compactas: abrir um ou todos em sequência. Some quando não há nenhum. */
export function MyPacks({ packs }: { packs: readonly MyPack[] }) {
  const [opening, setOpening] = useState<readonly MyPack[] | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const sealed = packs.filter((pack) => pack.openedAt === null);
  if (sealed.length === 0 && opening === null) return null;
  const shown = isExpanded ? sealed : sealed.slice(0, VISIBLE_PACKS);

  return (
    <section aria-labelledby="meus-pacotes" className="flex flex-col gap-2 rounded-xl border border-amber-300/30 bg-card p-3">
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
      <ul className="flex flex-col divide-y">
        {shown.map((pack) => (
          <li key={pack.id} className="py-2">
            <div className="flex items-center gap-3">
              <PackCover tier={pack.tier} month={pack.month} className="h-11 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-base leading-tight font-bold tracking-wide uppercase">{PACK_TIER_NAMES[pack.tier]}</span>
                <span className="text-xs text-muted-foreground">{pack.source === "goal" ? `Objetivo cumprido · ${monthName(pack.month)}` : pack.source === "shop" ? `Comprado na Loja · ${monthName(pack.month)}` : pack.source === "gift" ? "Presente de boas-vindas" : `Rodada ${pack.round} · ${monthName(pack.month)}`}</span>
              </div>
              <Button size="sm" onClick={() => setOpening([pack])}>
                Abrir
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {sealed.length > VISIBLE_PACKS && (
        <Button variant="ghost" className="h-11 w-full text-sm" onClick={() => setIsExpanded((value) => !value)}>
          {isExpanded ? "Mostrar menos" : `Mostrar todos (${sealed.length})`}
        </Button>
      )}
      {opening && <PackOpener packs={opening} onClose={() => setOpening(null)} />}
    </section>
  );
}
