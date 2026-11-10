import Link from "next/link";
import { ChevronRightIcon, TargetIcon } from "lucide-react";
import { SectionTitle } from "@/components/section-title";
import type { MyGoals } from "@/app/objetivos/_data-access/get-goals";
import { GOAL_LEVEL_NAMES, formatDaysLeft } from "@/lib/goals";
import { cn } from "@/lib/utils";

/** Cartão da Home: objetivos do mês (3 vagas) e a porta para `/objetivos`. Só aparece em pelada com pacotes ligados. */
export function GoalsCard({ goals }: { goals: MyGoals }) {
  const chosenSlots = goals.slots.filter((slot) => slot.chosen);
  return (
    <section aria-labelledby="goals-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <SectionTitle id="goals-title" aside={formatDaysLeft(goals.month.daysLeft)}>
        Objetivos de {goals.month.name}
      </SectionTitle>

      {chosenSlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Escolha 3 objetivos e ganhe até 3 pacotes de skin. Vale só o que você fizer depois de aceitar.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {goals.slots.map((slot) => (
            <li key={slot.level} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  slot.chosen?.completedAt ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {slot.chosen?.completedAt ? "✓" : GOAL_LEVEL_NAMES[slot.level][0]}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {slot.chosen
                  ? `${slot.chosen.label} · ${slot.chosen.completedAt ? "cumprido" : `${slot.chosen.progress} de ${slot.chosen.target}`}`
                  : `${GOAL_LEVEL_NAMES[slot.level]}: ainda não escolhido`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {goals.unopenedPacks > 0 && (
        <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
          {goals.unopenedPacks === 1 ? "Você ganhou 1 pacote!" : `Você ganhou ${goals.unopenedPacks} pacotes!`} Em Loja → Meus pacotes.
        </p>
      )}

      <Link
        href="/objetivos"
        className="flex h-11 items-center justify-between rounded-lg bg-secondary px-3 text-sm font-medium transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2">
          <TargetIcon aria-hidden className="size-4 text-primary" />
          Ver objetivos
        </span>
        <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground" />
      </Link>
    </section>
  );
}
