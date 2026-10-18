import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { OvrDelta } from "@/components/ovr-delta";
import { PlayerCard } from "@/components/player-card";
import { POSITION_LABELS, type Player } from "@/types/player";

type MyCardSummaryProps = {
  player: Player;
  isMvp: boolean;
  delta: number | null;
  rank: { position: number; total: number };
  gamesPlayed: number;
  evaluationsReceived: number;
};

export function MyCardSummary({
  player,
  isMvp,
  delta,
  rank,
  gamesPlayed,
  evaluationsReceived,
}: MyCardSummaryProps) {
  const rankLabel = player.role === "goalkeeper" ? "entre goleiros" : "na linha";

  return (
    <section
      aria-labelledby="my-card-title"
      className="flex items-center gap-5 rounded-xl border bg-card p-4"
    >
      <PlayerCard player={player} isMvp={isMvp} size="md" />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Minha carta</p>
          <h2 id="my-card-title" className="truncate font-display text-2xl font-bold">
            {player.nickname}
          </h2>
          <p className="text-sm text-muted-foreground">{POSITION_LABELS[player.position]}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">OVR</dt>
            <dd className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tabular-nums">
                {player.ovr ?? "–"}
              </span>
              <OvrDelta delta={delta} className="text-xs" />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ranking</dt>
            <dd>
              <span className="font-display text-2xl font-bold tabular-nums">
                {rank.position}º
              </span>{" "}
              <span className="text-xs text-muted-foreground">{rankLabel}</span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Jogos</dt>
            <dd className="font-medium tabular-nums">{gamesPlayed}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Avaliações</dt>
            <dd className="font-medium tabular-nums">{evaluationsReceived}</dd>
          </div>
        </dl>

        {player.ovr === null && (
          <p className="text-xs text-muted-foreground">
            Sua carta ganha números quando a primeira rodada em que você jogou for fechada.
          </p>
        )}

        <Link
          href={`/jogadores/${player.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver meu desempenho
          <ArrowRightIcon aria-hidden className="size-4" />
        </Link>
      </div>
    </section>
  );
}
