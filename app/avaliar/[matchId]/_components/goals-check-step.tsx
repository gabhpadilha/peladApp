"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { finishGoalCheck } from "@/app/_actions/match-goals";
import { GoalsVoteList, type GoalVoteItem } from "@/components/goals-vote-list";
import { Button } from "@/components/ui/button";
import { formatWeekdayDate } from "@/lib/format-date";
import { GOALS_MIN_CONFIRMATIONS } from "@/lib/goal-rules";

type GoalsCheckStepProps = {
  match: { id: string; round: number; date: string };
  items: GoalVoteItem[];
};

/** Quanto esperar entre uma conferida e outra (um colega pode corrigir o número enquanto você confere). */
const REFRESH_MS = 5000;

/**
 * Etapa 1 de 2, segunda parte: conferir os gols dos colegas. Só aparece depois que todos informaram os seus.
 * Concluir exige participação, não aprovação: um "não" ou um colega sem confirmar nunca trava as notas.
 */
export function GoalsCheckStep({ match, items }: GoalsCheckStepProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  function handleFinish() {
    setError(null);
    startTransition(async () => {
      const result = await finishGoalCheck({ matchId: match.id });
      if (!result.success) setError(result.message);
      else router.refresh();
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Sair da avaliação">
            <Link href="/">
              <XIcon />
            </Link>
          </Button>
          <div className="flex flex-1 flex-col">
            <p className="text-sm font-medium">Rodada {match.round}</p>
            <p className="text-xs text-muted-foreground first-letter:uppercase">{formatWeekdayDate(match.date)}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-6 pb-36">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Etapa 1 de 2 · Gols</p>
          <h1 className="font-display text-3xl font-bold uppercase">Confira os gols dos colegas</h1>
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "Ninguém mais marcou gol nessa rodada. É só concluir."
              : `Confirme o que bate com o jogo. ${GOALS_MIN_CONFIRMATIONS} confirmações validam os gols de cada um.`}
          </p>
        </div>
        {items.length > 0 && (
          <GoalsVoteList
            key={items.map((item) => `${item.goal.memberId}:${item.goal.goals}`).join("|")}
            matchId={match.id}
            items={items}
          />
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button size="lg" className="h-12 text-base" disabled={isPending} onClick={handleFinish} variant={items.length === 0 ? "default" : "secondary"}>
            {isPending ? "Concluindo…" : "Concluir e ir para as notas"}
          </Button>
          {items.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">Dá para concluir sem votar em todos.</p>
          )}
        </div>
      </footer>
    </div>
  );
}
