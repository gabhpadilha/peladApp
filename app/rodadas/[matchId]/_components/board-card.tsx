"use client";

import Link from "next/link";
import { CheckIcon, PlusIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { cn } from "@/lib/utils";
import type { BoardPlayer } from "../_data-access/get-match-board";

/** Estado da nota do jogador logado para essa carta. */
export type RatingState = { kind: "idle" } | { kind: "partial"; filled: number } | { kind: "done"; average: number };

type BoardCardProps = {
  entry: BoardPlayer;
  /** `rate`: tocar abre as notas; `view`: tocar abre o perfil. */
  mode: "rate" | "view";
  rating: RatingState;
  onRate: (playerId: string) => void;
};

const CARD_CLASS =
  "block w-full rounded-xl outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/60 active:scale-[0.97]";

/** Selo sobre a base da carta: nota dada, andamento ou convite para avaliar. */
function Badge({ entry, mode, rating }: Pick<BoardCardProps, "entry" | "mode" | "rating">) {
  const base =
    "absolute -bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-sm tabular-nums";

  if (entry.roundScore !== null) {
    return (
      <span className={cn(base, "border-border bg-background font-display text-sm font-bold")}>
        {entry.roundScore}
        <span className="font-sans text-[10px] font-normal text-muted-foreground">na rodada</span>
      </span>
    );
  }
  if (mode !== "rate" || entry.isSelf) return null;

  if (rating.kind === "done") {
    return (
      <span className={cn(base, "border-primary bg-primary font-display text-sm font-bold text-primary-foreground")}>
        <CheckIcon aria-hidden className="size-3.5" />
        {rating.average.toFixed(1).replace(".", ",")}
      </span>
    );
  }
  if (rating.kind === "partial") {
    return <span className={cn(base, "border-primary/60 bg-background text-primary")}>{rating.filled}/6</span>;
  }
  return (
    <span className={cn(base, "border-border bg-background/90 text-muted-foreground")}>
      <PlusIcon aria-hidden className="size-3" />
      Avaliar
    </span>
  );
}

/** Carta de um atleta na mesa tática. */
export function BoardCard({ entry, mode, rating, onRate }: BoardCardProps) {
  const { player, isSelf } = entry;
  const content = (
    <span className="relative block w-full">
      <PlayerCard player={player} size="fill" />
      {isSelf && (
        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
          Você
        </span>
      )}
      <Badge entry={entry} mode={mode} rating={rating} />
    </span>
  );

  if (mode === "rate" && !isSelf) {
    return (
      <button
        type="button"
        onClick={() => onRate(player.id)}
        aria-label={`Avaliar ${player.nickname}`}
        className={CARD_CLASS}
      >
        {content}
      </button>
    );
  }
  return (
    <Link href={`/jogadores/${player.id}`} aria-label={`Perfil de ${player.nickname}`} className={CARD_CLASS}>
      {content}
    </Link>
  );
}
