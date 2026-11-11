"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { SparklesIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { AWARD_LABELS, formatAwardResult, type Award, type AwardKind } from "@/types/award";
import type { CardThemeKey } from "@/lib/card-themes";
import { revealColorStyle } from "./reveal-theme";

type RevealHighlightsProps = {
  /** Um prêmio por atributo da linha, o Melhor Goleiro e o Gol da Rodada. */
  awards: Award[];
  /** Tema da rodada (o palco ainda é um só para todos os temas). */
  fieldTheme: CardThemeKey;
  nextLabel: string;
  onNext: () => void;
};

/**
 * Base de cada pedestal na tela do vídeo (em % da largura e da altura), na ordem em que acendem: fileira de cima, do
 * meio e de baixo, da esquerda para a direita. Sai do `slots.json` do render (`scripts/blender/destaques.py`).
 */
const PEDESTALS: readonly (readonly [number, number])[] = [
  [30.0, 31.6], [50.0, 31.6], [70.0, 31.6],
  [26.7, 48.4], [50.0, 48.4], [73.3, 48.4],
  [22.0, 71.6], [50.0, 71.6], [78.0, 71.6],
];

/** Quando cada pedestal acende no vídeo (quadro 39 + 7 por pedestal, a 30 quadros por segundo). */
function igniteAt(slot: number) {
  return (39 + slot * 7) / 30;
}

/**
 * Em que pedestal cada prêmio sobe: o Goleador no meio de cima, ataque e gol ao lado; criação no centro; defesa e
 * goleiro embaixo (o goleiro no meio, como no gol). Os prêmios por atributo das rodadas antigas ocupam as sobras.
 */
const SLOT_OF: Partial<Record<AwardKind, number>> = {
  atacante: 0, goleador: 1, gol: 2,
  foguete: 3, criativo: 4, garcom: 5,
  defensor: 6, goleiro: 7, motor: 8,
};
const FREE_ORDER = [4, 1, 7, 3, 5, 0, 2, 6, 8] as const;

function placeAwards(awards: Award[]) {
  const taken = new Map<number, Award>();
  const extras: Award[] = [];
  for (const award of awards) {
    const slot = SLOT_OF[award.kind];
    if (slot !== undefined && !taken.has(slot)) taken.set(slot, award);
    else extras.push(award);
  }
  // Empates e prêmios sem pedestal próprio vão para os pedestais livres; o que sobrar aparece embaixo.
  const rest: Award[] = [];
  for (const award of extras) {
    const free = FREE_ORDER.find((slot) => !taken.has(slot));
    if (free === undefined) rest.push(award);
    else taken.set(free, award);
  }
  return { placed: [...taken.entries()].sort((a, b) => a[0] - b[0]), rest };
}

/**
 * "Destaques da rodada" no palco renderizado no Blender (2026-11-11, no lugar dos envelopes): a câmera sobe em grua
 * sobre 9 pedestais que acendem um a um, e cada carta (desenhada ao vivo por cima do vídeo, com a foto de quem ganhou)
 * sobe no seu pedestal quando ele acende. O vídeo para no último quadro, que já está quase parado; com movimento
 * reduzido fica a imagem final e as cartas aparecem direto.
 */
export function RevealHighlights({ awards, nextLabel, onNext }: RevealHighlightsProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { placed, rest } = placeAwards(awards);
  const lastAt = placed.length > 0 ? igniteAt(placed[placed.length - 1][0]) : 1.5;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    video.play().catch(() => undefined);
  }, []);

  return (
    <section aria-live="polite" aria-label="Destaques da rodada" className="absolute inset-0 overflow-hidden">
      {/* O palco ocupa a tela toda (como `object-cover`), e as cartas usam as mesmas medidas do vídeo. */}
      <div className="absolute top-1/2 left-1/2 aspect-9/16 w-[max(100%,calc(100dvh*9/16))] -translate-1/2">
        <video
          ref={videoRef}
          aria-hidden
          muted
          playsInline
          preload="auto"
          poster="/revelacao/destaques-poster.jpg"
          className="pointer-events-none absolute inset-0 size-full motion-reduce:hidden"
        >
          <source src="/revelacao/destaques.webm" type="video/webm" />
          <source src="/revelacao/destaques.mp4" type="video/mp4" />
        </video>
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-cover bg-center motion-reduce:block"
          style={{ backgroundImage: "url(/revelacao/destaques-poster.jpg)" }}
        />

        <ul className="absolute inset-0">
          {placed.map(([slot, award]) => {
            const [x, y] = PEDESTALS[slot];
            return (
              <li
                key={award.id}
                style={{ ...revealColorStyle(award.kind, award.theme), left: `${x}%`, top: `${y}%`, "--d": `${igniteAt(slot)}s` } as CSSProperties}
                className="absolute w-[17%] -translate-x-1/2 -translate-y-full pb-[1%]"
              >
                <div className="stage-card flex flex-col items-center gap-0.5 motion-reduce:opacity-100">
                <span className="max-w-[140%] truncate rounded-full bg-black/70 px-1.5 text-[0.625rem] font-semibold whitespace-nowrap text-white">
                  {AWARD_LABELS[award.kind].title}
                </span>
                <div className="w-full">
                  <PlayerCard player={award.card} award={award} size="fill" />
                </div>
                <span className="max-w-[140%] truncate rounded-full bg-(--reveal-color) px-1.5 text-[0.625rem] font-semibold whitespace-nowrap text-black tabular-nums">
                  {formatAwardResult(award)}
                </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-linear-to-b from-black/80 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-black/85 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-1 px-4 pt-16 text-center">
        <span className="flex items-center gap-2 font-display text-3xl leading-none font-extrabold uppercase">
          <SparklesIcon aria-hidden className="size-5 text-primary" />
          Destaques da rodada
        </span>
        <p className="text-xs text-white/75">O melhor no ataque, na criação e na defesa, o goleiro e o gol mais bonito</p>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 flex animate-[reveal-fade_0.4s_ease-out_both] flex-col items-center gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
        style={{ animationDelay: `${lastAt + 0.9}s` }}
      >
        {rest.length > 0 && (
          <p className="text-center text-xs text-white/80">
            Também: {rest.map((award) => `${AWARD_LABELS[award.kind].title} · ${award.card.nickname}`).join(", ")}
          </p>
        )}
        <Button size="lg" className="h-11 w-full max-w-sm text-base" onClick={onNext}>
          {nextLabel}
        </Button>
      </div>
    </section>
  );
}
