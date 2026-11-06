import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon, GlobeIcon, ShieldIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { PendingEvaluationsBanner } from "@/components/pending-evaluations-banner";
import { EmptyState } from "@/components/state-panels";
import { NewsSlider } from "./_components/news-slider";
import { LatestRoundCard } from "./_components/latest-round-card";
import { MyCardSummary } from "./_components/my-card-summary";
import { OpenRoundCard } from "./_components/open-round-card";
import { WinnersBanner } from "./_components/winners-banner";
import { WelcomeBonusDialog } from "./_components/welcome-bonus-dialog";
import { getDeletionRequestCount } from "@/app/admin/_data-access/get-deletion-requests";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { WELCOME_BONUS_COINS } from "@/lib/progression";
import { getUserId } from "@/lib/session";
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
  // Atalho do admin da plataforma: o app instalado no iPhone não tem barra de endereço para digitar /admin.
  const userId = await getUserId();
  const isAdmin = userId ? await isPlatformAdmin(userId) : false;
  const pendingDeletions = isAdmin ? await getDeletionRequestCount() : 0;
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          {/* Esquerda: minha carta e, logo embaixo, as novidades (no celular a ordem é a mesma: carta, novidades, Placar).
              No computador o slider ocupava a largura toda no fim e deixava um buraco embaixo da carta (2026-11-04). */}
          <div className="flex min-w-0 flex-col gap-6">
            <MyCardSummary
              player={data.currentPlayer}
              delta={data.currentDelta}
              rank={data.currentRank}
              gamesPlayed={data.gamesPlayed}
              evaluationsReceived={data.evaluationsReceived}
              awardCount={data.myAwardCount}
            />
            <NewsSlider
              event={data.cardEvent}
              today={data.today}
              shopSale={data.shopSale}
              player={data.currentPlayer}
            />
            <Link
              href="/comunidade"
              className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 transition-colors hover:bg-muted"
            >
              <GlobeIcon aria-hidden className="size-5 shrink-0 text-primary" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-medium">Comunidade</span>
                <span className="text-sm text-muted-foreground">Veja outras peladas e as conquistas da galera.</span>
              </span>
              <ArrowRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 transition-colors hover:bg-muted"
              >
                <ShieldIcon aria-hidden className="size-5 shrink-0 text-primary" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-medium">Painel da plataforma</span>
                  <span className="text-sm text-muted-foreground">
                    {pendingDeletions > 0 ? `${pendingDeletions} ${pendingDeletions === 1 ? "pedido" : "pedidos"} de exclusão de conta · ` : ""}Peladas, planos, suspensão e novas peladas.
                  </span>
                </span>
                <ArrowRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-6">
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
              <EmptyState
                title="Ainda não rolou nenhuma rodada"
                action={
                  <Link
                    href="/rodadas"
                    className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Ir para as rodadas
                    <ArrowRightIcon aria-hidden className="size-4" />
                  </Link>
                }
              >
                Depois do primeiro jogo, o organizador cria a rodada e cada um avalia quem jogou. As cartas e o ranking
                aparecem quando a rodada fecha.
              </EmptyState>
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
