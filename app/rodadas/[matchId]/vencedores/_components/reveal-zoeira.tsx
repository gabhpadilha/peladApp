import type { CSSProperties } from "react";
import { FrownIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";

type RevealZoeiraProps = {
  /** Bola Murcha (empate: mais de uma carta; cartas antigas de Fominha também caem aqui). */
  awards: Award[];
  nextLabel: string;
  onNext: () => void;
};

/** Pedestais do palco (mesmas medidas de `reveal-highlights.tsx`): o do centro e, no empate, os do lado. */
const SPOTS: readonly (readonly [number, number])[] = [[50.0, 48.4], [26.7, 48.4], [73.3, 48.4]];

/**
 * A zoeira abre a noite (2026-11-11, no lugar do envelope): o mesmo palco do Blender dos destaques, com as luzes
 * apagadas e frias; a carta da Bola Murcha (a menor nota da rodada) cai no pedestal do meio e murcha. Só CSS por cima
 * da imagem final do render.
 */
export function RevealZoeira({ awards, nextLabel, onNext }: RevealZoeiraProps) {
  const shown = awards.slice(0, SPOTS.length);
  return (
    <section aria-live="polite" aria-label="Zoeira da rodada" className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 aspect-9/16 w-[max(100%,calc(100dvh*9/16))] -translate-1/2">
        <div
          aria-hidden
          className="absolute inset-0 animate-[reveal-fade_1s_ease-out_both] bg-cover bg-center grayscale-[0.7]"
          style={{ backgroundImage: "url(/revelacao/destaques-poster.jpg)" }}
        />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_18%,oklch(0.12_0.02_260/0.82)_58%)]" />

        <ul className="absolute inset-0">
          {shown.map((award, index) => {
            const [x, y] = SPOTS[index];
            return (
              <li
                key={award.id}
                style={{ left: `${x}%`, top: `${y}%`, "--d": `${0.7 + index * 0.5}s` } as CSSProperties}
                className="absolute w-[24%] -translate-x-1/2 -translate-y-full pb-[1%]"
              >
                <div className="stage-flop motion-reduce:opacity-100">
                  <PlayerCard player={award.card} award={award} size="fill" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-linear-to-b from-black/80 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-black/90 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-1 px-4 pt-16 text-center">
        <span className="flex items-center gap-2 font-display text-3xl leading-none font-extrabold uppercase">
          <FrownIcon aria-hidden className="size-5 text-muted-foreground" />
          Zoeira da rodada
        </span>
        <p className="text-xs text-white/75">A menor nota da rodada leva a Bola Murcha</p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex animate-[reveal-fade_0.4s_ease-out_2s_both] flex-col items-center text-center leading-tight">
          <span className="font-display text-2xl font-bold uppercase">{AWARD_LABELS[shown[0]?.kind ?? "bola_murcha"].title}</span>
          <span className="text-sm text-white/75">
            {shown.map((award) => `${award.card.nickname} · ${formatAwardResult(award)}`).join("  ·  ")}
          </span>
        </div>
        <Button
          size="lg"
          className="h-11 w-full max-w-sm animate-[reveal-fade_0.4s_ease-out_2.6s_both] text-base"
          onClick={onNext}
        >
          {nextLabel}
        </Button>
      </div>
    </section>
  );
}
