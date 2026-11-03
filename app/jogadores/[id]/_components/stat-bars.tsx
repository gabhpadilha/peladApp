import { SectionTitle } from "@/components/section-title";
import { getCardStats } from "@/lib/card-stats";
import type { Player } from "@/types/player";

type StatBarsProps = {
  player: Player;
  /** Média da pelada em cada estatística (mesma função), pelo nome, marcada como um traço na barra. */
  groupAverages: Record<string, number>;
};

/**
 * As 3 estatísticas da carta (Ataque, Criação e Defesa; no gol, Paredão, Leitura e Saída), a média de cada uma em
 * todas as avaliações recebidas (0–99), com a média da pelada como referência. A diferença também vem em texto
 * (nunca só visual). Mostra o que a carta mostra e o que se vota (decisão do dono do app em 2026-11-02).
 */
export function StatBars({ player, groupAverages }: StatBarsProps) {
  const stats = getCardStats(player);

  return (
    <section aria-labelledby="attributes-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <SectionTitle id="attributes-title">Estatísticas da carta</SectionTitle>

      <p className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2 w-4 rounded-full bg-primary" />
          {player.nickname}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-0.5 rounded-full bg-foreground/70" />
          média da pelada
        </span>
      </p>

      <dl className="flex flex-col gap-3">
        {stats.map(({ label, value }) => {
          const average = groupAverages[label];
          const difference = value !== null && average !== undefined ? value - average : null;
          return (
            <div key={label} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 text-sm">
              <dt className="truncate text-muted-foreground">{label}</dt>
              <div aria-hidden className="relative h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  // Largura vem do dado.
                  style={{ width: `${value ?? 0}%` }}
                />
                {average !== undefined && (
                  <span
                    className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
                    // Posição vem do dado.
                    style={{ left: `${average}%` }}
                  />
                )}
              </div>
              <dd className="flex items-baseline justify-end gap-1">
                <span className="font-display text-lg font-bold tabular-nums">{value ?? "–"}</span>
                {difference !== null && difference !== 0 && (
                  <span className={difference > 0 ? "text-xs text-success tabular-nums" : "text-xs text-destructive tabular-nums"}>
                    {difference > 0 ? `+${difference}` : difference}
                  </span>
                )}
                {average !== undefined && <span className="sr-only">, média da pelada {average}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
