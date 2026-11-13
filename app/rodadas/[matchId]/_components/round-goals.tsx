"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheckIcon, ClipboardCheckIcon, HourglassIcon, UserRoundXIcon } from "lucide-react";
import { organizerConfirmGoals, reportGoals, unlockRatings } from "@/app/_actions/match-goals";
import { GoalBall, formatGoals } from "@/components/goal-ball";
import { GoalStepper } from "@/components/goal-stepper";
import { GoalsVoteList } from "@/components/goals-vote-list";
import { Button } from "@/components/ui/button";
import { GOALS_MIN_CONFIRMATIONS, goalsToCheck } from "@/lib/goal-rules";
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
  // Depois que as notas abrem, só o organizador corrige gols já informados (etapa dos gols fechada).
  const canEdit = board.isOrganizer || !board.goals.ratingsOpen;

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
              <span className="text-primary"> · confirmados{mine.organizerConfirmed && mine.yes < GOALS_MIN_CONFIRMATIONS ? " pelo organizador" : ""}</span>
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
      {canEdit ? (
        <button type="button" className="min-h-11 px-2 text-sm font-medium text-primary" onClick={() => setIsEditing(true)}>
          Corrigir
        </button>
      ) : (
        <p className="max-w-32 text-right text-xs text-muted-foreground">Etapa dos gols fechada. Para corrigir, fale com o organizador.</p>
      )}
    </div>
  );
}

/** Organizador: marca os gols de quem ainda não informou e "Liberar as notas". */
function OrganizerGoals({ board }: { board: MatchBoard }) {
  const everyone = board.teams.flatMap((team) => [...team.starters, ...team.reserves]);
  const missing = everyone.filter((entry) => !board.goals.byMember[entry.player.id] && entry.player.id !== board.memberId);
  const [values, setValues] = useState<Record<string, number>>({});
  const { report, error, isPending } = useReportGoals(board.match.id);
  const router = useRouter();
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, startUnlock] = useTransition();

  if (missing.length === 0 && board.goals.ratingsOpen) return null;
  const pendingCheck = board.goals.pendingCheckIds.length;

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
          <span className="block text-sm font-medium">
            {missing.length > 0 ? "Ainda não informaram os gols" : "Ainda não concluíram a conferência dos gols"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {missing.length > 0
              ? `${missing.length === 1 ? "1 jogador" : `${missing.length} jogadores`} · você pode marcar por eles`
              : `${pendingCheck === 1 ? "1 jogador" : `${pendingCheck} jogadores`} · você pode liberar as notas`}
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
 * Organizador: confirma sozinho os gols de quem não juntou os 3 "sim" dos colegas (2026-11-13, pedido do dono do app: quase todos
 * já votaram e faltam confirmações). Vale como os 3 "sim"; nunca os próprios gols; corrigir o número apaga a confirmação.
 */
function OrganizerConfirmGoals({ board, nameById }: { board: MatchBoard; nameById: Map<string, string> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const items = Object.values(board.goals.byMember)
    .filter((goal) => goal.goals > 0 && goal.memberId !== board.memberId && goal.yes < GOALS_MIN_CONFIRMATIONS)
    .sort((a, b) => Number(a.organizerConfirmed) - Number(b.organizerConfirmed));
  if (items.length === 0) return null;
  const waiting = items.filter((goal) => !goal.organizerConfirmed).length;

  function handleConfirm(memberId: string, confirmed: boolean) {
    setError(null);
    setPendingId(memberId);
    startTransition(async () => {
      const result = await organizerConfirmGoals({ matchId: board.match.id, memberId, confirmed });
      setPendingId(null);
      if (!result.success) setError(result.message);
      else router.refresh();
    });
  }

  return (
    <details className="group rounded-xl border bg-card" open={waiting > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <BadgeCheckIcon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Gols sem as {GOALS_MIN_CONFIRMATIONS} confirmações</span>
          <span className="block text-xs text-muted-foreground">
            {waiting > 0 ? `${waiting === 1 ? "1 jogador" : `${waiting} jogadores`} · você pode confirmar sozinho` : "Todos confirmados por você"}
          </span>
        </span>
        <span className="text-sm font-medium text-primary group-open:hidden">Abrir</span>
      </summary>
      <ul className="flex flex-col divide-y border-t">
        {items.map((goal) => (
          <li key={goal.memberId} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{nameById.get(goal.memberId) ?? "Jogador"}</p>
              <p className="text-xs text-muted-foreground">
                {formatGoals(goal.goals)} ·{" "}
                {goal.organizerConfirmed ? <span className="text-primary">confirmados pelo organizador</span> : `${goal.yes} de ${GOALS_MIN_CONFIRMATIONS} confirmações`}
              </p>
            </div>
            {goal.organizerConfirmed ? (
              <Button size="sm" variant="ghost" disabled={pendingId !== null} onClick={() => handleConfirm(goal.memberId, false)}>
                Desfazer
              </Button>
            ) : (
              <Button size="sm" disabled={pendingId !== null} onClick={() => handleConfirm(goal.memberId, true)}>
                {pendingId === goal.memberId ? "Confirmando…" : "Confirmar"}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
        Sua confirmação vale como as {GOALS_MIN_CONFIRMATIONS} dos colegas. Se o número de gols for corrigido, ela sai.
      </p>
      {error && <p role="alert" className="px-3 pb-3 text-sm text-destructive">{error}</p>}
    </details>
  );
}

/**
 * Etapa dos gols na mesa tática: os seus gols, a espera pelos dos outros (as notas abrem
 * quando todos informam) e, para o organizador, os gols de quem ainda não informou.
 */
export function RoundGoals({ board }: { board: MatchBoard }) {
  if (board.match.status !== "open") return null;
  const everyone = board.teams.flatMap((team) => [...team.starters, ...team.reserves]);
  const nameById = new Map(everyone.map((entry) => [entry.player.id, entry.player.nickname]));
  const namesOf = (ids: string[]) => ids.flatMap((id) => (nameById.has(id) ? [nameById.get(id) as string] : []));
  const mine = board.goals.byMember[board.memberId];
  const { missingIds, pendingCheckIds, myChecked, ratingsOpen } = board.goals;
  // Gols dos colegas que ainda não respondi (depois que as notas abrem, só sobra isso se o organizador corrigiu um número).
  const lateItems = ratingsOpen
    ? goalsToCheck(board.goals, board.memberId).filter((goal) => board.goals.myVotes[goal.memberId] === undefined)
    : [];

  return (
    <div className="flex flex-col gap-3">
      {board.isPresent && <MyGoals board={board} />}
      {board.isPresent && !ratingsOpen && mine && missingIds.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <HourglassIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Etapa 1 de 2, gols. Falta {formatGoalsMissing(namesOf(missingIds))} informar. Depois vocês conferem os números e as notas abrem.
          </span>
        </p>
      )}
      {board.isPresent && !ratingsOpen && mine && missingIds.length === 0 && !myChecked && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <p className="flex items-start gap-2 text-sm">
            <ClipboardCheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Todos informaram os gols. Confira os números dos colegas para as notas abrirem.</span>
          </p>
          <Button asChild size="lg" className="h-11 text-base">
            <Link href={`/avaliar/${board.match.id}`}>Conferir os gols</Link>
          </Button>
        </div>
      )}
      {board.isPresent && !ratingsOpen && mine && missingIds.length === 0 && myChecked && (
        <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <HourglassIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>Sua conferência está feita. Falta {formatGoalsMissing(namesOf(pendingCheckIds))} concluir para as notas abrirem.</span>
        </p>
      )}
      {board.isPresent && lateItems.length > 0 && (
        <details className="group rounded-xl border bg-card">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4">
            <span className="min-w-0 flex-1 text-sm font-medium">
              Gols para confirmar ({lateItems.length})
              <span className="block text-xs font-normal text-muted-foreground">O organizador corrigiu um número: confirme de novo.</span>
            </span>
            <span className="text-sm font-medium text-primary group-open:hidden">Abrir</span>
          </summary>
          <div className="border-t p-3">
            <GoalsVoteList
              key={lateItems.map((goal) => `${goal.memberId}:${goal.goals}`).join("|")}
              matchId={board.match.id}
              items={lateItems.map((goal) => ({ goal, nickname: nameById.get(goal.memberId) ?? "Jogador", myVote: board.goals.myVotes[goal.memberId] }))}
            />
          </div>
        </details>
      )}
      {board.isOrganizer && <OrganizerGoals board={board} />}
      {board.isOrganizer && <OrganizerConfirmGoals board={board} nameById={nameById} />}
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
