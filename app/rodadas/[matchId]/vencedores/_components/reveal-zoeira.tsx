"use client";

import { useEffect, useRef, type CSSProperties } from "react";
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

/** Quando a bola para no vídeo (2,7 s): só então a carta cai por cima. */
const CARD_DELAY_S = 2.4;

/**
 * A zoeira fecha a noite, depois do Melhor Jogador (2026-11-11): de propósito simples, sem o palco dos destaques
 * (pedido do dono do app). No fundo, um vídeo do Blender (`public/revelacao/bola-murcha.*`, `scripts/blender/bola-murcha.py`):
 * uma bola de futsal velha e meio vazia entra quicando sem força, rola, desliza e para murcha sob uma luz fria. Depois a
 * carta da Bola Murcha (a menor nota da rodada) cai por cima e murcha, ao vivo. O vídeo para no último quadro; com
 * movimento reduzido (ou se o vídeo falhar), fica a capa parada e a carta aparece direto.
 */
export function RevealZoeira({ awards, nextLabel, onNext }: RevealZoeiraProps) {
  const shown = awards.slice(0, 2);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    <section aria-live="polite" aria-label="Zoeira da rodada" className="absolute inset-0 overflow-hidden bg-black">
      <video
        ref={videoRef}
        aria-hidden
        muted
        playsInline
        preload="auto"
        poster="/revelacao/bola-murcha-poster.jpg"
        className="pointer-events-none absolute inset-0 size-full object-cover motion-reduce:hidden"
      >
        <source src="/revelacao/bola-murcha.webm" type="video/webm" />
        <source src="/revelacao/bola-murcha.mp4" type="video/mp4" />
      </video>
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-cover bg-center motion-reduce:block"
        style={{ backgroundImage: "url(/revelacao/bola-murcha-poster.jpg)" }}
      />

      {/* A bola para no terço de baixo; a carta fica acima dela. */}
      <ul className="absolute inset-x-0 top-[40%] flex -translate-y-1/2 justify-center gap-[4%] px-4">
        {shown.map((award, index) => (
          <li key={award.id} style={{ "--d": `${CARD_DELAY_S + index * 0.3}s` } as CSSProperties} className="w-[min(56%,15rem)]">
            <div className="stage-flop motion-reduce:opacity-100 motion-reduce:[animation-delay:0s]">
              <PlayerCard player={award.card} award={award} size="fill" />
            </div>
          </li>
        ))}
      </ul>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-linear-to-b from-black/80 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-black/90 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-1 px-4 pt-16 text-center">
        <span className="flex items-center gap-2 font-display text-3xl leading-none font-extrabold uppercase">
          <FrownIcon aria-hidden className="size-5 text-muted-foreground" />
          Zoeira da rodada
        </span>
        <p className="text-xs text-white/75">A menor nota da rodada leva a Bola Murcha</p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex animate-[reveal-fade_0.4s_ease-out_3.4s_both] flex-col motion-reduce:animate-none items-center text-center leading-tight">
          <span className="font-display text-2xl font-bold uppercase">{AWARD_LABELS[shown[0]?.kind ?? "bola_murcha"].title}</span>
          <span className="text-sm text-white/75">
            {shown.map((award) => `${award.card.nickname} · ${formatAwardResult(award)}`).join("  ·  ")}
          </span>
        </div>
        <Button
          size="lg"
          className="h-11 w-full max-w-sm animate-[reveal-fade_0.4s_ease-out_3.8s_both] text-base motion-reduce:animate-none"
          onClick={onNext}
        >
          {nextLabel}
        </Button>
      </div>
    </section>
  );
}
