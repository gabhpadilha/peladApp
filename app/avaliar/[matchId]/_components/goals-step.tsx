"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { reportGoals } from "@/app/_actions/match-goals";
import { GoalBall } from "@/components/goal-ball";
import { GoalStepper } from "@/components/goal-stepper";
import { Button } from "@/components/ui/button";
import { formatWeekdayDate } from "@/lib/format-date";
import { GOALS_MIN_CONFIRMATIONS } from "@/lib/goal-rules";

type GoalsStepProps = {
  match: { id: string; round: number; date: string };
  memberId: string;
};

/** Primeira tela da votação: "Quantos gols você fez?" (as notas abrem depois que todos informam). */
export function GoalsStep({ match, memberId }: GoalsStepProps) {
  const router = useRouter();
  const [goals, setGoals] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await reportGoals({ matchId: match.id, memberId, goals });
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

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-4 pt-10 pb-32 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-white/5">
          <GoalBall className="size-9" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold uppercase">Quantos gols você fez?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {GOALS_MIN_CONFIRMATIONS} colegas confirmam e eles entram nas suas estatísticas.
          </p>
        </div>
        <GoalStepper value={goals} onChange={setGoals} label="Seus gols na rodada" />
        <p className="text-sm text-muted-foreground">Não fez gol? Deixe no 0 e siga.</p>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button size="lg" className="h-12 text-base" disabled={isPending} onClick={handleSubmit}>
            {isPending ? "Enviando…" : "Continuar para as notas"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
