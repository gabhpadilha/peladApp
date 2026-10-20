import Link from "next/link";
import { PackageOpenIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { formatShortDate } from "@/lib/format-date";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";
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
        <p className="text-sm text-muted-foreground">Ninguém ganhou carta especial nessa rodada.</p>
      ) : (
        // Grade de 3 colunas (empates quebram linha): cabe no celular sem rolagem lateral.
        <ul aria-label="Prêmios da rodada" className="grid grid-cols-3 gap-x-2 gap-y-4 sm:gap-x-4">
          {awards.map((award) => (
            <li key={award.id} className="mx-auto flex w-full max-w-40 min-w-0 flex-col items-center gap-1.5 text-center">
              <Link
                href={`/jogadores/${award.memberId}/colecao`}
                aria-label={`${AWARD_LABELS[award.kind].title}: ${award.card.nickname}`}
                className="w-full"
              >
                <PlayerCard player={award.card} award={award} size="fill" />
              </Link>
              <span className="flex flex-col text-xs leading-tight">
                <span className="font-medium">{AWARD_LABELS[award.kind].title}</span>
                <span className="text-muted-foreground">{formatAwardResult(award)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {awards.length > 0 && (
        <Link
          href={`/rodadas/${match.id}/vencedores`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <PackageOpenIcon aria-hidden className="size-4" />
          Ver a revelação de novo
        </Link>
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
