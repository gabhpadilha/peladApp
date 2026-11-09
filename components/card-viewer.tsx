"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { RotateCwIcon } from "lucide-react";
import { CardBack } from "@/components/card-back";
import { CanchaCard, isTrimmedCard } from "@/components/cancha-card";
import { PlayerCard } from "@/components/player-card";
import { RarityLabel } from "@/components/rarity-label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CARD_RANK_LABELS, getCardRank } from "@/lib/card-rank";
import { getCardStats } from "@/lib/card-stats";
import { getSkinRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";
import { getCardSkin, isCardSkinKey } from "@/types/card-skin";
import { POSITION_LABELS, type Player } from "@/types/player";

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

/** A carta grande do visualizador: tocar nela vira para o verso da raridade (só skins com raridade). */
function ViewerCard({ player, showcase }: { player: Player; showcase: boolean }) {
  const { isBack, flip, style } = useCardFlip();
  const rarity = getSkinRarity(player.cardSkin);
  const skinName = player.cardSkin && isCardSkinKey(player.cardSkin) ? getCardSkin(player.cardSkin).name : "";
  // Vitrine: só o design da skin, como no pacote (sem foto, nome, selo nem estatísticas do jogador de exemplo).
  const front = showcase ? (
    <CanchaCard player={{ ...player, photo: null, nickname: "", fullName: "" }} pure photoSizes="264px" className="w-full" />
  ) : (
    <PlayerCard player={player} size="fill" />
  );

  if (!rarity) return <div className="w-full">{front}</div>;

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flip();
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isBack}
        aria-label={isBack ? "Ver a frente da carta" : "Virar a carta para ver a raridade"}
        onClick={flip}
        onKeyDown={handleKeyDown}
        className="w-full cursor-pointer [perspective:900px]"
      >
        <span className="block" style={style}>
          {isBack ? (
            <span className="block" style={isTrimmedCard(player) ? { padding: "8%" } : undefined}>
              <CardBack rarity={rarity} skinName={skinName} />
            </span>
          ) : (
            front
          )}
        </span>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RotateCwIcon aria-hidden className="size-3.5" />
        {isBack ? "Toque para ver a frente" : "Toque na carta para virar"}
      </p>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number | null }) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-display text-2xl leading-none font-bold tabular-nums">{value ?? "–"}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value ?? 0)}%` }} />
      </div>
    </li>
  );
}

/** Vitrine (Loja): só o nome da skin e a raridade; a foto e as estatísticas aparecem quando a carta veste o jogador de verdade. */
function ShowcaseDetails({ player }: { player: Player }) {
  const rarity = getSkinRarity(player.cardSkin);
  const skinName = player.cardSkin && isCardSkinKey(player.cardSkin) ? getCardSkin(player.cardSkin).name : "Carta padrão";
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <DialogTitle className="font-display text-3xl leading-none font-extrabold uppercase">{skinName}</DialogTitle>
      {rarity && <RarityLabel rarity={rarity} />}
      <DialogDescription className="max-w-72 text-sm text-muted-foreground">
        Pré-visualização do visual. Quando você usar, ela ganha a sua foto, o seu nome e as suas estatísticas.
      </DialogDescription>
    </div>
  );
}

/** Detalhes da carta embaixo da carta grande: OVR, patente, as 3 estatísticas e a skin com a raridade. */
function ViewerDetails({ player }: { player: Player }) {
  const stats = getCardStats(player);
  const rank = getCardRank(player.ovr);
  const rarity = getSkinRarity(player.cardSkin);
  const skinName = player.cardSkin && isCardSkinKey(player.cardSkin) ? getCardSkin(player.cardSkin).name : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <DialogTitle className="truncate font-display text-4xl leading-none font-extrabold">{player.nickname}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {POSITION_LABELS[player.position]} · {CARD_RANK_LABELS[rank]}
          </DialogDescription>
        </div>
        <div className="flex flex-col items-end leading-none">
          <span className="font-display text-6xl font-extrabold tabular-nums">{player.ovr ?? "–"}</span>
          <span className="text-xs tracking-wide text-muted-foreground uppercase">OVR</span>
        </div>
      </div>

      <section aria-label="Estatísticas da carta" className="flex flex-col gap-3 rounded-xl border bg-background/50 p-4">
        <h3 className="font-display text-sm font-bold tracking-wide text-muted-foreground uppercase">Estatísticas</h3>
        <ul className="flex flex-col gap-3">
          {stats.map((stat) => (
            <StatBar key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </ul>
      </section>

      <section aria-label="Skin da carta" className="flex flex-col items-center gap-2 rounded-xl border bg-background/50 p-4 text-center">
        {rarity && skinName ? (
          <>
            <p className="font-display text-2xl leading-none font-bold uppercase">{skinName}</p>
            <RarityLabel rarity={rarity} />
          </>
        ) : (
          <>
            <p className="font-display text-2xl leading-none font-bold uppercase">{skinName ?? "Carta padrão"}</p>
            <p className="text-xs text-muted-foreground">
              {skinName ? "Personalização da Loja" : "A cor da moldura muda com o seu OVR."}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

/**
 * Toque na carta abre o visualizador (decisão do dono do app em 2026-11-09, no lugar do botão de virar): a carta grande, que vira para
 * o verso da raridade ao toque, e os detalhes dela (OVR, patente, estatísticas e skin). Só envolve a carta; o tamanho vem de quem usa.
 */
export function CardViewer({ player, children, className, showcase = false }: { player: Player; children: ReactNode; className?: string; /** Carta de vitrine (jogador de exemplo): mostra só o design, sem foto nem estatísticas. */ showcase?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Ver a carta de ${player.nickname} em detalhes`}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn("cursor-zoom-in transition-transform duration-150 active:scale-[0.985]", className)}
      >
        {children}
      </div>
      {isOpen && (
        <Dialog open onOpenChange={setIsOpen}>
          <DialogContent className="max-h-[94dvh] gap-5 overflow-y-auto overscroll-contain bg-[#0a110d] p-5 sm:max-w-md">
            <div className="mx-auto w-[min(62vw,248px)] pt-2 pb-5">
              <ViewerCard player={player} showcase={showcase} />
            </div>
            {showcase ? <ShowcaseDetails player={player} /> : <ViewerDetails player={player} />}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
