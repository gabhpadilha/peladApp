"use client";

import { useState } from "react";
import { PlayerCard } from "@/components/player-card";
import { SectionTitle } from "@/components/section-title";
import { CARD_THEME_LABELS } from "@/lib/card-themes";
import { formatShortDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { AWARD_KINDS, AWARD_LABELS, type Award, type AwardKind } from "@/types/award";
import { AWARD_ICONS } from "./award-icons";

type Filter = "all" | AwardKind;

type CollectionGalleryProps = {
  /** Mais recentes primeiro. */
  awards: Award[];
};

type AwardGroup = { key: string; label: string; awards: Award[] };

/** Agrupa por evento e ano ("Halloween 2026", "Clássica 2026"), na ordem em que chegam. */
function groupByEvent(awards: readonly Award[]): AwardGroup[] {
  const groups = new Map<string, AwardGroup>();
  for (const award of awards) {
    const year = award.date.slice(0, 4);
    const key = `${award.theme}-${year}`;
    const group = groups.get(key) ?? { key, label: `${CARD_THEME_LABELS[award.theme]} ${year}`, awards: [] };
    group.awards.push(award);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Galeria filtrável das cartas especiais, agrupada por evento. */
export function CollectionGallery({ awards }: CollectionGalleryProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? awards : awards.filter((award) => award.kind === filter);
  const groups = groupByEvent(visible);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: awards.length },
    ...AWARD_KINDS.map((kind) => ({
      key: kind,
      label: AWARD_LABELS[kind].title,
      count: awards.filter((award) => award.kind === kind).length,
    })),
  ];

  return (
    <section aria-labelledby="gallery-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <SectionTitle id="gallery-title">Galeria</SectionTitle>

      {/* Filtros: rolam de lado dentro da própria faixa, sem empurrar a página. */}
      <div role="group" aria-label="Filtrar por prêmio" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {filters.map((option) => {
          const isActive = option.key === filter;
          const Icon = option.key === "all" ? null : AWARD_ICONS[option.key];
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(option.key)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
                isActive
                  ? "border-primary bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {Icon && <Icon aria-hidden className="size-4" />}
              {option.label}
              <span className="font-display font-bold tabular-nums">{option.count}</span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma carta desse tipo ainda.</p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-3 border-t pt-4 first-of-type:border-t-0 first-of-type:pt-0">
            <h3 className="flex items-baseline justify-between gap-2 text-xs font-medium text-muted-foreground uppercase">
              {group.label}
              <span className="normal-case tabular-nums">
                {group.awards.length} {group.awards.length === 1 ? "carta" : "cartas"}
              </span>
            </h3>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
              {group.awards.map((award) => (
                <li key={award.id} className="mx-auto flex w-full max-w-44 min-w-0 flex-col items-center gap-1.5 text-center">
                  <PlayerCard player={award.card} award={award} size="fill" />
                  <p className="text-sm leading-tight font-medium">{AWARD_LABELS[award.kind].title}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    R{award.round} · {formatShortDate(award.date)} · {award.votes}{" "}
                    {award.votes === 1 ? "voto" : "votos"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
