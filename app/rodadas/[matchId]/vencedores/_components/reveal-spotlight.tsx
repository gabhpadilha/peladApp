"use client";

import { useEffect, useRef } from "react";
import { AWARD_ICONS } from "@/components/award-icons";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";
import { revealColorStyle } from "./reveal-theme";

type RevealSpotlightProps = {
  award: Award;
  nextLabel: string;
  onNext: () => void;
};

/**
 * O Melhor Jogador sobe no pedestal sob o holofote (cena renderizada no Blender, `public/revelacao/melhor-jogador.*`,
 * 3 s). A carta de cada um é desenhada por cima, ao vivo: assim o mesmo vídeo serve para todos. O vídeo para no último
 * quadro; sem animação (ou se o vídeo falhar), fica a imagem final e a carta aparece direto. O pai troca a `key` a cada carta.
 */
export function RevealSpotlight({ award, nextLabel, onNext }: RevealSpotlightProps) {
  const Icon = AWARD_ICONS[award.kind];
  const title = AWARD_LABELS[award.kind].title;
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
    <section
      aria-live="polite"
      aria-label={`${title}: ${award.card.nickname}`}
      style={revealColorStyle(award.kind, award.theme)}
      className="absolute inset-0 flex flex-col items-center px-6 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <video
        ref={videoRef}
        aria-hidden
        muted
        playsInline
        preload="auto"
        poster="/revelacao/melhor-jogador-poster.jpg"
        className="pointer-events-none absolute inset-0 size-full object-cover motion-reduce:hidden"
      >
        <source src="/revelacao/melhor-jogador.webm" type="video/webm" />
        <source src="/revelacao/melhor-jogador.mp4" type="video/mp4" />
      </video>
      {/* Quem prefere menos movimento (ou se o vídeo não rodar) vê só o quadro final. */}
      <div
        aria-hidden
        className="absolute inset-0 hidden bg-cover bg-center motion-reduce:block"
        style={{ backgroundImage: "url(/revelacao/melhor-jogador-poster.jpg)" }}
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />

      <div className="relative flex w-full flex-1 items-center justify-center">
        <div className="spot-card w-56 motion-reduce:opacity-100">
          <PlayerCard player={award.card} award={award} size="fill" />
        </div>
      </div>

      <div className="relative mt-4 flex animate-[reveal-fade_0.4s_ease-out_3.3s_both] flex-col items-center gap-1 text-center">
        <span className="flex items-center gap-2 font-display text-3xl font-extrabold uppercase">
          <Icon aria-hidden className="size-6 text-(--reveal-color)" />
          {title}
        </span>
        <p className="text-sm text-muted-foreground">
          {award.card.nickname} · {formatAwardResult(award)}
        </p>
      </div>

      <Button
        size="lg"
        className="relative mt-6 h-11 w-full max-w-sm animate-[reveal-fade_0.4s_ease-out_3.6s_both] text-base"
        onClick={onNext}
      >
        {nextLabel}
      </Button>
    </section>
  );
}
