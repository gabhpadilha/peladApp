import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CoinPill } from "@/components/coin-pill";
import { GroupGate } from "@/components/group-gate";
import { ShopTabs } from "../_components/shop-tabs";
import { MarketContent } from "./_components/market-content";
import { getMarket } from "./_data-access/get-market";

export const metadata: Metadata = {
  title: "Mercado · Cancha Club",
};

/** Mercado de transferências de skins: anúncios de todas as peladas, compra na hora com CanchaCoins. */
export default function MarketPage() {
  return (
    // Depende da sessão: faz streaming atrás do Suspense.
    <Suspense fallback={<MarketSkeleton />}>
      <GroupGate nextPath="/loja/mercado">
        <MarketPageContent />
      </GroupGate>
    </Suspense>
  );
}

async function MarketPageContent() {
  const market = await getMarket("/loja/mercado");
  if (!market) notFound();

  return (
    <>
      <AppHeader currentPlayer={market.me} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{market.groupName}</p>
            <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Loja</h1>
          </div>
          <CoinPill value={market.balance} className="shrink-0" />
        </div>
        <ShopTabs current="mercado" />
        <MarketContent
          listings={market.listings}
          balance={market.balance}
          owned={market.owned}
          myActiveCount={market.myListings.filter((listing) => listing.status === "active").length}
        />
      </main>
    </>
  );
}

function MarketSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="h-16 animate-pulse rounded-xl bg-card" />
        <div className="h-12 animate-pulse rounded-xl bg-card" />
        <div className="h-11 animate-pulse rounded-xl bg-card" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </main>
    </>
  );
}
