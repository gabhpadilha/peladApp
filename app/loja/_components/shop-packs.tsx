"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CoinsIcon, GiftIcon } from "lucide-react";
import { formatCoins } from "@/components/coin-pill";
import { PackCover } from "@/components/pack-cover";
import { PackOpener } from "@/components/pack-opener";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PACK_RARITY_NAMES, PACK_RARITY_ORDER, PACK_TIER_NAMES, type PackTier } from "@/lib/packs";
import { buyShopPack, type BoughtPack } from "../_actions/buy-shop-pack";
import type { ShopPack, ShopPacks } from "../_data-access/get-shop";

/** Descrição curta de cada faixa (o que muda é a chance das raridades). */
const TIER_TEXT: Record<PackTier, string> = {
  A: "As melhores chances de skin rara, épica e lendária.",
  B: "Boas chances de épica e lendária.",
  C: "Chance equilibrada, com bastante rara.",
  D: "O mais barato: skin comum na maioria das vezes.",
};

function Price({ item }: { item: ShopPack }) {
  return (
    <>
      {item.originalPrice !== null && <span className="text-sm line-through opacity-60">{formatCoins(item.originalPrice)}</span>}
      <span className="font-semibold">{formatCoins(item.price)}</span>
    </>
  );
}

/** Pacotes do mês à venda: a Loja vende pacotes (sorteio de skin do conjunto do mês) no lugar das skins de evento. */
export function ShopPacksSection({ packs, balance }: { packs: ShopPacks; balance: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ShopPack | null>(null);
  const [bought, setBought] = useState<BoughtPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBuy(item: ShopPack) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await buyShopPack({ tier: item.tier });
        if (result.success) {
          setSelected(null);
          setBought(result.pack);
        } else {
          setError(result.message);
          router.refresh();
        }
      } catch {
        setError("Não foi possível falar com o servidor. Confira a conexão.");
      }
    });
  }

  return (
    <section aria-label="Pacotes" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-wide uppercase">
          <GiftIcon aria-hidden className="size-5 text-amber-300" />
          Pacotes{packs.eventLabel ? ` · ${packs.eventLabel}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground">
          Cada pacote traz 1 skin do conjunto do mês, sorteada. Quanto mais caro, melhores as chances. As skins do evento só saem em pacote.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {packs.items.map((item) => {
          const isShort = balance < item.price;
          return (
            <li key={item.tier} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3">
              <PackCover tier={item.tier} month={packs.month} className="w-3/4" />
              {isShort ? (
                <div className="flex w-full flex-col items-center gap-1">
                  <Button type="button" variant="secondary" className="h-10 w-full gap-1.5" disabled>
                    <CoinsIcon aria-hidden className="size-4" />
                    <Price item={item} />
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Faltam {formatCoins(item.price - balance)} CC</p>
                </div>
              ) : (
                <Button type="button" className="h-10 w-full gap-1.5" disabled={isPending} onClick={() => { setError(null); setSelected(item); }}>
                  <CoinsIcon aria-hidden className="size-4" />
                  <Price item={item} />
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-y-auto rounded-t-2xl">
          {selected && (
            <>
              <SheetHeader className="items-center gap-1 pt-8 text-center">
                <PackCover tier={selected.tier} month={packs.month} className="mb-3 w-40" />
                <SheetTitle className="font-display text-3xl font-extrabold uppercase">{PACK_TIER_NAMES[selected.tier]}</SheetTitle>
                <SheetDescription>{TIER_TEXT[selected.tier]}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm">
                  <span className="text-xs tracking-wide text-muted-foreground uppercase">Chances de cada raridade</span>
                  {PACK_RARITY_ORDER.filter((rarity) => selected.odds[rarity] !== undefined).map((rarity) => (
                    <div key={rarity} className="flex items-center justify-between">
                      <span>{PACK_RARITY_NAMES[rarity]}</span>
                      <span className="font-display text-base font-bold tabular-nums">{String(selected.odds[rarity]).replace(".", ",")}%</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Seu saldo</span>
                  <span className="flex items-center gap-1.5 font-display text-base font-bold tabular-nums">
                    <CoinsIcon aria-hidden className="size-4 text-amber-300" />
                    {formatCoins(balance)} → {formatCoins(balance - selected.price)}
                  </span>
                </div>
                <Button type="button" size="lg" className="h-11 gap-2 text-base" disabled={isPending} onClick={() => handleBuy(selected)}>
                  <CoinsIcon aria-hidden className="size-5" />
                  {isPending ? "Comprando…" : `Comprar e abrir · ${formatCoins(selected.price)}${selected.originalPrice !== null ? ` (era ${formatCoins(selected.originalPrice)})` : ""}`}
                </Button>
                <Button type="button" variant="ghost" size="lg" className="h-11 text-base" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
                {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {error && selected === null && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {bought && <PackOpener packs={[{ ...bought }]} onClose={() => setBought(null)} />}
    </section>
  );
}
