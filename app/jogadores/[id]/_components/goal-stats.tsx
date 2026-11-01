import { GoalBall } from "@/components/goal-ball";
import { SectionTitle } from "@/components/section-title";
import type { AthleteProfile } from "../_data-access/get-athlete-profile";

const perGameFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Gols confirmados pelos colegas: total, média por jogo e a melhor rodada. */
export function GoalStats({ stats }: { stats: NonNullable<AthleteProfile["goalStats"]> }) {
  const blocks = [
    { value: String(stats.total), label: "no total" },
    { value: perGameFormatter.format(stats.perGame), label: "por jogo" },
    { value: stats.best ? String(stats.best.goals) : "–", label: stats.best ? `melhor · R${stats.best.round}` : "melhor rodada" },
  ];
  return (
    <section aria-labelledby="goals-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <SectionTitle id="goals-title">Gols</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {blocks.map((block, index) => (
          <div key={block.label} className="flex flex-col items-center rounded-lg bg-muted/40 px-2 py-3 text-center">
            <span className="flex items-center gap-1 font-display text-3xl font-bold tabular-nums">
              {index === 0 && <GoalBall className="size-5" />}
              {block.value}
            </span>
            <span className="text-xs text-muted-foreground">{block.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Só gols confirmados por 3 colegas, desde que a contagem começou.</p>
    </section>
  );
}
