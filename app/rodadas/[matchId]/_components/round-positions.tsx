"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { setRoundPositions } from "../_actions/set-round-positions";
import type { BoardPlayer, BoardTeam } from "../_data-access/get-match-board";

type RoundPositionsProps = {
  matchId: string;
  teams: BoardTeam[];
};

const POSITION_OPTIONS = [
  { label: "Linha", inGoal: false },
  { label: "Gol", inGoal: true },
] as const;

function isInGoal(entry: BoardPlayer): boolean {
  return entry.role === "goalkeeper";
}

/** Quem jogou fora da posição, em texto curto ("Gordão no gol"). */
function describeOffPosition(entries: BoardPlayer[]): string {
  const off = entries.filter((entry) => entry.playsInGoal !== null);
  if (off.length === 0) return "Toque em Ajustar se alguém trocou de posição";
  return off.map((entry) => `${entry.player.nickname} ${isInGoal(entry) ? "no gol" : "na linha"}`).join(" · ");
}

/**
 * "Posições da rodada" (organizador, rodada aberta; aprovado pelo dono do app em
 * 2026-10-23): marca quem jogou no gol sendo de linha (ou o contrário). A pessoa é
 * avaliada na posição em que jogou; a carta e o OVR não mudam.
 */
export function RoundPositions({ matchId, teams }: RoundPositionsProps) {
  const everyone = teams.flatMap((team) => [...team.starters, ...team.reserves]);
  const [isOpen, setIsOpen] = useState(false);
  const [inGoalById, setInGoalById] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(open: boolean) {
    // Abre sempre com o que está gravado.
    if (open) {
      setInGoalById(Object.fromEntries(everyone.map((entry) => [entry.player.id, isInGoal(entry)])));
      setMessage(null);
    }
    setIsOpen(open);
  }

  function handleSave() {
    const changes = everyone
      .filter((entry) => inGoalById[entry.player.id] !== isInGoal(entry))
      .map((entry) => ({ memberId: entry.player.id, inGoal: inGoalById[entry.player.id] }));
    if (changes.length === 0) {
      setIsOpen(false);
      return;
    }
    startTransition(async () => {
      const result = await setRoundPositions({ matchId, changes });
      if (!result.success) {
        setMessage({ tone: "error", text: result.message });
        return;
      }
      setIsOpen(false);
      setMessage(
        result.removedRatings > 0
          ? {
              tone: "info",
              text: `${result.removedRatings} ${result.removedRatings === 1 ? "nota saiu" : "notas saíram"} (eram da posição errada). Quem deu precisa avaliar de novo.`,
            }
          : null,
      );
    });
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
            <ArrowLeftRightIcon aria-hidden className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Alguém jogou fora da posição?</span>
            <span className="block truncate text-xs text-muted-foreground">
              {describeOffPosition(everyone)} · só o organizador vê
            </span>
          </span>
          <span className="text-sm font-medium text-primary">Ajustar</span>
        </button>
        {message && !isOpen && (
          <p role="status" className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {message.text}
          </p>
        )}
      </div>

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-hidden rounded-t-2xl">
          <SheetHeader className="border-b pb-4 text-left">
            <SheetTitle className="font-display text-2xl font-bold">Posições da rodada</SheetTitle>
            <SheetDescription>
              Marque quem jogou fora da posição. Vale só para esta rodada: a pessoa é avaliada na posição em que
              jogou, concorre aos prêmios dela e ganha XP e CanchaCoins, mas a carta e o OVR não mudam.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
            {teams.map((team) => (
              <div key={team.number} className="flex flex-col gap-1">
                <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-block size-3 rounded-full",
                      team.number === 1 ? "bg-white" : "border border-white/40 bg-black",
                    )}
                  />
                  Time {team.name}
                </h3>
                <ul className="flex flex-col">
                  {[...team.starters, ...team.reserves].map((entry) => {
                    const inGoal = inGoalById[entry.player.id] ?? isInGoal(entry);
                    const isOff = inGoal !== (entry.player.role === "goalkeeper");
                    return (
                      <li key={entry.player.id} className="flex items-center gap-3 border-t py-2.5 first:border-t-0">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{entry.player.nickname}</span>
                          <span className="block text-xs text-muted-foreground">
                            Cadastro: {entry.player.position}
                            {isOff && <span className="text-amber-400"> · jogou {inGoal ? "no gol" : "na linha"}</span>}
                          </span>
                        </span>
                        <div
                          role="radiogroup"
                          aria-label={`Posição de ${entry.player.nickname} na rodada`}
                          className="flex rounded-lg border p-0.5 text-sm"
                        >
                          {POSITION_OPTIONS.map((option) => {
                            const isActive = option.inGoal === inGoal;
                            return (
                              <button
                                key={option.label}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                onClick={() =>
                                  setInGoalById((current) => ({ ...current, [entry.player.id]: option.inGoal }))
                                }
                                className={cn(
                                  "h-9 min-w-14 rounded-md px-3 font-medium transition-colors",
                                  isActive
                                    ? isOff
                                      ? "bg-amber-400 text-black"
                                      : "bg-muted text-foreground"
                                    : "text-muted-foreground",
                                )}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Se alguém já deu nota para quem você trocar, essas notas saem (eram da posição errada) e quem deu precisa
              avaliar de novo.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {message?.tone === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {message.text}
              </p>
            )}
            <Button size="lg" className="h-12 w-full text-base" disabled={isPending} onClick={handleSave}>
              {isPending ? "Salvando…" : "Salvar posições"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
