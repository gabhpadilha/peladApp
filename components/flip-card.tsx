"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CardBack } from "@/components/card-back";
import { isTrimmedCard } from "@/components/cancha-card";
import { PlayerCard } from "@/components/player-card";
import type { PackRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";

const HALF_TURN_MS = 240;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(callback: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * Carta que gira ao toque: a frente é a carta de sempre e o verso mostra a raridade da skin (`CardBack`). O giro são duas metades
 * (a carta fecha de lado, troca a face e abre de novo), só com `transform`: nada de `backface-visibility`, que no iPhone falha com
 * camadas animadas. Com movimento reduzido, a face troca na hora. É um botão (teclado e leitor de tela).
 */
export function FlipCard({ player, rarity, skinName, className }: { player: Player; rarity: PackRarity; skinName: string; className?: string }) {
  const [isBack, setIsBack] = useState(false);
  const [angle, setAngle] = useState(0);
  const [animated, setAnimated] = useState(true);
  const timer = useRef<number | null>(null);
  const isReduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_QUERY).matches, () => false);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  function handleFlip() {
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

  const trimmed = isTrimmedCard(player);

  return (
    <button
      type="button"
      onClick={handleFlip}
      aria-pressed={isBack}
      aria-label={isBack ? "Ver a frente da carta" : `Virar a carta: raridade ${rarity}`}
      className={cn("block w-full cursor-pointer text-left [perspective:900px]", className)}
    >
      <span
        className="block"
        style={{ transform: `rotateY(${angle}deg)`, transition: animated ? `transform ${HALF_TURN_MS}ms ${angle === 0 ? "ease-out" : "ease-in"}` : "none" }}
      >
        {isBack ? (
          <span className="block" style={trimmed ? { padding: "8%" } : undefined}>
            <CardBack rarity={rarity} skinName={skinName} />
          </span>
        ) : (
          <PlayerCard player={player} size="fill" />
        )}
      </span>
    </button>
  );
}
