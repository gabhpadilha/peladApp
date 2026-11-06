"use client";

import { useState } from "react";
import Link from "next/link";
import { OvrBadge } from "@/components/ovr-badge";
import { PlayerCard } from "@/components/player-card";
import { rankShowcase, showcaseMonths, toPublicCard, type CommunityPeriod, type RankingKind, type ShowcasePlayer } from "@/lib/community";
import { cn } from "@/lib/utils";

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function monthLabel(month: string): string {
  const [year, number] = month.split("-");
  const name = MONTH_NAMES[Number(number) - 1] ?? month;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

function Segmented<Value extends string>({ options, value, onChange, label }: { options: { key: Value; label: string }[]; value: Value; onChange: (value: Value) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            "h-11 flex-1 rounded-lg px-3 text-sm font-bold whitespace-nowrap transition-colors",
            value === option.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Ranking público de uma pelada: pontos ou gols, do mês ou de todos os tempos. Cada nome leva ao perfil do atleta. */
export function ShowcaseRanking({ groupId, players }: { groupId: string; players: ShowcasePlayer[] }) {
  const months = showcaseMonths(players);
  const [kind, setKind] = useState<RankingKind>("points");
  const [period, setPeriod] = useState<CommunityPeriod>(months[0] ?? "all");
  const rows = rankShowcase(players, kind, period);

  return (
    <section aria-labelledby="ranking-title" className="flex flex-col gap-3">
      <h2 id="ranking-title" className="sr-only">Ranking</h2>
      <Segmented
        label="Tipo de ranking"
        value={kind}
        onChange={setKind}
        options={[{ key: "points", label: "Pontos" }, { key: "goals", label: "Gols" }]}
      />
      <Segmented
        label="Período"
        value={period}
        onChange={setPeriod}
        options={[
          ...(months[0] ? [{ key: months[0], label: monthLabel(months[0]) }] : []),
          { key: "all", label: "Todos os tempos" },
        ]}
      />
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Ninguém pontuou nesse período ainda. Os gols entram depois que a rodada fecha com os gols confirmados.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.player.id}>
              <Link
                href={`/comunidade/${groupId}/${row.player.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted"
              >
                <span className="w-6 shrink-0 text-center font-display text-xl font-bold text-muted-foreground tabular-nums">{row.position}</span>
                <PlayerCard player={toPublicCard(row.player)} size="fill" className="w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{row.player.nickname}</p>
                  <p className="text-sm text-muted-foreground">
                    {kind === "points" ? `${row.rounds} ${row.rounds === 1 ? "rodada" : "rodadas"}` : `${row.games} ${row.games === 1 ? "jogo" : "jogos"}`}
                  </p>
                </div>
                <OvrBadge ovr={row.player.ovr} />
                <span className="w-14 shrink-0 text-right font-display text-2xl font-extrabold tabular-nums">
                  {row.value}
                  <span className="sr-only"> {kind === "points" ? "pontos" : "gols"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
