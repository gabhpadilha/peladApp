import Link from "next/link";
import { StarIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { formatShortDate } from "@/lib/format-date";
import type { Match } from "@/types/match";
import type { RoundPerformer } from "../_data-access/get-home-data";

type LatestRoundCardProps = {
  match: Match;
  topPerformers: RoundPerformer[];
  mvpId: string | null;
  openRound: { match: Match; submitted: number; expected: number } | null;
};

export function LatestRoundCard({ match, topPerformers, mvpId, openRound }: LatestRoundCardProps) {
  const mvp = topPerformers.find((performer) => performer.player.id === mvpId);

  return (
    <section
      aria-labelledby="latest-round-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="latest-round-title"
          className="font-display text-lg font-bold tracking-wide uppercase"
        >
          Rodada {match.round}
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatShortDate(match.date)} · placar{" "}
          <span className="font-medium text-foreground tabular-nums">
            {match.score.teamA} × {match.score.teamB}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-4">
        {mvp && (
          <Link href={`/jogadores/${mvp.player.id}`} aria-label={`Craque da rodada: ${mvp.player.nickname}`}>
            <PlayerCard player={mvp.player} isMvp size="sm" />
          </Link>
        )}
        <ol className="flex min-w-0 flex-1 flex-col gap-2">
          {topPerformers.map(({ player, score }, index) => (
            <li key={player.id}>
              <Link
                href={`/jogadores/${player.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <span className="w-4 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate font-medium">
                  {player.nickname}
                  {player.id === mvpId && (
                    <StarIcon aria-label="Craque da rodada" className="size-3.5 fill-primary text-primary" />
                  )}
                </span>
                <span className="font-display text-lg font-bold tabular-nums">{score}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {openRound && (
        <p className="border-t pt-3 text-sm text-muted-foreground">
          Rodada {openRound.match.round} em avaliação: aguardando{" "}
          <span className="font-medium text-foreground tabular-nums">
            {openRound.expected - openRound.submitted} de {openRound.expected}
          </span>{" "}
          jogadores enviarem as notas.
        </p>
      )}
    </section>
  );
}
