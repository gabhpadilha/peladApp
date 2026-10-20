import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CoinsIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { LevelProgressBar } from "@/components/level-progress";
import { COIN_RULES } from "@/lib/progression";
import { CoinPill } from "./_components/coin-pill";
import { ShopContent } from "./_components/shop-content";
import { getShop } from "./_data-access/get-shop";

export const metadata: Metadata = {
  title: "Loja · PeladApp",
};

/** Loja de personalizações de carta, paga com PeladaCoins e liberada por nível. */
export default function ShopPage() {
  return (
    // A loja depende da sessão: faz streaming atrás do Suspense.
    <Suspense fallback={<ShopSkeleton />}>
      <GroupGate nextPath="/loja">
        <ShopPageContent />
      </GroupGate>
    </Suspense>
  );
}

async function ShopPageContent() {
  const shop = await getShop();
  if (!shop) notFound();

  return (
    <>
      <AppHeader currentPlayer={shop.me} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{shop.groupName}</p>
            <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Loja</h1>
            <p className="text-sm text-muted-foreground">Personalize a sua carta com PeladaCoins.</p>
          </div>
          <CoinPill value={shop.balance} className="mt-6 shrink-0" />
        </div>

        <LevelProgressBar
          progress={shop.progression}
          hint={shop.nextUnlock ? `no nível ${shop.nextUnlock.level} libera a ${shop.nextUnlock.name}` : undefined}
        />

        <ShopContent me={shop.me} items={shop.items} balance={shop.balance} />

        <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-wide uppercase">
            <CoinsIcon aria-hidden className="size-5 text-amber-300" />
            Como ganhar PeladaCoins
          </h2>
          <ul className="flex flex-col divide-y">
            {COIN_RULES.map((rule) => (
              <li key={rule.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{rule.label}</span>
                <span className="font-display text-base font-bold text-amber-200 tabular-nums">{rule.value}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Vale para rodadas fechadas. Comprou, é seu para sempre: dá para trocar de carta quando quiser.
          </p>
        </section>
      </main>
    </>
  );
}

function ShopSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
        <div className="h-20 animate-pulse rounded-xl bg-card" />
        <div className="h-24 animate-pulse rounded-xl bg-card" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      </main>
    </>
  );
}
