"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { POSITION_LABELS } from "@/types/player";
import type { OvrRankedPlayer } from "../_data-access/get-home-data";

const SUMMARY_SIZE = 5;

type OvrView = "outfield" | "goalkeeper";

type OvrRankingProps = {
  outfield: OvrRankedPlayer[];
  goalkeepers: OvrRankedPlayer[];
  currentPlayerId: string;
};

/**
 * Ranking pelo OVR da carta (pedido do dono do app em 2026-11-12): abas Linha | Goleiros no lugar do período (o OVR de
 * goleiro não se compara com o de linha, e o OVR já é o da carta, das últimas rodadas), top 5 e botão para ver todos.
 */
export function OvrRanking({ outfield, goalkeepers, currentPlayerId }: OvrRankingProps) {
  const [view, setView] = useState<OvrView>("outfield");
  const [isExpanded, setIsExpanded] = useState(false);
  const players = view === "outfield" ? outfield : goalkeepers;
  const hiddenCount = Math.max(0, players.length - SUMMARY_SIZE);
  const tabs: { key: OvrView; label: string }[] = [
    { key: "outfield", label: "Linha" },
    { key: "goalkeeper", label: "Goleiros" },
  ];

  return (
    <>
      <div role="tablist" aria-label="Linha ou goleiros" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
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

      {players.length === 0 ? (
        <p className="px-2 py-4 text-sm text-muted-foreground">
          {view === "outfield" ? "Ninguém da linha" : "Nenhum goleiro"} tem OVR ainda: ele aparece depois da primeira rodada fechada.
        </p>
      ) : (
        <ol id="ovr-ranking-list" className="flex flex-col">
          {(isExpanded ? players : players.slice(0, SUMMARY_SIZE)).map(({ player, position, rounds }) => (
            <li key={player.id}>
              <Link
                href={`/jogadores/${player.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted",
                  player.id === currentPlayerId && "bg-muted/60",
                )}
              >
                <span className="w-4 text-sm text-muted-foreground tabular-nums">{position}</span>
                <div className="w-16 shrink-0 sm:w-20">
                  <PlayerCard player={player} size="fill" />
                </div>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{player.nickname}</span>
                  <span className="text-xs text-muted-foreground">
                    {POSITION_LABELS[player.position]} · {rounds === 1 ? "1 rodada" : `${rounds} rodadas`}
                  </span>
                </span>
                <span className="flex w-14 flex-col items-end leading-none">
                  <span className="font-display text-xl font-bold tabular-nums">{player.ovr}</span>
                  <span className="text-xs text-muted-foreground uppercase">OVR</span>
                </span>
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
          aria-controls="ovr-ranking-list"
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
