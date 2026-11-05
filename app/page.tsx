import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { PendingEvaluationsBanner } from "@/components/pending-evaluations-banner";
import { NewsSlider } from "./_components/news-slider";
import { LatestRoundCard } from "./_components/latest-round-card";
import { MyCardSummary } from "./_components/my-card-summary";
import { OpenRoundCard } from "./_components/open-round-card";
import { WinnersBanner } from "./_components/winners-banner";
import { WelcomeBonusDialog } from "./_components/welcome-bonus-dialog";
import { WELCOME_BONUS_COINS } from "@/lib/progression";
import { Scoreboard } from "./_components/scoreboard";
import { getHomeData } from "./_data-access/get-home-data";

export default function Home() {
  return (
    // Exige login e pelada (lê cookies): o conteúdo faz streaming.
    <Suspense fallback={<HomeSkeleton />}>
      <GroupGate nextPath="/">
        <HomeContent />
      </GroupGate>
    </Suspense>
  );
}

async function HomeContent() {
  const data = await getHomeData();
  const hasRounds = data.latestRound !== null || data.openRound !== null;

  const hasNow = data.pending.length > 0 || data.winnersAlert !== null || data.openRound !== null;

  return (
    <>
      <AppHeader currentPlayer={data.currentPlayer} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-sm text-muted-foreground">{data.groupName}</p>
          <h1 className="font-display text-xl font-bold">Fala, {data.currentPlayer.nickname}</h1>
        </div>

        {data.showWelcomeBonus && <WelcomeBonusDialog coins={WELCOME_BONUS_COINS} />}

        {/* Revisão de 2026-11-04: o que pede uma ação vem primeiro, antes das novidades. */}
        {hasNow && (
          <section aria-labelledby="now-title" className="flex flex-col gap-3">
            <h2 id="now-title" className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Agora
            </h2>
            <PendingEvaluationsBanner pending={data.pending} />
            {data.winnersAlert && <WinnersBanner alert={data.winnersAlert} />}
            {data.openRound && (
              <OpenRoundCard
                match={data.openRound.match}
                submitted={data.openRound.submitted}
                expected={data.openRound.expected}
              />
            )}
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="order-1 flex flex-col gap-6">
            <MyCardSummary
              player={data.currentPlayer}
              delta={data.currentDelta}
              rank={data.currentRank}
              gamesPlayed={data.gamesPlayed}
              evaluationsReceived={data.evaluationsReceived}
              awardCount={data.myAwardCount}
            />
          </div>

          {/* Novidades logo depois da minha carta no celular (a promoção da Loja precisa de destaque); em tela grande ocupa a largura toda, embaixo. */}
          <div className="order-2 min-w-0 lg:order-3 lg:col-span-2">
            <NewsSlider
              event={data.cardEvent}
              today={data.today}
              shopSale={data.shopSale}
              player={data.currentPlayer}
            />
          </div>

          <div className="order-3 flex flex-col gap-6 lg:order-2">
            <Scoreboard
              pointsMonth={data.monthRanking}
              pointsAllTime={data.allTimeRanking}
              goalsMonth={data.monthScorers}
              goalsAllTime={data.allTimeScorers}
              monthLabel={data.monthLabel}
              currentPlayerId={data.currentPlayer.id}
            />

            {data.latestRound && (
              <LatestRoundCard
                match={data.latestRound.match}
                topPerformers={data.latestRound.topPerformers}
                awards={data.latestRound.awards}
              />
            )}

            {!hasRounds && (
              <section className="flex flex-col gap-2 rounded-xl border border-dashed bg-card/50 p-4">
                <h2 className="font-display text-lg font-bold tracking-wide uppercase">Ainda não rolou nenhuma rodada</h2>
                <p className="text-sm text-muted-foreground">
                  Depois do primeiro jogo, o organizador cria a rodada e cada um avalia quem jogou. As cartas e o
                  ranking aparecem quando a rodada fecha.
                </p>
                <Link
                  href="/rodadas"
                  className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Ir para as rodadas
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Link>
              </section>
            )}
          </div>
        </div>

      </main>
    </>
  );
}

function HomeSkeleton() {
  return (
    <main aria-busy className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-20">
      <div className="h-14 animate-pulse rounded-xl bg-card" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-96 animate-pulse rounded-xl bg-card" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-card" />
    </main>
  );
}
