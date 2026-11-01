"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HourglassIcon, UserRoundXIcon } from "lucide-react";
import { reportGoals, unlockRatings } from "@/app/_actions/match-goals";
import { GoalBall, formatGoals } from "@/components/goal-ball";
import { GoalStepper } from "@/components/goal-stepper";
import { Button } from "@/components/ui/button";
import { GOALS_MIN_CONFIRMATIONS } from "@/lib/goal-rules";
import type { MatchBoard } from "../_data-access/get-match-board";

/** Informa (ou corrige) os gols de alguém e atualiza a mesa. */
function useReportGoals(matchId: string) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function report(memberId: string, goals: number, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await reportGoals({ matchId, memberId, goals });
      if (!result.success) setError(result.message);
      else {
        onDone?.();
        router.refresh();
      }
    });
  }
  return { report, error, isPending };
}

/** Os seus gols: informar (etapa dos gols) ou ver as confirmações e corrigir. */
function MyGoals({ board }: { board: MatchBoard }) {
  const mine = board.goals.byMember[board.memberId];
  const [value, setValue] = useState(mine?.goals ?? 0);
  const [isEditing, setIsEditing] = useState(false);
  const { report, error, isPending } = useReportGoals(board.match.id);

  if (!mine || isEditing) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4 text-center">
        <p className="flex items-center gap-2 font-display text-xl font-bold uppercase">
          <GoalBall className="size-5" /> {mine ? "Corrigir seus gols" : "Quantos gols você fez?"}
        </p>
        <GoalStepper value={value} onChange={setValue} size="sm" label="Seus gols na rodada" />
        <div className="flex w-full gap-2">
          {mine && (
            <Button variant="ghost" className="h-11 flex-1" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          )}
          <Button className="h-11 flex-1 text-base" disabled={isPending} onClick={() => report(board.memberId, value, () => setIsEditing(false))}>
            {isPending ? "Enviando…" : mine ? "Salvar" : "Enviar meus gols"}
          </Button>
        </div>
        {mine && <p className="text-xs text-muted-foreground">Corrigir zera as confirmações.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
      <GoalBall className="size-5" />
      <div className="min-w-0 flex-1">
        <p>
          Seus gols: <strong>{mine.goals}</strong>
          {mine.goals > 0 &&
            (mine.isConfirmed ? (
              <span className="text-primary"> · confirmados</span>
            ) : (
              <span className="text-primary">
                {" "}
                · {Math.min(mine.yes, GOALS_MIN_CONFIRMATIONS)} de {GOALS_MIN_CONFIRMATIONS} confirmações
              </span>
            ))}
        </p>
        {mine.no > 0 && (
          <p className="text-xs text-muted-foreground">
            {mine.no === 1 ? "1 não confirmou" : `${mine.no} não confirmaram`}: confira o número.
          </p>
        )}
      </div>
      <button type="button" className="text-sm font-medium text-primary" onClick={() => setIsEditing(true)}>
        Corrigir
      </button>
    </div>
  );
}

/** Organizador: gols de quem está sem celular e "Liberar as notas". */
function OrganizerGoals({ board }: { board: MatchBoard }) {
  const everyone = board.teams.flatMap((team) => [...team.starters, ...team.reserves]);
  const missing = everyone.filter((entry) => !board.goals.byMember[entry.player.id] && entry.player.id !== board.memberId);
  const [values, setValues] = useState<Record<string, number>>({});
  const { report, error, isPending } = useReportGoals(board.match.id);
  const router = useRouter();
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, startUnlock] = useTransition();

  if (missing.length === 0 && board.goals.ratingsOpen) return null;

  function handleUnlock() {
    setUnlockError(null);
    startUnlock(async () => {
      const result = await unlockRatings({ matchId: board.match.id });
      if (!result.success) setUnlockError(result.message);
      else router.refresh();
    });
  }

  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
          <UserRoundXIcon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Gols de quem está sem celular</span>
          <span className="block text-xs text-muted-foreground">
            Só o organizador · {missing.length === 1 ? "1 sem informar" : `${missing.length} sem informar`}
          </span>
        </span>
        <span className="text-sm font-medium text-primary group-open:hidden">Marcar</span>
      </summary>
      <div className="flex flex-col gap-3 border-t p-3">
        {missing.map((entry) => (
          <div key={entry.player.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium">{entry.player.nickname}</span>
            <div className="flex items-center gap-2">
              <GoalStepper
                value={values[entry.player.id] ?? 0}
                onChange={(value) => setValues((current) => ({ ...current, [entry.player.id]: value }))}
                size="sm"
                label={`Gols de ${entry.player.nickname}`}
              />
              <Button size="sm" variant="secondary" disabled={isPending} onClick={() => report(entry.player.id, values[entry.player.id] ?? 0)}>
                Salvar
              </Button>
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Os gols que você marcar também precisam de {GOALS_MIN_CONFIRMATIONS} confirmações dos colegas.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!board.goals.ratingsOpen && (
          <>
            <Button className="h-11 text-base" disabled={isUnlocking} onClick={handleUnlock}>
              {isUnlocking ? "Liberando…" : "Liberar as notas"}
            </Button>
            <p className="text-xs text-muted-foreground">Quem ainda não informou fica com 0 gols nessa rodada.</p>
            {unlockError && <p role="alert" className="text-sm text-destructive">{unlockError}</p>}
          </>
        )}
      </div>
    </details>
  );
}

/**
 * Etapa dos gols na mesa tática: os seus gols, a espera pelos dos outros (as notas abrem
 * quando todos informam) e, para o organizador, os gols de quem está sem celular.
 */
export function RoundGoals({ board }: { board: MatchBoard }) {
  if (board.match.status !== "open") return null;
  const missingNames = board.teams
    .flatMap((team) => [...team.starters, ...team.reserves])
    .filter((entry) => board.goals.missingIds.includes(entry.player.id))
    .map((entry) => entry.player.nickname);
  const mine = board.goals.byMember[board.memberId];

  return (
    <div className="flex flex-col gap-3">
      {board.isPresent && <MyGoals board={board} />}
      {board.isPresent && !board.goals.ratingsOpen && mine && (
        <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <HourglassIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            As notas abrem quando todo mundo informar os gols. Falta {formatGoalsMissing(missingNames)}.
          </span>
        </p>
      )}
      {board.isOrganizer && <OrganizerGoals board={board} />}
    </div>
  );
}

function formatGoalsMissing(names: string[]): string {
  return names.length === 0 ? "ninguém" : new Intl.ListFormat("pt-BR", { type: "conjunction" }).format(names);
}

/** Bolinha dos gols confirmados embaixo da carta. */
export function GoalsChip({ goals }: { goals: number }) {
  return (
    <span
      aria-label={formatGoals(goals)}
      className="relative z-10 mx-auto mt-1 flex w-fit items-center gap-1 rounded-full border border-white/20 bg-black/75 px-2 py-0.5 text-xs font-semibold text-white tabular-nums"
    >
      <GoalBall />
      {goals}
    </span>
  );
}
