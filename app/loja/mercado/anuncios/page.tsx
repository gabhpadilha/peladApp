import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, TagIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { CoinPill } from "@/components/coin-pill";
import { GroupGate } from "@/components/group-gate";
import { MARKET_MAX_ACTIVE_LISTINGS } from "@/lib/market";
import { MyListings } from "../_components/my-listings";
import { getMarket } from "../_data-access/get-market";

export const metadata: Metadata = {
  title: "Meus anúncios · Cancha Club",
};

/** Os anúncios do próprio jogador no Mercado: à venda, vendidas e as que não venderam. */
export default function MyListingsPage() {
  return (
    <Suspense fallback={<ListingsSkeleton />}>
      <GroupGate nextPath="/loja/mercado/anuncios">
        <MyListingsContent />
      </GroupGate>
    </Suspense>
  );
}

async function MyListingsContent() {
  const market = await getMarket("/loja/mercado/anuncios");
  if (!market) notFound();
  const { myListings } = market;
  const owned = new Set<string>(market.owned);
  const activeSkins = new Set(myListings.filter((listing) => listing.status === "active").map((listing) => listing.skin));
  // "Não venderam": só o vencido mais recente de cada skin que continua com o jogador e não foi anunciada de novo.
  const seen = new Set<string>();
  const unsold = myListings.filter((listing) => {
    if (listing.status !== "expired" || !owned.has(listing.skin) || activeSkins.has(listing.skin) || seen.has(listing.skin)) return false;
    seen.add(listing.skin);
    return true;
  });

  return (
    <>
      <AppHeader currentPlayer={market.me} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/loja/mercado" className="-my-2 flex items-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon aria-hidden className="size-4" />
            Mercado
          </Link>
          <CoinPill value={market.balance} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 font-display text-3xl leading-none font-extrabold uppercase">
            <TagIcon aria-hidden className="size-6 text-primary" />
            Meus anúncios
          </h1>
          <p className="text-sm text-muted-foreground">
            Até {MARKET_MAX_ACTIVE_LISTINGS} anúncios ao mesmo tempo. Venda no Mercado não tem taxa.
          </p>
        </div>
        <MyListings
          active={myListings.filter((listing) => listing.status === "active")}
          sold={myListings.filter((listing) => listing.status === "sold")}
          unsold={unsold}
        />
      </main>
    </>
  );
}

function ListingsSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <div className="h-16 animate-pulse rounded-xl bg-card" />
        <div className="h-64 animate-pulse rounded-xl bg-card" />
      </main>
    </>
  );
}
