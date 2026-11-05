"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheckIcon, CheckIcon } from "lucide-react";
import { confirmGoals } from "@/app/_actions/match-goals";
import { GoalBall, formatGoals } from "@/components/goal-ball";
import { Button } from "@/components/ui/button";
import { GOALS_MIN_CONFIRMATIONS, type MatchGoal } from "@/lib/goal-rules";
import { cn } from "@/lib/utils";

export type GoalVoteItem = {
  goal: MatchGoal;
  nickname: string;
  /** O que quem está logado já respondeu (`undefined`: ainda não). */
  myVote: boolean | undefined;
};

type GoalsVoteListProps = {
  matchId: string;
  items: GoalVoteItem[];
};

/**
 * Lista de conferência dos gols dos colegas ("Fulano diz que fez 3 gols · Confirmo / Não foi isso") e o botão
 * "Está tudo certo", que confirma todos de uma vez. Usada na etapa dos gols (antes das notas) e na mesa tática.
 * Quem usa deve dar um `key` que mude quando algum número mudar: uma correção apaga os votos no banco e a
 * lista recomeça da prop. Cada voto leva o número que o colega viu (se mudou, o banco recusa).
 */
export function GoalsVoteList({ matchId, items }: GoalsVoteListProps) {
  const router = useRouter();
  const [votes, setVotes] = useState<Record<string, boolean | undefined>>(() =>
    Object.fromEntries(items.map((item) => [item.goal.memberId, item.myVote])),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function send(item: GoalVoteItem, confirmed: boolean): Promise<boolean> {
    const result = await confirmGoals({
      matchId,
      memberId: item.goal.memberId,
      confirmed,
      expectedGoals: item.goal.goals,
    });
    if (!result.success) {
      setError(result.message);
      // O número mudou enquanto a tela estava aberta: busca o novo e a lista recomeça.
      if (result.message.includes("mudou")) router.refresh();
    }
    return result.success;
  }

  function handleVote(item: GoalVoteItem, confirmed: boolean) {
    setError(null);
    const previous = votes[item.goal.memberId];
    setVotes((current) => ({ ...current, [item.goal.memberId]: confirmed }));
    startTransition(async () => {
      if (!(await send(item, confirmed))) setVotes((current) => ({ ...current, [item.goal.memberId]: previous }));
    });
  }

  function handleConfirmAll() {
    setError(null);
    const todo = items.filter((item) => votes[item.goal.memberId] !== true);
    setVotes((current) => ({ ...current, ...Object.fromEntries(todo.map((item) => [item.goal.memberId, true])) }));
    startTransition(async () => {
      for (const item of todo) {
        if (!(await send(item, true))) setVotes((current) => ({ ...current, [item.goal.memberId]: undefined }));
      }
    });
  }

  const allConfirmed = items.every((item) => votes[item.goal.memberId] === true);

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        size="lg"
        className="h-12 text-base"
        disabled={isPending || allConfirmed}
        onClick={handleConfirmAll}
      >
        <CheckCheckIcon aria-hidden />
        {allConfirmed ? "Tudo confirmado" : "Está tudo certo: confirmar todos"}
      </Button>
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const vote = votes[item.goal.memberId];
          const yes = item.goal.yes - (item.myVote === true ? 1 : 0) + (vote === true ? 1 : 0);
          return (
            <li key={item.goal.memberId} className="flex flex-col gap-3 rounded-xl border bg-card p-3">
              <p className="flex items-center gap-2 text-sm">
                <GoalBall />
                <span className="min-w-0">
                  <strong className="truncate">{item.nickname}</strong> diz que fez{" "}
                  <strong className="font-display text-lg">{formatGoals(item.goal.goals)}</strong>
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  aria-pressed={vote === true}
                  onClick={() => handleVote(item, true)}
                  className={cn(
                    "flex h-11 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium",
                    vote === true ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                  )}
                >
                  <CheckIcon aria-hidden className="size-4" /> Confirmo
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  aria-pressed={vote === false}
                  onClick={() => handleVote(item, false)}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-lg border text-sm",
                    vote === false ? "border-destructive text-destructive" : "bg-background",
                  )}
                >
                  Não foi isso
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.min(yes, GOALS_MIN_CONFIRMATIONS)} de {GOALS_MIN_CONFIRMATIONS} confirmações
              </p>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
