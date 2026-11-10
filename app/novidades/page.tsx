import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { getLeague } from "@/lib/league";
import { PATCH_NOTES } from "@/lib/patch-notes";
import { PatchMonthView } from "./_components/patch-notes-content";

export const metadata: Metadata = {
  title: "Patch notes · Cancha Club",
};

/** Patch notes do app: o que mudou em cada mês, com vídeo e atalhos para as telas novas. */
export default function PatchNotesPage() {
  return (
    <Suspense fallback={<PatchNotesSkeleton />}>
      <GroupGate nextPath="/novidades">
        <PatchNotesPageContent />
      </GroupGate>
    </Suspense>
  );
}

async function PatchNotesPageContent() {
  const league = await getLeague("/novidades");
  const me = league.players.find((player) => player.id === league.currentMemberId);
  if (!me) notFound();

  return (
    <>
      <AppHeader currentPlayer={me} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{league.membership.groupName}</p>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Patch notes</h1>
          <p className="text-sm text-muted-foreground">O que mudou no Cancha Club, mês a mês.</p>
        </div>
        {PATCH_NOTES.map((month, index) => (
          <PatchMonthView key={month.key} month={month} isLatest={index === 0} />
        ))}
      </main>
    </>
  );
}

function PatchNotesSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="h-16 animate-pulse rounded-xl bg-card" />
        <div className="h-32 animate-pulse rounded-xl bg-card" />
        <div className="h-72 animate-pulse rounded-xl bg-card" />
      </main>
    </>
  );
}
