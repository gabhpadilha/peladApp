"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { confirmGoals } from "@/app/_actions/match-goals";
import { GoalBall, formatGoals } from "@/components/goal-ball";
import { GOALS_MIN_CONFIRMATIONS, type MatchGoal } from "@/lib/goal-rules";
import { cn } from "@/lib/utils";

type GoalsConfirmProps = {
  matchId: string;
  nickname: string;
  goal: MatchGoal;
  /** O que quem está logado já respondeu (`undefined`: ainda não). */
  myVote: boolean | undefined;
  /** Quem está logado marcou esses gols (organizador): não confirma os próprios lançamentos. */
  isReporter: boolean;
};

/**
 * Faixa "Fulano diz que fez 3 gols · Confirmo / Não foi isso", na nota de cada colega.
 * Opcional: não trava a nota. Grava na hora, sem esperar o envio das notas.
 */
export function GoalsConfirm({ matchId, nickname, goal, myVote, isReporter }: GoalsConfirmProps) {
  const [vote, setVote] = useState(myVote);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  if (goal.goals === 0) return null;

  const yes = goal.yes - (myVote === true ? 1 : 0) + (vote === true ? 1 : 0);

  function handleVote(confirmed: boolean) {
    setError(null);
    const previous = vote;
    setVote(confirmed);
    startTransition(async () => {
      const result = await confirmGoals({ matchId, memberId: goal.memberId, confirmed });
      if (!result.success) {
        setVote(previous);
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <p className="flex items-center gap-2 text-sm">
        <GoalBall />
        <span>
          {nickname} diz que fez <strong className="font-display text-lg">{formatGoals(goal.goals)}</strong>
        </span>
      </p>
      {isReporter ? (
        <p className="text-xs text-muted-foreground">Você marcou esses gols: os colegas é que confirmam.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isPending}
            aria-pressed={vote === true}
            onClick={() => handleVote(true)}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium",
              vote === true ? "border-primary bg-primary text-primary-foreground" : "bg-background",
            )}
          >
            <CheckIcon className="size-4" /> Confirmo
          </button>
          <button
            type="button"
            disabled={isPending}
            aria-pressed={vote === false}
            onClick={() => handleVote(false)}
            className={cn("flex h-10 items-center justify-center rounded-lg border text-sm", vote === false ? "border-destructive text-destructive" : "bg-background")}
          >
            Não foi isso
          </button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Opcional · {Math.min(yes, GOALS_MIN_CONFIRMATIONS)} de {GOALS_MIN_CONFIRMATIONS} confirmações
      </p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
