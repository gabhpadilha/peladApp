"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { GoalBall } from "@/components/goal-ball";
import { PlayerCard } from "@/components/player-card";
import { RarityFlip } from "@/components/rarity-flip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { POSITION_LABELS } from "@/types/player";
import type { TopScorer } from "../_data-access/get-home-data";

const SUMMARY_SIZE = 5;

type View = "month" | "all";

type ScorersRankingProps = {
  month: TopScorer[];
  allTime: TopScorer[];
  /** Mês por extenso, na aba ("Novembro"). */
  monthLabel: string;
  currentPlayerId: string;
};

/** Artilharia: abas do mês e de todos os tempos (como o ranking de pontos), top 5 e botão para ver todos. */
export function ScorersRanking({ month, allTime, monthLabel, currentPlayerId }: ScorersRankingProps) {
  const [view, setView] = useState<View>("month");
  const [isExpanded, setIsExpanded] = useState(false);
  const scorers = view === "month" ? month : allTime;
  const hiddenCount = Math.max(0, scorers.length - SUMMARY_SIZE);
  const tabs: { key: View; label: string }[] = [
    { key: "month", label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) },
    { key: "all", label: "Todos os tempos" },
  ];

  return (
    <>
      <div role="tablist" aria-label="Período da artilharia" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={view === tab.key}
            onClick={() => setView(tab.key)}
            className={cn(
              "h-10 rounded-md text-sm font-medium transition-colors",
              view === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {scorers.length === 0 ? (
        <p className="rounded-lg bg-muted/40 px-3 py-4 text-center text-sm text-muted-foreground">
          {view === "month"
            ? "Ninguém marcou neste mês ainda. Cada um informa os seus gols antes das notas e três colegas confirmam."
            : "Ninguém marcou ainda. Os gols entram quando três colegas confirmam."}
        </p>
      ) : (
        <ol id="scorers-list" role="tabpanel" className="flex flex-col">
          {(isExpanded ? scorers : scorers.slice(0, SUMMARY_SIZE)).map(({ player, position, goals, games }) => (
            <li key={player.id}>
              <Link
                href={`/jogadores/${player.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted",
                  player.id === currentPlayerId && "bg-muted/60",
                )}
              >
                <span className="w-4 text-sm text-muted-foreground tabular-nums">{position}</span>
                <div className="w-12 shrink-0 sm:w-14">
                  <RarityFlip player={player} mode="thumb">
                    <PlayerCard player={player} size="fill" />
                  </RarityFlip>
                </div>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{player.nickname}</span>
                  <span className="text-xs text-muted-foreground">
                    {POSITION_LABELS[player.position]} · {games === 1 ? "1 jogo" : `${games} jogos`}
                  </span>
                </span>
                <GoalBall className="size-5" />
                <span className="w-9 text-right font-display text-2xl font-bold tabular-nums">{goals}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {hiddenCount > 0 && (
        <Button
          type="button"
          variant="outline"
          aria-expanded={isExpanded}
          aria-controls="scorers-list"
          onClick={() => setIsExpanded((current) => !current)}
          className="h-11 w-full text-base"
        >
          {isExpanded ? "Mostrar menos" : `Ver artilharia completa (+${hiddenCount})`}
          <ChevronDownIcon aria-hidden className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      )}
    </>
  );
}
