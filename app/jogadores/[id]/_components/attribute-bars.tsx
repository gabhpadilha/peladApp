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
};

/** Média de cada atributo em todas as avaliações recebidas (0–99). */
export function AttributeBars({ player }: AttributeBarsProps) {
  const keys: readonly PlayerAttribute[] =
    player.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const values: Partial<Record<PlayerAttribute, number | null>> = player.attributes;

  return (
    <section aria-labelledby="attributes-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <SectionTitle id="attributes-title" aside="média de todas as notas">
        Atributos
      </SectionTitle>

      <dl className="flex flex-col gap-3">
        {keys.map((key) => {
          const value = values[key] ?? null;
          return (
            <div key={key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm">
              <dt className="truncate text-muted-foreground">{ATTRIBUTE_LABELS[key].name}</dt>
              <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  // Largura vem do dado.
                  style={{ width: `${value ?? 0}%` }}
                />
              </div>
              <dd className="text-right font-display text-lg font-bold tabular-nums">
                {value ?? "–"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
