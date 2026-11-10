"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { acceptGoal } from "@/app/_actions/goals";
import { Button } from "@/components/ui/button";
import { PACK_TIER_NAMES } from "@/lib/packs";
import { GOAL_LEVEL_NAMES, GOAL_LEVEL_TIER, type GoalSlot } from "@/lib/goals";
import { cn } from "@/lib/utils";

/** As 3 vagas do mês: escolher uma opção por nível (escolha única) e acompanhar o progresso depois do aceite. */
export function GoalsBoard({ slots }: { slots: GoalSlot[] }) {
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [pendingLevel, setPendingLevel] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "saved"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept(level: string) {
    const optionKey = picked[level];
    if (!optionKey) return;
    setMessage(null);
    setPendingLevel(level);
    startTransition(async () => {
      try {
        const result = await acceptGoal({ optionKey });
        setMessage({ kind: result.success ? "saved" : "error", text: result.message });
      } catch (error) {
        console.error("Falha ao aceitar o objetivo", error);
        setMessage({ kind: "error", text: "Não foi possível falar com o servidor. Confira a conexão." });
      } finally {
        setPendingLevel(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <p role="status" className={cn("text-sm", message.kind === "saved" ? "text-success" : "text-destructive")}>
          {message.text}
        </p>
      )}
      {slots.map((slot) => (
        <section key={slot.level} aria-labelledby={`goal-${slot.level}`} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`goal-${slot.level}`} className="font-display text-xl font-bold tracking-wide uppercase">
              {GOAL_LEVEL_NAMES[slot.level]}
            </h2>
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
              {PACK_TIER_NAMES[GOAL_LEVEL_TIER[slot.level]]}
            </span>
          </div>

          {slot.chosen ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center justify-between gap-2 text-sm">
                <span>{slot.chosen.label}</span>
                {slot.chosen.completedAt && <CheckCircle2Icon aria-hidden className="size-5 shrink-0 text-primary" />}
              </p>
              <progress
                value={Math.min(slot.chosen.progress, slot.chosen.target)}
                max={slot.chosen.target}
                aria-label={slot.chosen.label}
                className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
              />
              <p className="text-xs text-muted-foreground">
                {slot.chosen.completedAt
                  ? "Cumprido. O pacote está em Loja → Meus pacotes."
                  : `${Math.min(slot.chosen.progress, slot.chosen.target)} de ${slot.chosen.target}`}
              </p>
            </div>
          ) : (
            <>
              <ul role="radiogroup" aria-label={`Objetivos ${GOAL_LEVEL_NAMES[slot.level].toLowerCase()}`} className="flex flex-col gap-2">
                {slot.options.map((option) => {
                  const isChecked = picked[slot.level] === option.key;
                  return (
                    <li key={option.key}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isChecked}
                        disabled={isPending}
                        onClick={() => setPicked((current) => ({ ...current, [slot.level]: option.key }))}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          isChecked ? "border-primary bg-primary/10" : "bg-background hover:bg-muted",
                        )}
                      >
                        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", isChecked && "border-primary bg-primary")} />
                        {option.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button
                type="button"
                className="h-11"
                disabled={!picked[slot.level] || isPending}
                onClick={() => handleAccept(slot.level)}
              >
                {pendingLevel === slot.level ? "Aceitando…" : "Aceitar objetivo"}
              </Button>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
