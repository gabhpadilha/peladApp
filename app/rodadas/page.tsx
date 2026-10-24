import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { MatchesList } from "./_components/matches-list";
import { NewMatchForm } from "./_components/new-match-form";
import { getRoundsOverview } from "./_data-access/get-rounds-overview";

export const metadata: Metadata = {
  title: "Rodadas · Cancha Club",
};

/** A atração principal: nova rodada (confirmados + sorteio pelo OVR) e as rodadas da pelada. */
export default function RoundsPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        {/* Tudo aqui depende da sessão: faz streaming atrás do Suspense. */}
        <Suspense fallback={<RoundsSkeleton />}>
          <RoundsContent />
        </Suspense>
      </main>
    </>
  );
}

async function RoundsContent() {
  const overview = await getRoundsOverview();
  const openCount = overview.matches.filter((match) => match.status === "open").length;

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{overview.membership.groupName}</p>
        <h1 className="font-display text-4xl font-extrabold uppercase">Rodadas</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {overview.isOrganizer
            ? "Marque quem confirmou no WhatsApp, sorteie os times pelo OVR e crie a rodada. Depois do jogo, todo mundo avalia e você fecha a rodada para as cartas saírem."
            : "Aqui ficam as rodadas da pelada. Quando uma estiver em avaliação, dê suas notas e vote nas cartas especiais."}
          {openCount > 0 && (
            <span className="font-medium text-foreground">
              {" "}
              {openCount === 1 ? "1 rodada em avaliação." : `${openCount} rodadas em avaliação.`}
            </span>
          )}
        </p>
      </div>

      {overview.isOrganizer ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <NewMatchForm members={overview.members} today={overview.today} />
          <MatchesList matches={overview.matches} isOrganizer />
        </div>
      ) : (
        <MatchesList matches={overview.matches} isOrganizer={false} />
      )}
    </>
  );
}

function RoundsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="h-24 animate-pulse rounded-xl bg-card" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="h-96 animate-pulse rounded-xl bg-card" />
        <div className="h-96 animate-pulse rounded-xl bg-card" />
      </div>
    </div>
  );
}
