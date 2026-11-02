"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RankedPlayer } from "../_data-access/get-home-data";
import { RankingList } from "./ranking-list";

const SUMMARY_SIZE = 5;

type RankingView = "month" | "all";

type ExpandableRankingProps = {
  month: RankedPlayer[];
  allTime: RankedPlayer[];
  /** Mês por extenso, na aba ("Novembro"). */
  monthLabel: string;
  currentPlayerId: string;
};

/** Ranking por pontos: abas do mês e de todos os tempos, resumo com o top 5 e botão para ver todos. */
export function ExpandableRanking({ month, allTime, monthLabel, currentPlayerId }: ExpandableRankingProps) {
  const [view, setView] = useState<RankingView>("month");
  const [isExpanded, setIsExpanded] = useState(false);
  const players = view === "month" ? month : allTime;
  const hiddenCount = Math.max(0, players.length - SUMMARY_SIZE);
  const tabs: { key: RankingView; label: string }[] = [
    { key: "month", label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) },
    { key: "all", label: "Todos os tempos" },
  ];

  return (
    <>
      <div role="tablist" aria-label="Período do ranking" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
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
      <div id="ranking-lists" role="tabpanel">
        <RankingList players={isExpanded ? players : players.slice(0, SUMMARY_SIZE)} currentPlayerId={currentPlayerId} />
      </div>
      {hiddenCount > 0 && (
        <Button
          type="button"
          variant="outline"
          aria-expanded={isExpanded}
          aria-controls="ranking-lists"
          onClick={() => setIsExpanded((current) => !current)}
          className="h-11 w-full text-base"
        >
          {isExpanded ? "Mostrar menos" : `Ver ranking completo (+${hiddenCount})`}
          <ChevronDownIcon aria-hidden className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>
      )}
    </>
  );
}
