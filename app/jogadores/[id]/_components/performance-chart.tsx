import { SectionTitle } from "@/components/section-title";
import { formatShortDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { MatchPerformance } from "@/lib/players";

/** Linhas de grade (escala 0–99 da carta). */
const GRID_LINES = [25, 50, 75] as const;
const GRID_POSITION: Record<(typeof GRID_LINES)[number], string> = {
  25: "bottom-1/4",
  50: "bottom-1/2",
  75: "bottom-3/4",
};

type PerformanceChartProps = {
  performances: MatchPerformance[];
  bestScore: number | null;
};

/**
 * Nota recebida em cada rodada fechada (média das avaliações, 0–99).
 * Uma série só: sem legenda. A tabela de histórico abaixo é a visão em tabela.
 */
export function PerformanceChart({ performances, bestScore }: PerformanceChartProps) {
  const latest = performances.findLast((performance) => performance.score !== null);

  return (
    <section aria-labelledby="performance-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <SectionTitle id="performance-title" aside={bestScore !== null ? `melhor nota ${bestScore}` : null}>
        Desempenho por rodada
      </SectionTitle>

      {performances.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          O gráfico aparece quando a primeira rodada for fechada.
        </p>
      ) : (
      <>
      <div className="relative ml-6 h-48">
        {GRID_LINES.map((line) => (
          <div
            key={line}
            aria-hidden
            className={cn("absolute inset-x-0 border-t border-dashed border-border", GRID_POSITION[line])}
          >
            <span className="absolute -top-2 -left-6 w-5 text-right text-[10px] text-muted-foreground tabular-nums">
              {line}
            </span>
          </div>
        ))}

        <ol className="relative flex h-full items-end gap-1.5 border-b border-border sm:gap-3">
          {performances.map((performance) => {
            const isLatest = performance === latest;
            const label = `Rodada ${performance.match.round}, ${formatShortDate(performance.match.date)}: ${
              performance.score === null
                ? performance.wasPresent
                  ? "sem notas"
                  : "ausente"
                : `nota ${performance.score} (${performance.evaluationCount} avaliações)`
            }`;

            return (
              <li
                key={performance.match.id}
                tabIndex={0}
                aria-label={label}
                className="group relative flex h-full flex-1 flex-col items-center justify-end outline-none"
              >
                {/* Área de toque maior que a barra; tooltip no hover/foco */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md group-hover:block group-focus-visible:block"
                >
                  {label}
                </span>

                {performance.score === null ? (
                  <span className="mb-1 text-xs text-muted-foreground">–</span>
                ) : (
                  <>
                    {isLatest && (
                      <span className="mb-1 font-display text-sm font-bold tabular-nums">
                        {performance.score}
                      </span>
                    )}
                    <span
                      className={cn(
                        "w-full max-w-10 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-100",
                        isLatest ? "opacity-100" : "opacity-55",
                      )}
                      // Altura vem do dado: único estilo inline do gráfico.
                      style={{ height: `${performance.score}%` }}
                    />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <ol aria-hidden className="ml-6 flex gap-1.5 sm:gap-3">
        {performances.map((performance) => (
          <li key={performance.match.id} className="flex-1 text-center text-xs text-muted-foreground">
            R{performance.match.round}
          </li>
        ))}
      </ol>
      </>
      )}
    </section>
  );
}
