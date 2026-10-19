import Link from "next/link";
import { ChartColumnIcon, GalleryVerticalEndIcon, InfoIcon } from "lucide-react";
import { OvrDelta } from "@/components/ovr-delta";
import { PlayerCard } from "@/components/player-card";
import { buttonVariants } from "@/components/ui/button";
import { CARD_TIER_LABELS, getCardTier } from "@/lib/card-tier";
import { cn } from "@/lib/utils";
import { POSITION_LABELS, type Player } from "@/types/player";

type MyCardSummaryProps = {
  player: Player;
  delta: number | null;
  rank: { position: number; total: number };
  gamesPlayed: number;
  evaluationsReceived: number;
  /** Quantas cartas especiais o jogador tem na coleção. */
  awardCount: number;
};

/**
 * Minha carta na home. Mobile-first: carta + apelido/OVR numa linha, números
 * em três blocos de largura total e as ações como dois botões lado a lado.
 */
export function MyCardSummary({
  player,
  delta,
  rank,
  gamesPlayed,
  evaluationsReceived,
  awardCount,
}: MyCardSummaryProps) {
  const hasOvr = player.ovr !== null;
  const tierLabel = hasOvr ? `Carta ${CARD_TIER_LABELS[getCardTier(player.ovr ?? 0)]}` : "Sem OVR ainda";

  const stats = [
    {
      label: "Ranking",
      value: hasOvr ? `${rank.position}º` : "–",
      detail: hasOvr ? (player.role === "goalkeeper" ? "nos goleiros" : "na linha") : "sem OVR",
    },
    { label: "Jogos", value: gamesPlayed, detail: "jogados" },
    { label: "Notas", value: evaluationsReceived, detail: "recebidas" },
  ];

  return (
    <section aria-labelledby="my-card-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-4">
        {/* A carta escala pela largura do pai: menor no celular para o texto respirar. */}
        <div className="w-28 shrink-0 sm:w-36">
          <PlayerCard player={player} size="fill" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Minha carta</p>
            <h2 id="my-card-title" className="truncate font-display text-3xl leading-tight font-bold">
              {player.nickname}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {POSITION_LABELS[player.position]} · {tierLabel}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">OVR</p>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-5xl leading-none font-extrabold tabular-nums">
                {player.ovr ?? "–"}
              </span>
              <OvrDelta delta={delta} className="text-xs" />
            </p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col rounded-lg bg-muted/50 px-3 py-2">
            <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
            {/* Número e complemento em linhas próprias: nada é cortado com 2–3 dígitos. */}
            <dd className="flex min-w-0 flex-col">
              <span className="font-display text-2xl leading-tight font-bold tabular-nums">{stat.value}</span>
              <span className="truncate text-xs text-muted-foreground">{stat.detail}</span>
            </dd>
          </div>
        ))}
      </dl>

      {!hasOvr && (
        <p className="flex gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <InfoIcon aria-hidden className="mt-px size-3.5 shrink-0" />
          Sua carta ganha números quando fechar a primeira rodada em que você jogou.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/jogadores/${player.id}`}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-11 text-sm")}
        >
          <ChartColumnIcon aria-hidden />
          Desempenho
        </Link>
        <Link
          href={`/jogadores/${player.id}#colecao`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 text-sm")}
          aria-label={`Minha coleção: ${awardCount} ${awardCount === 1 ? "carta" : "cartas"}`}
        >
          <GalleryVerticalEndIcon aria-hidden />
          Coleção
          <span className="rounded-md bg-muted px-1.5 text-xs tabular-nums">{awardCount}</span>
        </Link>
      </div>
    </section>
  );
}
