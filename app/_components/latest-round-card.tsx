import Link from "next/link";
import { PlayerCard } from "@/components/player-card";
import { formatShortDate } from "@/lib/format-date";
import { AWARD_LABELS, type Award } from "@/types/award";
import type { Match } from "@/types/match";
import type { RoundPerformer } from "../_data-access/get-home-data";

type LatestRoundCardProps = {
  match: Match;
  topPerformers: RoundPerformer[];
  awards: Award[];
};

/** Última rodada fechada: cartas especiais distribuídas + top 3 notas. */
export function LatestRoundCard({ match, topPerformers, awards }: LatestRoundCardProps) {
  return (
    <section aria-labelledby="latest-round-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="latest-round-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Rodada {match.round}
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatShortDate(match.date)} · {match.presentPlayerIds.length} jogadores
        </p>
      </div>

      {awards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguém recebeu votos para os prêmios dessa rodada.</p>
      ) : (
        <ul aria-label="Prêmios da rodada" className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
          {awards.map((award) => (
            <li key={award.id} className="flex snap-start flex-col items-center gap-1.5">
              <Link href={`/jogadores/${award.memberId}#colecao`} aria-label={`${AWARD_LABELS[award.kind].title}: ${award.card.nickname}`}>
                <PlayerCard player={award.card} award={award} size="sm" />
              </Link>
              <span className="text-xs text-muted-foreground">
                {AWARD_LABELS[award.kind].title} · {award.votes} {award.votes === 1 ? "voto" : "votos"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {topPerformers.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">Maiores notas</h3>
          <ol className="flex flex-col">
            {topPerformers.map(({ player, score }, index) => (
              <li key={player.id}>
                <Link
                  href={`/jogadores/${player.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                >
                  <span className="w-4 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{player.nickname}</span>
                  <span className="font-display text-lg font-bold tabular-nums">{score}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
