"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { TrophyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlphaVideo } from "./alpha-video";

/** Duração do vídeo da cortina (renderizado no Blender, `scripts/blender/cortina.py`): o pai segue para o primeiro passo depois dele. */
export const CURTAIN_OPEN_MS = 3200;
/** Quanto a cortina fica por cima do primeiro passo enquanto abre um vão no meio e some vindo para a tela (`curtain-leaving`). */
export const CURTAIN_LEAVE_MS = 3300;

type RevealCurtainProps = {
  round: number;
  /** Texto do conteúdo, ex.: "9 cartas". */
  contents: string;
  isOpening: boolean;
  onOpen: () => void;
};

/** Os dois fachos de luz do palco da versão de reserva (CSS): ângulo inicial e final do balanço. */
const BEAMS: readonly { left: string; r0: string; r1: string }[] = [
  { left: "18%", r0: "-14deg", r1: "-6deg" },
  { left: "82%", r0: "14deg", r1: "6deg" },
];

/**
 * A abertura da "noite de premiação" (pedido do dono do app em 2026-11-10): uma cortina de veludo com o nome da rodada; ao
 * tocar, ela se abre e revela o palco. A cortina é um **vídeo renderizado no Blender** (simulação de tecido de verdade;
 * aprovado pelo dono do app em 2026-11-11); se o vídeo não carregar, vale a versão de reserva em CSS (`curtain-*` no `globals.css`).
 * Com movimento reduzido, o vídeo não toca (fica a imagem da cortina fechada). Desde 2026-11-11 o vídeo tem
 * transparência (`AlphaVideo`): só o tecido, e o primeiro passo, que já toca por baixo, aparece pelo vão de verdade.
 */
export function RevealCurtain({ round, contents, isOpening, onOpen }: RevealCurtainProps) {
  const [hasVideo, setHasVideo] = useState(true);
  const handleFail = useCallback(() => setHasVideo(false), []);

  return (
    // Fechada, a cortina fica sobre o preto; abrindo, o fundo some e o que estiver por baixo aparece pelo vão.
    <div className={cn("absolute inset-0 overflow-hidden", isOpening ? "curtain-opening" : "bg-black")}>
      {hasVideo ? (
        <>
          {!isOpening && (
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url(/revelacao/cortina-poster.jpg)" }}
            />
          )}
          <AlphaVideo
            src="/revelacao/cortina-alfa.mp4"
            isPlaying={isOpening}
            onFail={handleFail}
            className="absolute top-1/2 left-1/2 aspect-9/16 w-[max(100%,calc(100dvh*9/16))] -translate-1/2"
          />
        </>
      ) : (
        <>
          {/* Reserva em CSS: o palco que aparece quando a cortina abre e as duas folhas. */}
          <div aria-hidden className="curtain-stage absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,oklch(0.3_0.04_80/0.55),transparent_60%)]">
            {BEAMS.map((beam) => (
              <span
                key={beam.left}
                className="curtain-beam absolute top-0 h-[75%] w-40 -translate-x-1/2 bg-linear-to-b from-white/35 via-white/10 to-transparent [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]"
                style={{ left: beam.left, "--r0": beam.r0, "--r1": beam.r1 } as CSSProperties}
              />
            ))}
            <span className="absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-black/70 to-transparent" />
          </div>
          <span aria-hidden className="curtain-panel curtain-left absolute inset-y-0 left-0 w-[52%] shadow-[8px_0_30px_rgba(0,0,0,0.6)]" />
          <span aria-hidden className="curtain-panel curtain-right absolute inset-y-0 right-0 w-[52%] shadow-[-8px_0_30px_rgba(0,0,0,0.6)]" />
          <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-16 bg-linear-to-b from-[#2b050c] to-transparent" />
        </>
      )}
      {/* Escurece a parte de baixo da cortina fechada para o texto e o botão lerem bem. */}
      <span aria-hidden className="curtain-text pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(0,0,0,0.55),transparent_70%)]" />

      <div className="curtain-text absolute inset-0 z-20 flex flex-col items-center justify-center gap-7 px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-full border-2 border-amber-300/80 bg-black/35 text-amber-300 shadow-[0_0_40px_rgba(252,211,77,0.35)]">
          <TrophyIcon aria-hidden className="size-10" />
        </span>
        <div className="flex flex-col items-center gap-2 font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
          <span className="text-sm font-bold tracking-[0.35em] text-amber-300 uppercase">Noite de premiação</span>
          <span className="text-6xl leading-none font-extrabold text-amber-50 uppercase">Rodada {round}</span>
          <span className="font-sans text-xs tracking-wide text-amber-100/80 uppercase">{contents}</span>
        </div>
        {!isOpening && (
          <div className="flex w-full max-w-sm flex-col items-center gap-3">
            <Button size="lg" className="h-11 w-full text-base" onClick={onOpen}>
              Subir as cortinas
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
