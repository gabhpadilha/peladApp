import { GoalBall } from "@/components/goal-ball";
import { SectionTitle } from "@/components/section-title";
import { cn } from "@/lib/utils";
import type { GoalStatsData } from "../_data-access/get-athlete-profile";

const perGameFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Gols confirmados pelos colegas (3 "sim"): a única estatística real do jogo, então ganha destaque. Total grande, por
 * jogo, melhor rodada e em quantos jogos fez gol e o gráfico de gols por rodada; a posição na artilharia vem no
 * título e a lista da pelada fica na home. Sempre aparece (mesmo sem gols) e explica o que falta.
 */
export function GoalStats({ stats }: { stats: GoalStatsData }) {
  const maxGoals = Math.max(1, ...stats.byRound.map((entry) => entry.goals));
  const blocks = [
    { value: perGameFormatter.format(stats.perGame), label: "por jogo" },
    { value: stats.best ? String(stats.best.goals) : "–", label: stats.best ? `melhor · R${stats.best.round}` : "melhor rodada" },
    { value: stats.games > 0 ? `${stats.goalGames}/${stats.games}` : "–", label: "jogos com gol" },
  ];

  return (
    <section aria-labelledby="goals-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <SectionTitle id="goals-title" aside={stats.rank !== null ? `${stats.rank}º na artilharia` : null}>
        Gols
      </SectionTitle>

      <div className="flex items-center gap-4 rounded-lg bg-muted/40 px-4 py-3">
        <GoalBall className="size-10" />
        <div className="flex flex-col leading-none">
          <span className="font-display text-6xl font-extrabold tabular-nums">{stats.total}</span>
          <span className="mt-1 text-sm text-muted-foreground">{stats.total === 1 ? "gol confirmado" : "gols confirmados"}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {blocks.map((block) => (
          <div key={block.label} className="flex flex-col items-center rounded-lg bg-muted/40 px-2 py-3 text-center">
            <span className="font-display text-2xl font-bold tabular-nums">{block.value}</span>
            <span className="text-xs text-muted-foreground">{block.label}</span>
          </div>
        ))}
      </div>

      {stats.games === 0 ? (
        <p className="text-sm text-muted-foreground">
          Os gols aparecem aqui quando fechar a primeira rodada com a contagem: cada um informa os seus e três colegas confirmam.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">Gols por rodada</h3>
          <ol className="flex h-28 items-end gap-1.5 border-b border-border sm:gap-3">
            {stats.byRound.map((entry) => (
              <li
                key={entry.round}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                aria-label={`Rodada ${entry.round}: ${entry.goals === 1 ? "1 gol" : `${entry.goals} gols`}`}
              >
                <span className={cn("text-xs font-semibold tabular-nums", entry.goals === 0 && "text-muted-foreground")}>{entry.goals}</span>
                <span
                  aria-hidden
                  className={cn("w-full max-w-10 rounded-t-md", entry.goals > 0 ? "bg-primary" : "bg-muted")}
                  // Altura vem do dado; rodada sem gol fica uma linha fina.
                  style={{ height: `${entry.goals > 0 ? Math.max(12, (entry.goals / maxGoals) * 70) : 4}%` }}
                />
              </li>
            ))}
          </ol>
          <ol className="flex gap-1.5 sm:gap-3">
            {stats.byRound.map((entry) => (
              <li key={entry.round} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground tabular-nums">
                R{entry.round}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Só gols confirmados por 3 colegas, desde que a contagem começou.</p>
    </section>
  );
}
