"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RankedPlayer, TopScorer } from "../_data-access/get-home-data";
import { ExpandableRanking } from "./expandable-ranking";
import { ScorersRanking } from "./scorers-ranking";

type ScoreboardView = "points" | "goals";

type ScoreboardProps = {
  pointsMonth: RankedPlayer[];
  pointsAllTime: RankedPlayer[];
  goalsMonth: TopScorer[];
  goalsAllTime: TopScorer[];
  /** Mês por extenso, na aba do período ("Novembro"). */
  monthLabel: string;
  currentPlayerId: string;
};

const VIEWS: { key: ScoreboardView; label: string; caption: string }[] = [
  { key: "points", label: "Pontos", caption: "ranking por pontos" },
  { key: "goals", label: "Gols", caption: "artilharia, gols confirmados" },
];

/**
 * Placar da Início (revisão de 2026-11-04): o ranking por pontos e a artilharia eram dois cartões idênticos, com as
 * mesmas abas de período. Agora um cartão só, com a troca Pontos | Gols no topo. As duas listas ficam montadas
 * (só uma visível), para o período e a lista aberta de cada uma não se perderem ao trocar.
 */
export function Scoreboard({ pointsMonth, pointsAllTime, goalsMonth, goalsAllTime, monthLabel, currentPlayerId }: ScoreboardProps) {
  const [view, setView] = useState<ScoreboardView>("points");
  const current = VIEWS.find((item) => item.key === view) ?? VIEWS[0];

  return (
    <section aria-labelledby="scoreboard-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="scoreboard-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Placar
        </h2>
        <div role="tablist" aria-label="O que o placar mostra" className="flex gap-1 rounded-full bg-muted p-1">
          {VIEWS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`scoreboard-tab-${item.key}`}
              aria-selected={view === item.key}
              aria-controls={`scoreboard-panel-${item.key}`}
              onClick={() => setView(item.key)}
              className={cn(
                "h-11 min-w-20 rounded-full px-4 text-sm font-medium transition-colors",
                view === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">{current.caption}</p>

      <div id="scoreboard-panel-points" role="tabpanel" aria-labelledby="scoreboard-tab-points" hidden={view !== "points"} className="flex flex-col gap-3">
        <ExpandableRanking month={pointsMonth} allTime={pointsAllTime} monthLabel={monthLabel} currentPlayerId={currentPlayerId} />
      </div>
      <div id="scoreboard-panel-goals" role="tabpanel" aria-labelledby="scoreboard-tab-goals" hidden={view !== "goals"} className="flex flex-col gap-3">
        <ScorersRanking month={goalsMonth} allTime={goalsAllTime} monthLabel={monthLabel} currentPlayerId={currentPlayerId} />
      </div>
    </section>
  );
}
