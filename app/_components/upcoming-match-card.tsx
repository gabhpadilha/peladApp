import { CalendarIcon, MapPinIcon } from "lucide-react";
import { formatWeekdayDate } from "@/lib/format-date";
import type { UpcomingMatch } from "@/types/match";

type UpcomingMatchCardProps = {
  match: UpcomingMatch;
};

export function UpcomingMatchCard({ match }: UpcomingMatchCardProps) {
  const openSpots = match.capacity - match.confirmedCount;

  return (
    <section
      aria-labelledby="upcoming-match-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <h2
        id="upcoming-match-title"
        className="font-display text-lg font-bold tracking-wide uppercase"
      >
        Próxima pelada
      </h2>
      <div className="flex flex-col gap-2 text-sm">
        <p className="flex items-center gap-2">
          <CalendarIcon aria-hidden className="size-4 text-muted-foreground" />
          <span className="inline-block first-letter:uppercase">{formatWeekdayDate(match.date)}</span> · {match.time}
        </p>
        <p className="flex items-center gap-2">
          <MapPinIcon aria-hidden className="size-4 text-muted-foreground" />
          {match.venue}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span>
            <span className="font-display text-xl font-bold tabular-nums">
              {match.confirmedCount}
            </span>
            <span className="text-muted-foreground">/{match.capacity} confirmados</span>
          </span>
          <span className="text-muted-foreground">
            {openSpots > 0 ? `${openSpots} vagas` : "Lotado"}
          </span>
        </div>
        <progress
          value={match.confirmedCount}
          max={match.capacity}
          aria-label="Confirmados"
          className="h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
        />
      </div>
    </section>
  );
}
