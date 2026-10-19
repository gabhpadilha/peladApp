import { GhostIcon, SparklesIcon, type LucideIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { BOOSTED_AWARDS, withAwardBonus } from "@/lib/award-bonus";
import { type CardThemeKey, type CurrentCardEvent } from "@/lib/card-themes";
import { formatShortDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { AWARD_KINDS, AWARD_LABELS } from "@/types/award";
import type { Player } from "@/types/player";

type EventCopy = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** O que cada carta tem de diferente nesse tema. */
  looks: Record<(typeof AWARD_KINDS)[number], string>;
};

const EVENT_COPY: Record<CardThemeKey, EventCopy> = {
  halloween: {
    eyebrow: "Evento de outubro",
    title: "Halloween na pelada",
    description:
      "Toda rodada jogada em outubro distribui cartas especiais assombradas. Quem ganhar leva a carta de Halloween para a coleção, e ela fica com esse visual para sempre: depois do mês, só quem ganhou tem.",
    icon: GhostIcon,
    looks: {
      craque: "Abóbora",
      gol: "Roxo e gosma",
      bola_murcha: "Fantasma",
    },
  },
  default: {
    eyebrow: "Coleção",
    title: "Cartas especiais",
    description:
      "Toda rodada distribui cartas especiais por voto. Elas guardam como você estava no dia e ficam para sempre na sua coleção.",
    icon: SparklesIcon,
    looks: {
      craque: "Preto e dourado",
      gol: "Azul elétrico",
      bola_murcha: "Couro velho",
    },
  },
};

const STEPS = [
  "Jogue a rodada.",
  "Na tela de notas, depois dos jogadores, vote no Craque, no Gol da Semana e na Bola Murcha.",
  "Quando a rodada fecha, quem tiver mais votos ganha a carta. Empate: todos levam.",
];

type CardEventShowcaseProps = {
  event: CurrentCardEvent;
  /** Jogador logado: a prévia mostra a carta dele em cada prêmio. */
  player: Player;
};

function formatDaysLeft(daysLeft: number): string {
  if (daysLeft === 0) return "último dia";
  return daysLeft === 1 ? "falta 1 dia" : `faltam ${daysLeft} dias`;
}

/** Apresentação do evento do mês (tema sazonal das cartas especiais) com prévia da carta do jogador. */
export function CardEventShowcase({ event, player }: CardEventShowcaseProps) {
  const copy = EVENT_COPY[event.theme];
  const Icon = copy.icon;

  return (
    <section aria-labelledby="card-event-title" className="relative flex flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4">
      <Icon aria-hidden className="pointer-events-none absolute -top-4 -right-4 size-28 text-muted-foreground/10" />

      <div className="relative flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{copy.eyebrow}</p>
        <h2 id="card-event-title" className="font-display text-2xl font-bold tracking-wide uppercase">
          {copy.title}
        </h2>
        {event.endDate !== null && event.daysLeft !== null && (
          <p className="text-sm text-muted-foreground">
            Até {formatShortDate(event.endDate)} · {formatDaysLeft(event.daysLeft)}
          </p>
        )}
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">Prévia com a sua carta</h3>
        <ul aria-label="Cartas do evento" className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 lg:justify-around">
          {AWARD_KINDS.map((kind) => (
            <li key={kind} className="flex w-28 shrink-0 snap-start flex-col items-center gap-1.5 text-center lg:w-40">
              <PlayerCard
                player={withAwardBonus(player, kind)}
                award={{ kind, theme: event.theme }}
                size="sm"
                className="lg:w-40"
              />
              <span className="text-sm leading-tight font-medium">{AWARD_LABELS[kind].title}</span>
              <span className="flex flex-col text-xs text-muted-foreground">
                <span>{copy.looks[kind]}</span>
                <span className={cn(BOOSTED_AWARDS.includes(kind) && "font-medium text-success")}>
                  {BOOSTED_AWARDS.includes(kind) ? "+1 em tudo" : "Sem bônus"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t pt-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">Como ganhar</h3>
        <ol className="flex flex-col gap-2">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-display text-xs font-bold tabular-nums">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
