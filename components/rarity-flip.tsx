"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { RotateCwIcon } from "lucide-react";
import { CardBack } from "@/components/card-back";
import { isTrimmedCard } from "@/components/cancha-card";
import { getSkinRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";
import { getCardSkin, isCardSkinKey } from "@/types/card-skin";
import type { Player } from "@/types/player";

const HALF_TURN_MS = 240;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(callback: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** O giro em duas metades: a carta fecha de lado, troca a face e abre de novo (só `transform`; sem `backface-visibility`). */
function useCardFlip() {
  const [isBack, setIsBack] = useState(false);
  const [angle, setAngle] = useState(0);
  const [animated, setAnimated] = useState(true);
  const timer = useRef<number | null>(null);
  const isReduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  function flip() {
    if (timer.current !== null) return;
    if (isReduced) {
      setIsBack((value) => !value);
      return;
    }
    setAnimated(true);
    setAngle(90);
    timer.current = window.setTimeout(() => {
      setIsBack((value) => !value);
      setAnimated(false);
      setAngle(-90);
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          setAnimated(true);
          setAngle(0);
          timer.current = window.setTimeout(() => {
            timer.current = null;
          }, HALF_TURN_MS);
        }),
      );
    }, HALF_TURN_MS);
  }

  return { isBack, flip, style: { transform: `rotateY(${angle}deg)`, transition: animated ? `transform ${HALF_TURN_MS}ms ${angle === 0 ? "ease-out" : "ease-in"}` : "none" } };
}

type RarityFlipProps = {
  player: Player;
  /**
   * - `tap`: a carta inteira vira ao toque (Início e Carreira, onde ela não faz outra coisa) e leva o botão de virar no pé;
   * - `corner`: só o botão de virar no canto (mesa tática, onde tocar na carta avalia o atleta);
   * - `thumb`: tocar na miniatura vira a carta, sem abrir o perfil (ranking, onde a linha é um link).
   */
  mode: "tap" | "corner" | "thumb";
  /** A carta de sempre (a frente). */
  children: ReactNode;
  className?: string;
};

/**
 * Giro da carta com o verso da raridade da skin (decisão do dono do app em 2026-11-09: a raridade aparece no verso). Só gira carta
 * com skin que tem raridade (`SKIN_RARITIES`); a carta padrão e as de prêmio ficam como estão. Com movimento reduzido, a face troca na hora.
 */
export function RarityFlip({ player, mode, children, className }: RarityFlipProps) {
  const { isBack, flip, style } = useCardFlip();
  const rarity = getSkinRarity(player.cardSkin);
  if (!rarity || !player.cardSkin) return <>{children}</>;

  const skinName = isCardSkinKey(player.cardSkin) ? getCardSkin(player.cardSkin).name : "";
  const back = (
    <span className="block" style={isTrimmedCard(player) ? { padding: "8%" } : undefined}>
      <CardBack rarity={rarity} skinName={skinName} />
    </span>
  );

  function handleActivate(event: MouseEvent | KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    flip();
  }

  const face = (
    <span className="block [perspective:900px]">
      <span className="block" style={style}>
        {isBack ? back : children}
      </span>
    </span>
  );

  if (mode === "thumb") {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-pressed={isBack}
        aria-label={isBack ? "Ver a frente da carta" : "Virar a carta para ver a raridade"}
        onClick={handleActivate}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") handleActivate(event);
        }}
        className={cn("block cursor-pointer", className)}
      >
        {face}
      </span>
    );
  }

  const trigger = (
    <button
      type="button"
      onClick={handleActivate}
      aria-pressed={isBack}
      aria-label={isBack ? "Ver a frente da carta" : "Virar a carta para ver a raridade"}
      className={cn(
        "absolute z-30 flex size-7 items-center justify-center rounded-full border border-white/25 bg-black/65 text-white shadow-md before:absolute before:-inset-2 before:content-['']",
        mode === "tap" ? "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" : "top-0 left-0 -translate-x-1/3 -translate-y-1/3",
      )}
    >
      <RotateCwIcon aria-hidden className="size-3.5" />
    </button>
  );

  if (mode === "tap") {
    return (
      <div className={cn("relative pb-3", className)}>
        <div
          role="button"
          tabIndex={0}
          aria-pressed={isBack}
          aria-label={isBack ? "Ver a frente da carta" : "Virar a carta para ver a raridade"}
          onClick={handleActivate}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") handleActivate(event);
          }}
          className="cursor-pointer"
        >
          {face}
        </div>
        {trigger}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {face}
      {trigger}
    </div>
  );
}
