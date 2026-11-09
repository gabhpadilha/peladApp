"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2Icon, ClockIcon, CoinsIcon, RotateCcwIcon } from "lucide-react";
import { cancelListing } from "@/app/_actions/market";
import { SellSheet } from "@/components/sell-sheet";
import { ShowcaseCard } from "@/components/showcase-card";
import { EmptyState } from "@/components/state-panels";
import { Button } from "@/components/ui/button";
import { getMarketPriceRange, getMarketSuggestedPrice } from "@/lib/market";
import type { MyListing } from "@/lib/market-listings";
import { cn } from "@/lib/utils";
import { getCardSkin, isCardSkinKey, type CardSkinKey } from "@/types/card-skin";

type MyListingsProps = {
  /** Anúncios ativos. */
  active: MyListing[];
  sold: MyListing[];
  /** Vencidos cuja skin continua com o jogador, livre para anunciar de novo. */
  unsold: MyListing[];
};

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-base font-bold tracking-wide text-muted-foreground uppercase">
        {title} · {count}
      </h2>
      <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">{children}</ul>
    </section>
  );
}

/** "Meus anúncios": à venda (cancelar), vendidas e as que não venderam (anunciar de novo). */
export function MyListings({ active, sold, unsold }: MyListingsProps) {
  const [message, setMessage] = useState<{ kind: "error" | "saved"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selling, setSelling] = useState<CardSkinKey | null>(null);

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

  function renderItem(row: MyListing, info: ReactNode, action: ReactNode) {
    if (!isCardSkinKey(row.skin)) return null;
    const isSold = row.status === "sold";
    return (
      <li key={row.id} className="flex items-center gap-3 px-3 py-3">
        <div className="w-14 shrink-0">
          <ShowcaseCard skin={row.skin} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate font-display text-lg leading-none font-bold uppercase">{getCardSkin(row.skin).name}</p>
          <p className={cn("flex items-center gap-1 font-display text-base font-bold tabular-nums", isSold && "text-amber-300")}>
            <CoinsIcon aria-hidden className="size-4" />
            {isSold ? `+${row.price}` : row.price} CC
          </p>
          <p className="flex items-start gap-1 text-xs leading-snug text-muted-foreground">{info}</p>
        </div>
        {action && <div className="w-28 shrink-0">{action}</div>}
      </li>
    );
  }

  if (active.length + sold.length + unsold.length === 0) {
    return (
      <EmptyState
        title="Você ainda não anunciou nada"
        action={
          <Button asChild variant="outline">
            <Link href="/eu#minhas-cartas">Ir para Minhas cartas</Link>
          </Button>
        }
      >
        Para vender uma skin, abra Eu → Minhas cartas e toque em Vender.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {message && (
        <p role="status" className={cn("text-sm", message.kind === "saved" ? "text-success" : "text-destructive")}>
          {message.text}
        </p>
      )}

      <Section title="À venda" count={active.length}>
        {active.map((row) =>
          renderItem(
            row,
            <>
              <ClockIcon aria-hidden className="mt-px size-3.5 shrink-0" />
              {row.remainingLabel}
            </>,
            <Button type="button" variant="outline" className="h-10 w-full" disabled={isPending} onClick={() => handleCancel(row.id)}>
              Cancelar
            </Button>,
          ),
        )}
      </Section>

      <Section title="Vendidas" count={sold.length}>
        {sold.map((row) =>
          renderItem(
            row,
            <>
              <CheckCircle2Icon aria-hidden className="mt-px size-3.5 shrink-0 text-success" />
              {row.soldLabel}
            </>,
            null,
          ),
        )}
      </Section>

      <Section title="Não venderam" count={unsold.length}>
        {unsold.map((row) =>
          renderItem(
            row,
            "Ninguém comprou em 24h · voltou para Minhas cartas",
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-full gap-1.5"
              disabled={isPending}
              onClick={() => {
                setMessage(null);
                if (isCardSkinKey(row.skin)) setSelling(row.skin);
              }}
            >
              <RotateCcwIcon aria-hidden className="size-4" />
              Anunciar
            </Button>,
          ),
        )}
      </Section>

      <SellSheet
        skin={selling}
        name={selling ? getCardSkin(selling).name : ""}
        range={selling ? getMarketPriceRange(selling) : null}
        suggestedPrice={selling ? getMarketSuggestedPrice(selling) : null}
        onClose={() => setSelling(null)}
        onDone={(text) => {
          setSelling(null);
          setMessage({ kind: "saved", text });
        }}
      />
    </div>
  );
}
