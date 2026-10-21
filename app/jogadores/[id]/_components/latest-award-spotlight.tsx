import { PlayerCard } from "@/components/player-card";
import { BOOSTED_AWARDS } from "@/lib/award-bonus";
import { CARD_THEME_LABELS } from "@/lib/card-themes";
import { formatWeekdayDate } from "@/lib/format-date";
import { AWARD_LABELS, formatRoundScore, hasSeasonalTheme, type Award } from "@/types/award";
import { AWARD_ICONS } from "@/components/award-icons";
import { ShareAwardButton } from "./share-award-button";

type LatestAwardSpotlightProps = {
  award: Award;
  /** Só o dono da carta, e só até a próxima rodada ser criada. */
  isShareable: boolean;
  groupName: string;
};

/** A conquista mais recente em destaque, com a carta grande. */
export function LatestAwardSpotlight({ award, isShareable, groupName }: LatestAwardSpotlightProps) {
  const Icon = AWARD_ICONS[award.kind];
  const isBoosted = BOOSTED_AWARDS.includes(award.kind);
  // Prêmios das notas (sem voto) mostram a nota média no lugar dos votos.
  const isTeamOfTheWeek = award.kind === "time_da_semana";
  const isScored = isTeamOfTheWeek || award.kind === "jogador_do_mes";

  return (
    <section
      aria-labelledby="latest-award-title"
      className="relative flex flex-col items-center gap-5 overflow-hidden rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:gap-8"
    >
      {/* Brilho suave atrás da carta: só decoração, neutro (o lima é para ações). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 size-72 -translate-x-1/2 rounded-full bg-foreground/5 blur-3xl sm:left-28"
      />
      <div className="relative w-48 shrink-0 sm:w-52">
        <PlayerCard player={award.card} award={award} size="fill" />
      </div>

      <div className="relative flex w-full flex-col gap-3 text-center sm:text-left">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Última conquista</p>
          <h2 id="latest-award-title" className="flex items-center justify-center gap-2 font-display text-3xl font-bold sm:justify-start">
            <Icon aria-hidden className="size-6 shrink-0" />
            {AWARD_LABELS[award.kind].title}
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="inline-block first-letter:uppercase">{formatWeekdayDate(award.date)}</span> · Rodada{" "}
            {award.round}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-left">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <dt className="text-xs text-muted-foreground">{isScored ? (isTeamOfTheWeek ? "Nota" : "Média do mês") : "Votos"}</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">
              {isScored ? (award.score === null ? "–" : formatRoundScore(award.score)) : award.votes}
            </dd>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <dt className="text-xs text-muted-foreground">OVR</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{award.card.ovr ?? "–"}</dd>
          </div>
          <div className="min-w-0 rounded-lg bg-muted/50 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Tema</dt>
            <dd className="truncate font-display text-lg leading-8 font-bold">
              {hasSeasonalTheme(award.kind) ? CARD_THEME_LABELS[award.theme] : "Exclusiva"}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          {isBoosted
            ? "Foto congelada do dia, com +1 em cada atributo e no OVR. Essa carta nunca muda."
            : "Foto congelada do dia, sem bônus. Essa carta nunca muda (para o bem e para o mal)."}
        </p>

        {isShareable && (
          <div className="flex flex-col gap-1.5">
            <ShareAwardButton award={award} groupName={groupName} />
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              Dá para compartilhar até a próxima rodada começar.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
