"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, TrophyIcon } from "lucide-react";
import { PACK_TIER_NAMES, PackCover } from "@/components/pack-cover";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { POINTS_PER_GOAL, type RoundRankingEntry } from "@/lib/ranking-points";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, formatRoundScore } from "@/types/award";

type RoundRankingListProps = {
  entries: readonly RoundRankingEntry[];
  /** Quem está vendo (a linha dele fica em destaque). */
  myId?: string | null;
  className?: string;
  /** Entrada animada, do último para o primeiro (na revelação). */
  animated?: boolean;
};

/** A linha de uma posição: posição, apelido, nota da rodada, pacote ganho e, ao tocar, os pontos que ela somou no mês. */
function RankingRow({
  entry,
  isMine,
  isOpen,
  onToggle,
  delay,
}: {
  entry: RoundRankingEntry;
  isMine: boolean;
  isOpen: boolean;
  onToggle: () => void;
  /** Atraso da entrada (s); `null` = sem animação. */
  delay: number | null;
}) {
  return (
    <li
      className={cn("rounded-xl border", isMine ? "border-primary/50 bg-primary/10" : "bg-card/60", delay !== null && "animate-[reveal-pop_0.4s_ease-out_both]")}
      style={delay === null ? undefined : { animationDelay: `${delay}s` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span className={cn("w-7 shrink-0 text-center font-display text-xl font-extrabold tabular-nums", entry.position === 1 && "text-amber-300")}>
          {entry.position}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{entry.nickname}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {entry.packTier ? `Pacote ${PACK_TIER_NAMES[entry.packTier]} · ` : ""}
            {entry.points} pts no mês
          </span>
        </span>
        {entry.packTier && <PackCover tier={entry.packTier} className="h-10 shrink-0" />}
        <span className="flex shrink-0 flex-col items-end font-display leading-none font-extrabold tabular-nums">
          <span className="text-xs font-semibold text-muted-foreground uppercase">nota</span>
          <span className="text-2xl">{entry.score === null ? "–" : formatRoundScore(entry.score / 10)}</span>
        </span>
        <ChevronDownIcon aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <dl className="flex flex-col gap-1.5 border-t px-3 py-3 text-sm">
          <p className="text-xs text-muted-foreground">Pontos que essa rodada soma no ranking do mês:</p>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Nota da rodada</dt>
            <dd className="font-semibold tabular-nums">{entry.score === null ? "sem notas" : `+${Math.round(entry.score)}`}</dd>
          </div>
          {entry.awards.map((award) => (
            <div key={award.kind} className="flex justify-between">
              <dt className="text-muted-foreground">{AWARD_LABELS[award.kind].title}</dt>
              <dd className="font-semibold text-primary tabular-nums">+{award.points}</dd>
            </div>
          ))}
          {entry.goals > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {entry.goals === 1 ? "1 gol" : `${entry.goals} gols`} (+{POINTS_PER_GOAL} cada)
              </dt>
              <dd className="font-semibold text-primary tabular-nums">+{entry.goalPoints}</dd>
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5">
            <dt className="font-medium">Total</dt>
            <dd className="font-display text-lg font-extrabold tabular-nums">{entry.points}</dd>
          </div>
          <Link href={`/jogadores/${entry.playerId}`} className="pt-1 text-xs font-medium text-primary hover:underline">
            Ver o perfil
          </Link>
        </dl>
      )}
    </li>
  );
}

/** A lista completa da classificação da rodada (usada no modal da home e na revelação). */
export function RoundRankingList({ entries, myId = null, className, animated = false }: RoundRankingListProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <ol className={cn("flex flex-col gap-2", className)}>
      {entries.map((entry, index) => (
        <RankingRow
          key={entry.playerId}
          entry={entry}
          delay={animated ? 0.3 + (entries.length - 1 - index) * 0.14 : null}
          isMine={entry.playerId === myId}
          isOpen={openId === entry.playerId}
          onToggle={() => setOpenId((current) => (current === entry.playerId ? null : entry.playerId))}
        />
      ))}
    </ol>
  );
}

type RoundRankingSheetProps = {
  round: number;
  entries: readonly RoundRankingEntry[];
  myId?: string | null;
  /** Texto do botão. */
  label?: string;
  className?: string;
};

/** Botão que abre o modal com a classificação da rodada (home). */
export function RoundRankingSheet({ round, entries, myId = null, label = "Ver classificação completa", className }: RoundRankingSheetProps) {
  if (entries.length === 0) return null;
  const hasPacks = entries.some((entry) => entry.packTier !== null);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className={cn("h-11 w-full gap-2", className)}>
          <TrophyIcon aria-hidden className="size-4" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto flex max-h-[92dvh] w-full max-w-md flex-col gap-0 rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl uppercase">Classificação da rodada {round}</SheetTitle>
          <SheetDescription>
            Ordem pela nota da rodada{hasPacks ? ", que também decide o pacote de cada um" : ""}. Toque num nome para ver os
            pontos que ele somou no ranking do mês.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          <RoundRankingList entries={entries} myId={myId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
