"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { getStatsFromAttributes } from "@/lib/card-stats";
import type { RoundFusion } from "@/lib/progression";
import { GOALKEEPER_ATTRIBUTES, OUTFIELD_ATTRIBUTES, type Player, type PlayerAttribute } from "@/types/player";

type CardNumbers = { ovr: number | null; attributes: Partial<Record<PlayerAttribute, number>> };

/** A mesma carta do jogador (skin, foto, nome) com outros números. */
function withNumbers(card: Player, numbers: CardNumbers): Player {
  const keys: readonly PlayerAttribute[] = card.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const attributes = Object.fromEntries(keys.map((key) => [key, numbers.attributes[key] ?? null]));
  return { ...card, ovr: numbers.ovr, attributes } as Player;
}

/** Contador que sobe por CSS (sem JavaScript): `steps` = quantos números passa. */
function Count({ from, to, delay, duration, steps }: { from: number; to: number; delay: number; duration: number; steps: number }) {
  const style = {
    "--from": from,
    "--to": to,
    "--del": `${delay}s`,
    "--dur": `${duration}s`,
    "--ease": `steps(${Math.max(1, steps)}, end)`,
  } as CSSProperties;
  return <span className="fusion-count tabular-nums" style={style} />;
}

type RevealFusionProps = {
  card: Player;
  fusion: RoundFusion;
  round: number;
};

/**
 * Base de cada plataforma na tela do vídeo (% da largura e da altura), do `slots.json` do render
 * (`scripts/blender/fusao.py`; média entre o quadro 30 e o 150, a câmera quase não anda).
 */
const PAD_LEFT = [26.5, 60] as const;
const PAD_RIGHT = [73.5, 60] as const;
const PAD_MIDDLE = [50, 61.3] as const;
/** Se o vídeo demorar a começar, a cena anda sozinha depois disso (ms). */
const VIDEO_WAIT_MS = 1500;

/** Posição da carta em pé sobre a plataforma: centro em `x`, base em `y`. */
function onPad([x, y]: readonly [number, number], width: number): CSSProperties {
  return { left: `${x}%`, top: `${y}%`, width: `${width}%` };
}

/**
 * A animação do fim da rodada (aprovada pelo dono do app em 2026-11-10; palco em vídeo do Blender desde 2026-11-11):
 * duas plataformas acendem sob feixes de luz e recebem a sua carta de antes e a carta do desempenho da rodada; os
 * fios de energia das duas convergem para a plataforma do meio, há um clarão e a carta nova aparece dentro de um aro
 * de luz. O vídeo (`public/revelacao/fusao.*`, 5 s) é o mesmo para todos; as cartas e os números são desenhados ao
 * vivo por cima. Os gols aparecem só aqui, como bolinhas que sobem o Ataque da rodada. A cena espera o vídeo começar
 * (no máximo 1,5 s) para os tempos casarem; com movimento reduzido, fica a imagem final e o fim da cena, parado.
 */
export function RevealFusion({ card, fusion, round }: RevealFusionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWaiting, setIsWaiting] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const start = () => setIsWaiting(false);
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video?.pause();
      start();
      return;
    }
    const timer = setTimeout(start, VIDEO_WAIT_MS);
    video.addEventListener("playing", start, { once: true });
    video.play().catch(start);
    return () => {
      clearTimeout(timer);
      video.removeEventListener("playing", start);
    };
  }, []);

  const { before, after } = fusion;
  if (!before || before.ovr === null || after.ovr === null) return null;
  const role = card.role;
  const mine = withNumbers(card, before);
  const roundCard = withNumbers(card, fusion.round);
  const fused = withNumbers(card, after);
  const attackTo = getStatsFromAttributes(role, fusion.round.attributes)[0]?.value ?? null;
  const attackFrom = fusion.roundWithoutGoals ? (getStatsFromAttributes(role, fusion.roundWithoutGoals.attributes)[0]?.value ?? null) : null;
  const hasGoals = fusion.goals > 0 && attackFrom !== null && attackTo !== null && attackTo > attackFrom;
  const ovrFrom = Math.round(before.ovr);
  const ovrTo = Math.round(after.ovr);
  const delta = ovrTo - ovrFrom;
  const balls = Math.min(5, hasGoals ? attackTo - attackFrom : 0);

  return (
    <div className={`flex flex-col gap-2 ${isWaiting ? "fusion-wait" : ""}`}>
      <div className="fusion-stage relative mx-auto aspect-4/5 w-full max-w-sm overflow-hidden rounded-2xl">
        <video
          ref={videoRef}
          aria-hidden
          muted
          playsInline
          preload="auto"
          poster="/revelacao/fusao-poster.jpg"
          className="pointer-events-none absolute inset-0 size-full object-cover motion-reduce:hidden"
        >
          <source src="/revelacao/fusao.webm" type="video/webm" />
          <source src="/revelacao/fusao.mp4" type="video/mp4" />
        </video>
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-cover bg-center motion-reduce:block"
          style={{ backgroundImage: "url(/revelacao/fusao-poster.jpg)" }}
        />
        {/* As bordas do vídeo somem no fundo da tela. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-background to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[8%] bg-linear-to-b from-background to-transparent" />

        {/* Sua carta de antes (esquerda) e a carta da rodada (direita), em pé nas plataformas. */}
        <div className="absolute -translate-x-1/2 -translate-y-full" style={onPad(PAD_LEFT, 38)}>
          <div className="fusion-mine">
            <PlayerCard player={mine} size="fill" />
          </div>
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-full" style={onPad(PAD_RIGHT, 38)}>
          <div className="fusion-round">
            <PlayerCard player={roundCard} size="fill" />
          </div>
        </div>

        {hasGoals && (
          <>
            <div
              className="fusion-goal-tag absolute flex -translate-x-1/2 items-center justify-center gap-1 text-sm font-bold"
              style={{ left: `${PAD_RIGHT[0]}%`, top: "63%", width: "40%" }}
            >
              <span aria-hidden>⚽</span>
              {fusion.goals === 1 ? "1 gol" : `${fusion.goals} gols`}
            </div>
            <div
              className="fusion-goal-tag absolute flex -translate-x-1/2 items-baseline justify-center gap-1.5 font-display font-extrabold"
              style={{ left: `${PAD_RIGHT[0]}%`, top: "69%", width: "40%" }}
            >
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Ataque</span>
              <span className="text-2xl">
                <Count from={attackFrom} to={attackTo} delay={2.2} duration={0.8} steps={attackTo - attackFrom} />
              </span>
            </div>
            {Array.from({ length: balls }, (_, index) => (
              <span
                key={index}
                aria-hidden
                className="fusion-ball absolute text-lg"
                style={{ left: "72%", top: "60%", "--d": `${1.5 + index * 0.2}s`, "--dx": "-12cqw", "--dy": "-14cqw" } as CSSProperties}
              >
                ⚽
              </span>
            ))}
          </>
        )}

        {/* A carta nova, dentro do aro de luz da plataforma do meio. */}
        <div className="absolute -translate-x-1/2 -translate-y-full" style={onPad(PAD_MIDDLE, 46)}>
          <div className="fusion-fused">
            <PlayerCard player={fused} size="fill" />
          </div>
        </div>
        <div
          className="fusion-cap-2 absolute flex items-baseline justify-center gap-2 font-display font-extrabold"
          style={{ left: "10%", top: "66%", width: "80%" }}
        >
          <span className="text-xs tracking-wide text-muted-foreground uppercase">Sua média (OVR)</span>
          <span className="text-3xl">
            <Count from={ovrFrom} to={ovrTo} delay={4.9} duration={0.5} steps={Math.abs(delta)} />
          </span>
          {delta !== 0 && (
            <span className="fusion-delta flex items-center text-lg text-success">
              <ArrowUpIcon aria-hidden className={`size-4 ${delta < 0 ? "rotate-180 text-destructive" : ""}`} />
              {Math.abs(delta)}
            </span>
          )}
        </div>
        <div
          aria-hidden
          className="fusion-flash pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 50% 40%, #fff 0, rgba(220,255,170,.75) 22%, transparent 58%)" }}
        />
      </div>
      <p className="fusion-cap-1 text-center text-sm font-medium">
        Sua carta + o desempenho da <span className="text-primary">rodada {round}</span>
        {hasGoals ? ". Os gols somam no Ataque." : "."}
      </p>
    </div>
  );
}
