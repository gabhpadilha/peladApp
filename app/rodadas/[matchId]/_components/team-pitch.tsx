"use client";

import { useMemo, type ReactNode } from "react";
import { ArmchairIcon } from "lucide-react";
import type { CardThemeKey } from "@/lib/card-themes";
import { assignFormation, type FormationSlotKey } from "@/lib/formation";
import { cn } from "@/lib/utils";
import type { BoardPlayer, BoardTeam } from "../_data-access/get-match-board";
import { BoardCard, type RatingState } from "./board-card";

type TeamPitchProps = {
  team: BoardTeam;
  mode: "rate" | "view";
  ratingOf: (playerId: string) => RatingState;
  onRate: (playerId: string) => void;
  /** Tema do evento na data da rodada: veste o campo com o cenário dele. */
  theme: CardThemeKey;
};

/**
 * Cenário de cada evento em volta do campo (pedido do dono do app em 2026-10-30): a arte
 * fica nos cantos e nas bordas, onde o 1-2-1 não põe carta. Imagens em `public/mesa/`,
 * geradas por `prototipos/mesa-<tema>.cjs` (docs). Tema novo: arte nova e uma linha aqui.
 */
const PITCH_SCENES: Record<CardThemeKey, string | null> = {
  default: null,
  halloween: "border-orange-500/30 bg-[#0b0f07] bg-[url(/mesa/halloween.webp)] bg-[length:100%_100%]",
  temporal: "border-sky-300/25 bg-[#060a12] bg-[url(/mesa/temporal.webp)] bg-[length:100%_100%]",
};

/**
 * Arte do Time Preto, quando ela é diferente: a quadra do Toró é um render 3D da quadra inteira vista de trás do gol do time
 * (cada time vê a quadra a partir do seu gol, que fica embaixo, e o do adversário lá em cima).
 */
const PITCH_SCENES_TEAM_2: Partial<Record<CardThemeKey, string>> = {
  temporal: "border-sky-300/25 bg-[#060a12] bg-[url(/mesa/temporal-preto.webp)] bg-[length:100%_100%]",
};

/** Cenários que já trazem as linhas da quadra na própria arte (render 3D do Blender): sem as linhas de código por cima. */
const SCENES_WITH_OWN_LINES: ReadonlySet<CardThemeKey> = new Set<CardThemeKey>(["temporal"]);

/** Linhas do campo (meio de campo em cima, área do goleiro embaixo), só de fundo. */
function PitchLines() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 440"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full text-foreground/15"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
        <rect x="8" y="8" width="284" height="424" rx="6" vectorEffect="non-scaling-stroke" />
        <path d="M110 8 A40 40 0 0 0 190 8" vectorEffect="non-scaling-stroke" />
        <rect x="70" y="352" width="160" height="80" vectorEffect="non-scaling-stroke" />
        <rect x="110" y="392" width="80" height="40" vectorEffect="non-scaling-stroke" />
        <path d="M118 352 A32 32 0 0 1 182 352" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

/** Célula do campo: coluna e linha onde a carta fica (ataque em cima, gol embaixo). */
const SLOT_CELLS: Record<FormationSlotKey, string> = {
  pivo: "col-start-2 row-start-1",
  "ala-esquerda": "col-start-1 row-start-2",
  "ala-direita": "col-start-3 row-start-2",
  fixo: "col-start-2 row-start-3",
  gol: "col-start-2 row-start-4",
};

function Swatch({ team }: { team: number }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3.5 rounded-full border", team === 1 ? "bg-white" : "border-white/40 bg-black")}
    />
  );
}

/** Um time na mesa tática: título, campo com os titulares nas posições e a fileira de reservas. */
export function TeamPitch({ team, mode, ratingOf, onRate, theme }: TeamPitchProps): ReactNode {
  // Performance: a formação só depende dos titulares (vindos da página, estáveis);
  // antes era recalculada, com objetos novos, a cada passo de slider na mesa.
  const slots = useMemo(
    // Posição da rodada: quem jogou no gol vai para o gol.
    () => assignFormation(team.starters.map((entry) => ({ ...entry, position: entry.slotPosition }))),
    [team.starters],
  );
  const scene = (team.number === 2 ? PITCH_SCENES_TEAM_2[theme] : undefined) ?? PITCH_SCENES[theme];
  const cardFor = (entry: BoardPlayer) => (
    <BoardCard entry={entry} mode={mode} rating={ratingOf(entry.player.id)} onRate={onRate} />
  );

  return (
    <section aria-labelledby={`team-${team.number}-title`} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id={`team-${team.number}-title`} className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <Swatch team={team.number} />
          Time {team.name}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {team.starters.length} titulares · média{" "}
          <span className="font-display text-lg font-bold text-foreground">{team.averageOvr ?? "–"}</span>
        </p>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border px-[5%]",
          // A arte 3D da quadra tem os gols nas pontas: mais espaço em cima e embaixo para as cartas não cobrirem os gols.
          SCENES_WITH_OWN_LINES.has(theme) ? "py-[15%]" : "py-[6%]",
          scene ?? "bg-gradient-to-b from-card to-background/40",
        )}
      >
        {!SCENES_WITH_OWN_LINES.has(theme) && <PitchLines />}
        {/* Listras do gramado, bem sutis (o cenário já traz as dele) */}
        {scene === null && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_56px,rgb(255_255_255/0.025)_56px_112px)]"
          />
        )}
        <ul className="relative grid grid-cols-3 gap-x-[4%] gap-y-[clamp(1rem,5vw,2rem)]">
          {(Object.keys(SLOT_CELLS) as FormationSlotKey[]).map((key) => {
            const entry = slots[key];
            return (
              <li key={key} className={cn("flex justify-center", SLOT_CELLS[key])}>
                {entry ? (
                  <div className="w-[92%] max-w-44">{cardFor(entry)}</div>
                ) : (
                  // Vaga sem jogador (time incompleto): contorno tracejado no formato da carta.
                  <div
                    aria-hidden
                    className="aspect-[5/7] w-[92%] max-w-44 rounded-xl border border-dashed border-foreground/15"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {team.reserves.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed p-3 pb-5">
          <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <ArmchairIcon aria-hidden className="size-4" />
            Reservas · {team.reserves.length}
          </p>
          <ul className="grid grid-cols-4 gap-x-[3%] gap-y-5">
            {team.reserves.map((entry) => (
              <li key={entry.player.id}>{cardFor(entry)}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
