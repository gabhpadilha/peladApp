import { BOOSTED_AWARDS } from "@/lib/award-bonus";
import { AWARD_KINDS, AWARD_LABELS, type Award, type AwardKind } from "@/types/award";
import { AWARD_ICONS } from "./award-icons";

type CollectionSummaryProps = {
  awards: Award[];
  title: string;
};

/** Cabeçalho da coleção: total e quantas cartas de cada prêmio. */
export function CollectionSummary({ awards, title }: CollectionSummaryProps) {
  const countByKind = Object.fromEntries(
    AWARD_KINDS.map((kind) => [kind, awards.filter((award) => award.kind === kind).length]),
  ) as Record<AwardKind, number>;

  return (
    <section aria-labelledby="collection-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Cartas especiais</p>
          <h1 id="collection-title" className="truncate font-display text-3xl font-extrabold uppercase">
            {title}
          </h1>
        </div>
        <p className="shrink-0 text-right">
          <span className="block font-display text-4xl leading-none font-extrabold tabular-nums">{awards.length}</span>
          <span className="text-xs text-muted-foreground">{awards.length === 1 ? "carta" : "cartas"}</span>
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {AWARD_KINDS.map((kind) => {
          const Icon = AWARD_ICONS[kind];
          return (
            // justify-between: o número fica na mesma altura mesmo com nome de 1 ou 2 linhas.
            <div key={kind} className="flex min-w-0 flex-col justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
              {/* Ícone em cima e nome com quebra: "Gol da Semana" não é cortado no celular. */}
              <dt className="flex min-w-0 flex-col gap-1 text-xs leading-tight text-muted-foreground">
                <Icon aria-hidden className="size-4 shrink-0" />
                <span>{AWARD_LABELS[kind].title}</span>
              </dt>
              <dd className="flex flex-col">
                <span className="font-display text-2xl leading-tight font-bold tabular-nums">{countByKind[kind]}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {BOOSTED_AWARDS.includes(kind) ? "+1 em tudo" : "sem bônus"}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
