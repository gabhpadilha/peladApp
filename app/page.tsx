import { AppHeader } from "@/components/app-header";
import { PendingEvaluationsBanner } from "@/components/pending-evaluations-banner";
import { SectionTitle } from "@/components/section-title";
import { LatestRoundCard } from "./_components/latest-round-card";
import { MyCardSummary } from "./_components/my-card-summary";
import { RankingList } from "./_components/ranking-list";
import { UpcomingMatchCard } from "./_components/upcoming-match-card";
import { getHomeData } from "./_data-access/get-home-data";

export default async function Home() {
  const data = await getHomeData();

  return (
    <>
      <AppHeader currentPlayer={data.currentPlayer} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo de volta,</p>
          <h1 className="font-display text-3xl font-bold">{data.currentPlayer.nickname}</h1>
        </div>

        <PendingEvaluationsBanner pending={data.pending} />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <MyCardSummary
              player={data.currentPlayer}
              isMvp={data.isCurrentPlayerMvp}
              delta={data.currentDelta}
              rank={data.currentRank}
              gamesPlayed={data.gamesPlayed}
              evaluationsReceived={data.evaluationsReceived}
            />
            <UpcomingMatchCard match={data.upcomingMatch} />
          </div>

          <div className="flex flex-col gap-6">
            {data.latestRound && (
              <LatestRoundCard
                match={data.latestRound.match}
                topPerformers={data.latestRound.topPerformers}
                mvpId={data.latestRound.mvpId}
                openRound={data.openRound}
              />
            )}

            <section aria-labelledby="ranking-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <SectionTitle id="ranking-title" aside="por OVR">
                Ranking
              </SectionTitle>
              <RankingList
                title="Linha"
                players={data.outfieldRanking}
                currentPlayerId={data.currentPlayer.id}
              />
              <RankingList
                title="Goleiros"
                players={data.goalkeeperRanking}
                currentPlayerId={data.currentPlayer.id}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
