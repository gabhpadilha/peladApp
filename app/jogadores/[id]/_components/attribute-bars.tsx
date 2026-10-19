import { SectionTitle } from "@/components/section-title";
import {
  ATTRIBUTE_LABELS,
  GOALKEEPER_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  type Player,
  type PlayerAttribute,
} from "@/types/player";

type AttributeBarsProps = {
  player: Player;
  /** Média da pelada em cada atributo (mesma função), marcada como um traço na barra. */
  groupAverages: Partial<Record<PlayerAttribute, number>>;
};

/**
 * Média de cada atributo em todas as avaliações recebidas (0–99), com a média
 * da pelada como referência. A diferença também vem em texto (nunca só visual).
 */
export function AttributeBars({ player, groupAverages }: AttributeBarsProps) {
  const keys: readonly PlayerAttribute[] =
    player.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const values: Partial<Record<PlayerAttribute, number | null>> = player.attributes;

  return (
    <section aria-labelledby="attributes-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <SectionTitle id="attributes-title">Atributos</SectionTitle>

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
        {keys.map((key) => {
          const value = values[key] ?? null;
          const average = groupAverages[key];
          const difference = value !== null && average !== undefined ? value - average : null;
          return (
            <div key={key} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 text-sm">
              <dt className="truncate text-muted-foreground">{ATTRIBUTE_LABELS[key].name}</dt>
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
                {average !== undefined && (
                  <span className="sr-only">
                    , média da pelada {average}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
