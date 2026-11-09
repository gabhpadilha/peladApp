"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckIcon, ClockIcon, StoreIcon, TagIcon, WalletCardsIcon } from "lucide-react";
import { cancelListing } from "@/app/_actions/market";
import type { MyCardMarket } from "@/app/eu/_data-access/get-me";
import { equipCardSkin } from "@/app/loja/_actions/equip-card-skin";
import type { ShopItem } from "@/app/loja/_data-access/get-shop";
import { CardSkinTile } from "@/components/card-skin-tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";
import { SellSheet } from "./sell-sheet";

type MyCardsProps = {
  me: Player;
  /** Padrão + compradas (`getMyCards`). */
  cards: ShopItem[];
  /** Mercado de cada skin em posse (anúncio ativo e faixa de preço). */
  market: Record<string, MyCardMarket>;
};

/** "Minhas cartas": escolher qual carta usar e anunciar (ou cancelar o anúncio) no Mercado. */
export function MyCards({ me, cards, market }: MyCardsProps) {
  const [message, setMessage] = useState<{ kind: "error" | "saved"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selling, setSelling] = useState<ShopItem | null>(null);
  const sellingMarket = selling?.skin ? market[selling.skin] : undefined;

  function handleCancel(listingId: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await cancelListing({ listingId });
        setMessage({ kind: result.success ? "saved" : "error", text: result.message });
      } catch (error) {
        console.error("Falha ao cancelar o anúncio", error);
        setMessage({ kind: "error", text: "Não foi possível falar com o servidor. Confira a conexão." });
      }
    });
  }

  function renderActions(item: ShopItem) {
    const info = item.skin ? market[item.skin] : undefined;
    if (item.state === "equipped") {
      return (
        <>
          <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary/15 text-sm font-semibold text-primary">
            <CheckIcon aria-hidden className="size-4" />
            Em uso
          </span>
          {info?.range && <p className="text-center text-xs text-muted-foreground">Para vender, use outra carta antes.</p>}
        </>
      );
    }
    if (info?.listing) {
      const { listing } = info;
      return (
        <>
          <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 text-sm font-semibold text-amber-300 tabular-nums">
            <TagIcon aria-hidden className="size-4" />
            No Mercado · {listing.price}
          </span>
          <p className="flex flex-wrap items-center justify-center gap-x-1 text-xs text-muted-foreground">
            <ClockIcon aria-hidden className="size-3.5" />
            {listing.remainingLabel} ·
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleCancel(listing.id)}
              className="-my-3 py-3 font-medium text-foreground underline underline-offset-2 disabled:opacity-50"
            >
              Cancelar
            </button>
          </p>
        </>
      );
    }
    const useButton = (
      <Button type="button" variant="secondary" className="h-10 w-full" disabled={isPending} onClick={() => handleEquip(item)}>
        Usar
      </Button>
    );
    if (!info?.range) {
      return (
        <>
          {useButton}
          {item.skin && <p className="text-center text-xs text-muted-foreground">Carta grátis: não dá para vender.</p>}
        </>
      );
    }
    return (
      <div className="grid w-full grid-cols-2 gap-2">
        {useButton}
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full gap-1"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            setSelling(item);
          }}
        >
          <TagIcon aria-hidden className="size-4" />
          Vender
        </Button>
      </div>
    );
  }

  function handleEquip(item: ShopItem) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await equipCardSkin(item.skin);
        setMessage({ kind: result.success ? "saved" : "error", text: result.message });
      } catch (error) {
        console.error("Falha ao trocar de carta", error);
        setMessage({ kind: "error", text: "Não foi possível falar com o servidor. Confira a conexão." });
      }
    });
  }

  return (
    <section id="minhas-cartas" aria-labelledby="my-cards-title" className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="my-cards-title" className="flex items-center gap-2 font-display text-xl font-bold tracking-wide uppercase">
            <WalletCardsIcon aria-hidden className="size-5 text-primary" />
            Minhas cartas · {cards.length}
          </h2>
          <p className="text-sm text-muted-foreground">Escolha qual carta usar ou venda no Mercado as que não quer mais.</p>
        </div>
        <Link
          href="/loja"
          className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:bg-muted"
        >
          <StoreIcon aria-hidden className="size-4" />
          Ver a Loja
        </Link>
      </div>

      {message && (
        <p role="status" className={cn("text-sm", message.kind === "saved" ? "text-success" : "text-destructive")}>
          {message.text}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((item) => (
          <CardSkinTile
            key={item.skin ?? "padrao"}
            player={{ ...me, cardSkin: item.skin }}
            name={item.name}
            isEquipped={item.state === "equipped"}
          >
            {renderActions(item)}
          </CardSkinTile>
        ))}
      </ul>

      <SellSheet
        skin={selling?.skin ?? null}
        name={selling?.name ?? ""}
        range={sellingMarket?.range ?? null}
        suggestedPrice={sellingMarket?.suggestedPrice ?? null}
        onClose={() => setSelling(null)}
        onDone={(text) => {
          setSelling(null);
          setMessage({ kind: "saved", text });
        }}
      />
    </section>
  );
}
