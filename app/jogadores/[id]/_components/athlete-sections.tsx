"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Section = "summary" | "goals" | "history";

type AthleteSectionsProps = {
  summary: ReactNode;
  goals: ReactNode;
  history: ReactNode;
};

const SECTIONS: { key: Section; label: string }[] = [
  { key: "summary", label: "Resumo" },
  { key: "goals", label: "Gols" },
  { key: "history", label: "Histórico" },
];

/**
 * A aba Estatísticas do atleta empilhava uns 8 blocos (revisão de 2026-11-04). Agora, uma segunda troca embaixo da carta:
 * Resumo (nível, faixa, destaques e estatísticas da carta), Gols e Histórico (gráfico e tabela). As três partes ficam
 * montadas, só uma visível, para o gráfico e as listas não recomeçarem ao trocar.
 */
export function AthleteSections({ summary, goals, history }: AthleteSectionsProps) {
  const [section, setSection] = useState<Section>("summary");
  const panels: Record<Section, ReactNode> = { summary, goals, history };

  return (
    <>
      <div role="tablist" aria-label="O que mostrar das estatísticas" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`athlete-tab-${item.key}`}
            aria-selected={section === item.key}
            aria-controls={`athlete-panel-${item.key}`}
            onClick={() => setSection(item.key)}
            className={cn(
              "h-11 rounded-lg text-sm font-medium transition-colors",
              section === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {SECTIONS.map((item) => (
        <div
          key={item.key}
          id={`athlete-panel-${item.key}`}
          role="tabpanel"
          aria-labelledby={`athlete-tab-${item.key}`}
          hidden={section !== item.key}
          className="flex flex-col gap-6"
        >
          {panels[item.key]}
        </div>
      ))}
    </>
  );
}
