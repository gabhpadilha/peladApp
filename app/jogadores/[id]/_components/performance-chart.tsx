import { SectionTitle } from "@/components/section-title";
import { formatShortDate } from "@/lib/format-date";
import { CAREER_WINDOW_ROUNDS } from "@/lib/ovr";
import { cn } from "@/lib/utils";
import type { MatchPerformance } from "@/lib/players";

/** Linhas de grade (escala 0–99 da carta). */
const GRID_LINES = [25, 50, 75] as const;
const GRID_POSITION: Record<(typeof GRID_LINES)[number], string> = {
  25: "bottom-1/4",
  50: "bottom-1/2",
  75: "bottom-3/4",
};

/**
 * Limite de rodadas no gráfico (pedido do dono do app em 2026-11-12: "as últimas 10, e circulado as últimas cinco"): as 5 que
 * formam o OVR e mais 5 antes delas, para o gráfico não apertar com o acúmulo de rodadas; a tabela de histórico tem todas.
 */
const CHART_ROUNDS = 10;

type PerformanceChartProps = {
  performances: MatchPerformance[];
  bestScore: number | null;
};

/** Rodadas que formam o OVR da carta: as últimas `CAREER_WINDOW_ROUNDS` com nota na posição do cadastro (espelha `computeCareerCard`). */
function getOvrWindow(performances: readonly MatchPerformance[]): Set<string> {
  return new Set(
    performances
      .filter((performance) => performance.score !== null && !performance.offPosition)
      .slice(-CAREER_WINDOW_ROUNDS)
      .map((performance) => performance.match.id),
  );
}

/**
 * Nota recebida nas últimas rodadas fechadas em que o jogador jogou (a nota da rodada, 0–99), com uma moldura em volta
 * das que formam o OVR da carta (pedido do dono do app em 2026-11-12). Uma série só: sem legenda.
 */
export function PerformanceChart({ performances: allPerformances, bestScore }: PerformanceChartProps) {
  const played = allPerformances.filter((performance) => performance.wasPresent);
  const windowIds = getOvrWindow(played);
  const performances = played.slice(-CHART_ROUNDS);
  const latest = performances.findLast((performance) => performance.score !== null);
  // A moldura vai da primeira rodada que conta até a última jogada (rodada fora da posição no meio fica apagada dentro dela).
  const frameStart = performances.findIndex((performance) => windowIds.has(performance.match.id));
  const before = frameStart === -1 ? performances : performances.slice(0, frameStart);
  const framed = frameStart === -1 ? [] : performances.slice(frameStart);
  const windowSize = windowIds.size;

  const renderColumn = (performance: MatchPerformance) => {
    const isLatest = performance === latest;
    const counts = windowIds.has(performance.match.id);
    const label = `Rodada ${performance.match.round}, ${formatShortDate(performance.match.date)}: ${
      performance.score === null
        ? "sem notas"
        : `nota ${performance.score} (${performance.evaluationCount} avaliações)${counts ? ", conta no OVR" : ""}`
    }`;

    return (
      <li key={performance.match.id} className="flex min-w-0 flex-1 flex-col items-center gap-2">
        <div
          tabIndex={0}
          aria-label={label}
          className="group relative flex h-48 w-full flex-col items-center justify-end outline-none"
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
              {isLatest && <span className="mb-1 font-display text-sm font-bold tabular-nums">{performance.score}</span>}
              <span
                className={cn(
                  "w-full max-w-10 rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-100",
                  isLatest ? "opacity-100" : counts ? "opacity-60" : "opacity-25",
                )}
                // Altura vem do dado: único estilo inline do gráfico.
                style={{ height: `${performance.score}%` }}
              />
            </>
          )}
        </div>
        {/* Da rodada 100 em diante sai o "R": com 10 colunas no celular, "R120" alargava a coluna e empurrava a moldura para fora. */}
        <span className={cn("text-xs tracking-tight tabular-nums", counts ? "text-foreground" : "text-muted-foreground")}>
          {performance.match.round >= 100 ? performance.match.round : `R${performance.match.round}`}
        </span>
      </li>
    );
  };

  return (
    <section aria-labelledby="performance-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <SectionTitle id="performance-title" aside={bestScore !== null ? `melhor nota ${bestScore}` : null}>
        Desempenho por rodada
      </SectionTitle>

      {performances.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          O gráfico aparece depois da primeira rodada fechada em que ele jogar.
        </p>
      ) : (
        <div className="relative ml-6">
          {/* Grade atrás das colunas, na altura das barras (h-48 a partir do topo das colunas, com o recuo da moldura). */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-2 h-48 border-b border-border">
            {GRID_LINES.map((line) => (
              <div key={line} className={cn("absolute inset-x-0 border-t border-dashed border-border", GRID_POSITION[line])}>
                <span className="absolute -top-2 -left-6 w-5 text-right text-xs text-muted-foreground tabular-nums">{line}</span>
              </div>
            ))}
          </div>

          <div className="relative flex items-stretch gap-1.5 sm:gap-3">
            {before.length > 0 && (
              <ol className="flex min-w-0 basis-0 gap-1.5 pt-2 pb-1.5 sm:gap-3" style={{ flexGrow: before.length }}>
                {before.map(renderColumn)}
              </ol>
            )}
            {framed.length > 0 && (
              <div
                className="flex min-w-0 basis-0 flex-col rounded-xl border-2 border-primary/70 bg-primary/[0.06]"
                // Largura proporcional ao número de rodadas de cada grupo, para todas as barras terem a mesma largura.
                style={{ flexGrow: framed.length }}
              >
                {/* 6 px em cima e 4 px embaixo: com os 2 px da moldura, as barras ficam na mesma linha da grade e das de fora. */}
                <ol className="flex gap-1.5 px-1 pt-1.5 pb-1 sm:gap-3">{framed.map(renderColumn)}</ol>
              </div>
            )}
          </div>

          {windowSize > 0 && (
            <p className="mt-2 text-right text-xs text-primary">
              {windowSize === 1 ? "Esta rodada forma o OVR da carta" : `Estas ${windowSize} rodadas formam o OVR da carta`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
