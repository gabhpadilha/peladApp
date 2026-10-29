import { AWARD_ICONS } from "@/components/award-icons";
import { cn } from "@/lib/utils";
import { AWARD_KINDS, AWARD_LABELS, awardOrder, type Award, type AwardKind } from "@/types/award";

type CollectionSummaryProps = {
  awards: Award[];
  title: string;
};

/**
 * Cabeçalho da coleção: total e quantas cartas de cada prêmio em jogo, mais os prêmios
 * que saíram do jogo que a pessoa ganhou (para a soma bater com o total).
 */
export function CollectionSummary({ awards, title }: CollectionSummaryProps) {
  const countByKind = new Map<AwardKind, number>();
  for (const award of awards) countByKind.set(award.kind, (countByKind.get(award.kind) ?? 0) + 1);
  const retiredOwned = [...countByKind.keys()]
    .filter((kind) => !(AWARD_KINDS as readonly AwardKind[]).includes(kind))
    .toSorted((a, b) => awardOrder(a) - awardOrder(b));
  const kinds: readonly AwardKind[] = [...AWARD_KINDS, ...retiredOwned];

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

      {/* 5 colunas, ícone em cima e nome com quebra: cabe no celular sem cortar "Bola Murcha". */}
      <dl className="grid grid-cols-5 gap-x-1 gap-y-3">
        {kinds.map((kind) => {
          const Icon = AWARD_ICONS[kind];
          const count = countByKind.get(kind) ?? 0;
          return (
            <div
              key={kind}
              className={cn("flex min-w-0 flex-col items-center gap-0.5 text-center", count === 0 && "opacity-40")}
            >
              <Icon aria-hidden className="mb-0.5 size-5 shrink-0" />
              {/* Na tela: ícone, número e nome (o nome é o <dt>, que vem antes no HTML). */}
              <dt className="order-last text-[0.6875rem] leading-tight text-muted-foreground">
                {AWARD_LABELS[kind].title}
              </dt>
              <dd className="font-display text-xl leading-none font-extrabold tabular-nums">{count}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
