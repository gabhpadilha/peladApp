import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { PendingEvaluationsBanner } from "@/components/pending-evaluations-banner";
import { AthleteHero } from "./_components/athlete-hero";
import { AttributeBars } from "./_components/attribute-bars";
import { MatchHistory } from "./_components/match-history";
import { PerformanceChart } from "./_components/performance-chart";
import { getAthleteProfile } from "./_data-access/get-athlete-profile";

export default function AthletePage({ params }: PageProps<"/jogadores/[id]">) {
  return (
    // `params` e a sessão são dados de requisição: a página faz streaming.
    <Suspense fallback={<AthleteSkeleton />}>
      <GroupGate nextPath="/">
        <AthleteContent params={params} />
      </GroupGate>
    </Suspense>
  );
}

async function AthleteContent({ params }: { params: PageProps<"/jogadores/[id]">["params"] }) {
  const { id } = await params;
  const profile = await getAthleteProfile(id);
  if (!profile) notFound();

  return (
    <>
      <AppHeader currentPlayer={profile.currentPlayer} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          Início
        </Link>
        <AthleteHero profile={profile} />
        <PendingEvaluationsBanner pending={profile.pending} />
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <PerformanceChart performances={profile.performances} bestScore={profile.bestScore} />
          <AttributeBars player={profile.player} />
        </div>
        <MatchHistory performances={profile.performances} />
      </main>
    </>
  );
}

function AthleteSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <div className="h-80 animate-pulse rounded-xl bg-card" />
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="h-64 animate-pulse rounded-xl bg-card" />
          <div className="h-64 animate-pulse rounded-xl bg-card" />
        </div>
      </main>
    </>
  );
}
