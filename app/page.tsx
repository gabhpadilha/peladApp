import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { PendingEvaluationsBanner } from "@/components/pending-evaluations-banner";
import { SectionTitle } from "@/components/section-title";
import { NewsSlider } from "./_components/news-slider";
import { LatestRoundCard } from "./_components/latest-round-card";
import { MyCardSummary } from "./_components/my-card-summary";
import { OpenRoundCard } from "./_components/open-round-card";
import { WinnersBanner } from "./_components/winners-banner";
import { WelcomeBonusDialog } from "./_components/welcome-bonus-dialog";
import { WELCOME_BONUS_COINS } from "@/lib/progression";
import { ExpandableRanking } from "./_components/expandable-ranking";
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

  return (
    <>
      <AppHeader currentPlayer={data.currentPlayer} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-sm text-muted-foreground">{data.groupName}</p>
          <h1 className="font-display text-3xl font-bold">Fala, {data.currentPlayer.nickname}</h1>
        </div>

        {data.showWelcomeBonus && <WelcomeBonusDialog coins={WELCOME_BONUS_COINS} />}

        <PendingEvaluationsBanner pending={data.pending} />

        {data.winnersAlert && <WinnersBanner alert={data.winnersAlert} />}

        <NewsSlider
          event={data.cardEvent}
          today={data.today}
          shopSale={data.shopSale}
          player={data.currentPlayer}
          progress={data.levelProgress}
          balance={data.balance}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <MyCardSummary
              player={data.currentPlayer}
              delta={data.currentDelta}
              rank={data.currentRank}
              gamesPlayed={data.gamesPlayed}
              evaluationsReceived={data.evaluationsReceived}
              awardCount={data.myAwardCount}
            />
            {data.openRound && (
              <OpenRoundCard
                match={data.openRound.match}
                submitted={data.openRound.submitted}
                expected={data.openRound.expected}
              />
            )}
          </div>

          <div className="flex flex-col gap-6">
            {data.latestRound && (
              <LatestRoundCard
                match={data.latestRound.match}
                topPerformers={data.latestRound.topPerformers}
                awards={data.latestRound.awards}
              />
            )}

            {!hasRounds && (
              <section className="flex flex-col gap-2 rounded-xl border border-dashed bg-card/50 p-4">
                <h2 className="font-display text-lg font-bold tracking-wide uppercase">Nenhuma rodada ainda</h2>
                <p className="text-sm text-muted-foreground">
                  Depois do primeiro jogo, o organizador cria a rodada e cada um avalia quem jogou. As cartas e o
                  ranking aparecem quando a rodada fecha.
                </p>
                <Link
                  href="/rodadas"
                  className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Ir para as rodadas
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Link>
              </section>
            )}

            <section aria-labelledby="ranking-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <SectionTitle id="ranking-title" aside="por OVR">
                Ranking
              </SectionTitle>
              <ExpandableRanking
                outfield={data.outfieldRanking}
                goalkeepers={data.goalkeeperRanking}
                currentPlayerId={data.currentPlayer.id}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function HomeSkeleton() {
  return (
    <main aria-busy className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-20">
      <div className="h-20 animate-pulse rounded-xl bg-card" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl bg-card" />
        <div className="h-72 animate-pulse rounded-xl bg-card" />
      </div>
    </main>
  );
}
