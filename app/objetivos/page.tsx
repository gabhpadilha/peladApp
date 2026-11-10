import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TargetIcon } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { GroupGate } from "@/components/group-gate";
import { EmptyState } from "@/components/state-panels";
import { Button } from "@/components/ui/button";
import { getLeague } from "@/lib/league";
import { formatDaysLeft } from "@/lib/goals";
import { GoalsBoard } from "./_components/goals-board";
import { getMyGoals } from "./_data-access/get-goals";

export const metadata: Metadata = {
  title: "Objetivos · Cancha Club",
};

/** Objetivos do mês: 3 vagas (fácil, médio e difícil), cada uma paga um pacote de skin. */
export default function GoalsPage() {
  return (
    // Depende da sessão: faz streaming atrás do Suspense.
    <Suspense fallback={<GoalsSkeleton />}>
      <GroupGate nextPath="/objetivos">
        <GoalsContent />
      </GroupGate>
    </Suspense>
  );
}

async function GoalsContent() {
  const league = await getLeague("/objetivos");
  const me = league.players.find((player) => player.id === league.currentMemberId);
  if (!me) notFound();
  const goals = await getMyGoals(league.membership.groupId);

  return (
    <>
      <AppHeader currentPlayer={me} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 font-display text-4xl leading-none font-extrabold uppercase">
            <TargetIcon aria-hidden className="size-7 text-primary" />
            Objetivos
          </h1>
          {goals && (
            <p className="text-sm text-muted-foreground">
              <span className="capitalize">{goals.month.name}</span> · {formatDaysLeft(goals.month.daysLeft)}
            </p>
          )}
        </div>

        {goals ? (
          <>
            <p className="rounded-xl border bg-card p-3 text-sm text-muted-foreground">
              Escolha uma opção em cada nível. <span className="text-foreground">A escolha é única</span> e só conta o que você fizer
              depois de aceitar. Quanto mais difícil, melhor o pacote.
            </p>
            <GoalsBoard slots={goals.slots} />
          </>
        ) : (
          <EmptyState
            title="Os objetivos ainda não chegaram"
            action={
              <Button asChild variant="outline">
                <Link href="/">Voltar ao Início</Link>
              </Button>
            }
          >
            Os objetivos do mês valem pacotes de skin e começam quando os pacotes forem ligados na sua pelada.
          </EmptyState>
        )}
      </main>
    </>
  );
}

function GoalsSkeleton() {
  return (
    <>
      <AppHeader />
      <main aria-busy className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="h-16 animate-pulse rounded-xl bg-card" />
        <div className="h-16 animate-pulse rounded-xl bg-card" />
        <div className="h-64 animate-pulse rounded-xl bg-card" />
      </main>
    </>
  );
}
