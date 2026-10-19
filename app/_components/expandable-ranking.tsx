"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RankedPlayer } from "../_data-access/get-home-data";
import { RankingList } from "./ranking-list";

const OUTFIELD_SUMMARY_SIZE = 5;
const GOALKEEPER_SUMMARY_SIZE = 2;

type ExpandableRankingProps = {
  outfield: RankedPlayer[];
  goalkeepers: RankedPlayer[];
  currentPlayerId: string;
};

/** Ranking resumido (top 5 da linha, top 2 do gol) com botão para ver todos os atletas. */
export function ExpandableRanking({ outfield, goalkeepers, currentPlayerId }: ExpandableRankingProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hiddenCount =
    Math.max(0, outfield.length - OUTFIELD_SUMMARY_SIZE) +
    Math.max(0, goalkeepers.length - GOALKEEPER_SUMMARY_SIZE);

  const visibleOutfield = isExpanded ? outfield : outfield.slice(0, OUTFIELD_SUMMARY_SIZE);
  const visibleGoalkeepers = isExpanded ? goalkeepers : goalkeepers.slice(0, GOALKEEPER_SUMMARY_SIZE);

  return (
    <>
      <div id="ranking-lists" className="flex flex-col gap-3">
        <RankingList title="Linha" players={visibleOutfield} currentPlayerId={currentPlayerId} />
        {goalkeepers.length > 0 && (
          <RankingList title="Goleiros" players={visibleGoalkeepers} currentPlayerId={currentPlayerId} />
        )}
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
