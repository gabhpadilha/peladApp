import { CalendarCheckIcon, FlameIcon, TrendingDownIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { getAttributeExtremes } from "@/lib/athlete-insights";
import type { MatchPerformance } from "@/lib/players";
import { ATTRIBUTE_LABELS, type Player } from "@/types/player";

type AthleteHighlightsProps = {
  player: Player;
  performances: MatchPerformance[];
  gamesPlayed: number;
};

type Highlight = { label: string; icon: LucideIcon; value: string; detail: string };

/** Quatro destaques rápidos: melhor rodada, ponto forte, a melhorar e presença. */
export function AthleteHighlights({ player, performances, gamesPlayed }: AthleteHighlightsProps) {
  const best = performances
    .filter((performance) => performance.score !== null)
    .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .at(0);
  const extremes = getAttributeExtremes(player);
  const closedRounds = performances.length;

  const highlights: Highlight[] = [
    {
      label: "Melhor rodada",
      icon: FlameIcon,
      value: best?.score != null ? String(best.score) : "–",
      detail: best ? `rodada ${best.match.round}` : "sem notas ainda",
    },
    {
      label: "Ponto forte",
      icon: TrendingUpIcon,
      value: extremes ? String(extremes.strongest.value) : "–",
      detail: extremes ? ATTRIBUTE_LABELS[extremes.strongest.key].name : "sem notas ainda",
    },
    {
      label: "A melhorar",
      icon: TrendingDownIcon,
      value: extremes ? String(extremes.weakest.value) : "–",
      detail: extremes ? ATTRIBUTE_LABELS[extremes.weakest.key].name : "sem notas ainda",
    },
    {
      label: "Presença",
      icon: CalendarCheckIcon,
      value: closedRounds > 0 ? `${Math.round((gamesPlayed / closedRounds) * 100)}%` : "–",
      detail: closedRounds > 0 ? `${gamesPlayed} de ${closedRounds} rodadas` : "nenhuma rodada fechada",
    },
  ];

  return (
    <section aria-labelledby="highlights-title" className="flex flex-col gap-3">
      <h2 id="highlights-title" className="sr-only">
        Destaques
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {highlights.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <div key={highlight.label} className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{highlight.label}</span>
              </dt>
              <dd className="flex min-w-0 flex-col">
                <span className="font-display text-3xl leading-tight font-bold tabular-nums">{highlight.value}</span>
                <span className="truncate text-xs text-muted-foreground">{highlight.detail}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
