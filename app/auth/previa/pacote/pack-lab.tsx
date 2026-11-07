"use client";

import type { CSSProperties } from "react";
import { BrandMark } from "@/components/brand-logo";
import { PlayerCard } from "@/components/player-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import type { CardSkinKey } from "@/types/card-skin";

type Rarity = {
  label: string;
  /** Cor da luz, do selo e dos raios. */
  rgb: string;
  skin: CardSkinKey;
  skinName: string;
  odds: string;
  /** Fator de tempo: lendária demora mais (câmera lenta). */
  k: number;
  rays: number;
  sparks: number;
  shake: number;
  note?: string;
};

const RARITIES: Record<string, Rarity> = {
  comum: { label: "COMUM", rgb: "150,166,182", skin: "esmeralda", skinName: "Esmeralda", odds: "45%", k: 0.8, rays: 0, sparks: 6, shake: 0, note: "Repetida · +10 CC" },
  rara: { label: "RARA", rgb: "70,140,255", skin: "safira", skinName: "Safira", odds: "33%", k: 1, rays: 0.5, sparks: 16, shake: 0 },
  epica: { label: "ÉPICA", rgb: "178,102,255", skin: "relampago", skinName: "Relâmpago", odds: "17%", k: 1.15, rays: 0.85, sparks: 30, shake: 0.6 },
  lendaria: { label: "LENDÁRIA", rgb: "255,200,61", skin: "destino", skinName: "Destino", odds: "5%", k: 1.45, rays: 1, sparks: 54, shake: 1, note: "Proteção de azar: essa carta não saía há 6 rodadas" },
};

/** Pseudo-aleatório determinístico (o vídeo sai igual toda vez). */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const ms = (value: number): string => `calc(var(--k) * ${value}ms)`;
const at = (delay: number, duration: number, extra = ""): CSSProperties => ({
  animationDelay: ms(delay),
  animationDuration: ms(duration),
  animationFillMode: "both",
  ...(extra ? { animationTimingFunction: extra } : {}),
});

const CRIMP =
  "polygon(0% 10px,5% 0,10% 10px,15% 0,20% 10px,25% 0,30% 10px,35% 0,40% 10px,45% 0,50% 10px,55% 0,60% 10px,65% 0,70% 10px,75% 0,80% 10px,85% 0,90% 10px,95% 0,100% 10px,100% calc(100% - 10px),95% 100%,90% calc(100% - 10px),85% 100%,80% calc(100% - 10px),75% 100%,70% calc(100% - 10px),65% 100%,60% calc(100% - 10px),55% 100%,50% calc(100% - 10px),45% 100%,40% calc(100% - 10px),35% 100%,30% calc(100% - 10px),25% 100%,20% calc(100% - 10px),15% 100%,10% calc(100% - 10px),5% 100%,0% calc(100% - 10px))";

export function PackLab({ rarity }: { rarity: string }) {
  const cfg = RARITIES[rarity] ?? RARITIES.lendaria;
  const color = `rgb(${cfg.rgb})`;
  const vars = { "--k": cfg.k, "--c": cfg.rgb, zoom: 2 } as CSSProperties;
  const mystery = { ...SAMPLE_PLAYER, photo: null, nickname: "?", fullName: "?", cardSkin: cfg.skin };

  return (
    <main style={vars} className="pack-lab relative mx-auto h-[844px] w-[390px] overflow-hidden bg-[#070d0a] text-white">
      <style>{`
        .pack-lab * { box-sizing: border-box; }
        @keyframes pl-float { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-10px) rotate(1.5deg); } }
        @keyframes pl-charge { 0%{transform:translate(0,0) rotate(0)} 10%{transform:translate(-3px,1px) rotate(-1.5deg)} 20%{transform:translate(3px,-1px) rotate(1.5deg)} 30%{transform:translate(-5px,2px) rotate(-3deg)} 40%{transform:translate(5px,-2px) rotate(3deg)} 50%{transform:translate(-7px,2px) rotate(-4deg)} 60%{transform:translate(7px,-2px) rotate(4deg)} 70%{transform:translate(-9px,3px) rotate(-5deg)} 80%{transform:translate(9px,-3px) rotate(5deg)} 90%{transform:translate(-6px,1px) rotate(-3deg)} 100%{transform:translate(0,0) rotate(0)} }
        @keyframes pl-seam { 0%{opacity:0;transform:scaleX(.1)} 100%{opacity:1;transform:scaleX(1.5)} }
        @keyframes pl-flash { 0%{opacity:0} 35%{opacity:.95} 100%{opacity:0} }
        @keyframes pl-cap { 0%{transform:translate(0,0) rotate(0);opacity:1} 100%{transform:translate(110px,-520px) rotate(42deg);opacity:0} }
        @keyframes pl-body { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(240px) scale(.8);opacity:0} }
        @keyframes pl-rise { 0%{opacity:0;transform:translateY(160px) scale(.55)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pl-pulse { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes pl-back-out { 0%{transform:rotateY(0)} 100%{transform:rotateY(90deg)} }
        @keyframes pl-front-in { 0%{transform:rotateY(-90deg) scale(.9)} 70%{transform:rotateY(8deg) scale(1.06)} 100%{transform:rotateY(0) scale(1)} }
        @keyframes pl-hover { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes pl-rays-in { 0%{opacity:0;transform:scale(.4) rotate(0)} 100%{opacity:1;transform:scale(1) rotate(60deg)} }
        @keyframes pl-spin { to { transform: rotate(360deg); } }
        @keyframes pl-spark { 0%{opacity:0;transform:translate(0,0) scale(1)} 12%{opacity:1} 100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.2)} }
        @keyframes pl-slam { 0%{opacity:0;transform:scale(2.6)} 55%{opacity:1;transform:scale(.94)} 100%{opacity:1;transform:scale(1)} }
        @keyframes pl-up { 0%{opacity:0;transform:translateY(14px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes pl-shake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-5px,3px)} 40%{transform:translate(5px,-3px)} 60%{transform:translate(-3px,-2px)} 80%{transform:translate(3px,2px)} }
        @keyframes pl-vignette { 0%{opacity:0} 100%{opacity:1} }
        @keyframes pl-sweep { 0%{transform:translateX(-160%) skewX(-18deg)} 100%{transform:translateX(420%) skewX(-18deg)} }
      `}</style>

      {/* Fundo: preto esverdeado e, depois do estouro, a cor da raridade. */}
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(120% 70% at 50% 40%, #12201a 0%, #070d0a 70%)" }} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(90% 55% at 50% 42%, rgba(${cfg.rgb},.34), transparent 70%)`, animation: "pl-vignette 1s ease-out both", animationDelay: ms(1900) }}
      />

      {/* Abalo de tela nas raridades altas. */}
      <div className="absolute inset-0" style={cfg.shake ? { animation: `pl-shake ${0.45 * cfg.shake + 0.15}s linear 3 both`, animationDelay: ms(1950) } : undefined}>
        {/* Raios girando atrás da carta. */}
        {cfg.rays > 0 && (
          <div className="absolute top-[42%] left-1/2 -ml-[300px] -mt-[300px] h-[600px] w-[600px]" style={{ opacity: cfg.rays, animation: "pl-rays-in 1.2s ease-out both", animationDelay: ms(3300) }}>
            <div
              className="size-full rounded-full"
              style={{
                background: `repeating-conic-gradient(from 0deg, rgba(${cfg.rgb},.5) 0deg 5deg, transparent 5deg 18deg)`,
                WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 68%)",
                maskImage: "radial-gradient(circle, #000 0%, transparent 68%)",
                animation: "pl-spin 26s linear infinite",
              }}
            />
          </div>
        )}

        {/* O pacote. */}
        <div className="absolute top-[42%] left-1/2 -ml-[120px] -mt-[180px] h-[360px] w-[240px]" style={{ animation: "pl-float 3.2s ease-in-out infinite" }}>
          <div className="relative size-full" style={{ animation: "pl-charge 0.9s linear both", animationDelay: ms(600) }}>
            <div className="absolute inset-x-0 top-0 h-[46px]" style={{ clipPath: CRIMP, background: "linear-gradient(180deg,#5d7a69,#2c4237)", animation: "pl-cap 0.8s ease-in both", animationDelay: ms(1950) }} />
            <div className="absolute inset-x-0 top-[44px] bottom-0 overflow-hidden" style={{ clipPath: CRIMP, background: "linear-gradient(160deg,#4f6d5b 0%,#2a4034 38%,#16261d 70%,#3a5545 100%)", animation: "pl-body 0.7s ease-in both", animationDelay: ms(2000) }}>
              <div className="absolute inset-2 rounded-md border-2 border-[#b6f23c]/70" /><div className="absolute inset-4 rounded border border-white/15" />
              <div className="absolute inset-y-0 left-0 w-[28%]" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent)", animation: "pl-sweep 2.6s ease-in-out infinite" }} />
              <div className="relative flex h-full flex-col items-center justify-center gap-3 font-display">
                <BrandMark className="h-20 w-auto" />
                <span className="text-[19px] leading-none font-extrabold tracking-[0.3em]">CANCHA CLUB</span>
                <span className="text-[50px] leading-none font-extrabold">RODADA 5</span>
                <span className="font-sans text-[11px] tracking-wide text-white/70 uppercase">1 skin exclusiva</span>
              </div>
            </div>
          </div>
        </div>

        {/* Luz da fresta, na cor da raridade (a dica antes da carta). */}
        <div aria-hidden className="absolute top-[calc(42%-180px+44px)] left-1/2 -ml-[120px] h-[6px] w-[240px] rounded-full" style={{ background: `rgb(${cfg.rgb})`, boxShadow: `0 0 34px 12px rgba(${cfg.rgb},.85)`, animation: "pl-seam 0.5s ease-out both, pl-fade-out .4s ease-in both", animationDelay: `${ms(1500)}, ${ms(2250)}` }} />
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 42%, #fff 0%, rgba(${cfg.rgb},.9) 28%, transparent 62%)`, animation: "pl-flash 0.9s ease-out both", animationDelay: ms(1900) }} />

        {/* A carta: costas (misteriosa) e frente (a skin, sem rosto). */}
        <div className="absolute top-[42%] left-1/2 -ml-[130px] -mt-[182px] h-[364px] w-[260px]" style={{ perspective: "900px", animation: "pl-rise 0.9s cubic-bezier(.2,.8,.2,1) both", animationDelay: ms(2000) }}>
          <div className="size-full" style={{ animation: "pl-hover 3.4s ease-in-out infinite", animationDelay: ms(4300) }}>
            <div className="relative size-full" style={{ transformStyle: "preserve-3d" }}>
              <div className="absolute inset-0 rounded-[9%/6.5%] border-2" style={{ borderColor: color, background: "linear-gradient(160deg,#16231c,#080e0b)", boxShadow: `0 0 40px rgba(${cfg.rgb},.55)`, backfaceVisibility: "hidden", animation: "pl-back-out 0.4s ease-in both", animationDelay: ms(3400) }}>
                <div className="absolute inset-3 rounded-[8%/6%] border" style={{ borderColor: `rgba(${cfg.rgb},.5)`, animation: "pl-pulse 0.9s ease-in-out infinite" }} />
                <div className="flex size-full items-center justify-center font-display text-[130px] leading-none font-extrabold" style={{ color, textShadow: `0 0 28px rgba(${cfg.rgb},.8)` }}>?</div>
              </div>
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", animation: "pl-front-in 0.7s cubic-bezier(.2,.9,.2,1) both", animationDelay: "calc(var(--k) * 3400ms + 380ms)" }}>
                <PlayerCard player={mystery} size="fill" className="w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Faíscas na cor da raridade. */}
        <div aria-hidden className="absolute top-[42%] left-1/2 size-0">
          {Array.from({ length: cfg.sparks }, (_, index) => {
            const angle = rand(index + 3) * Math.PI * 2;
            const dist = 110 + rand(index + 91) * 190;
            const size = 3 + rand(index + 17) * 5;
            return (
              <span
                key={index}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: index % 3 === 0 ? "#fff" : color,
                  boxShadow: `0 0 10px 2px rgba(${cfg.rgb},.9)`,
                  ["--dx" as string]: `${Math.cos(angle) * dist}px`,
                  ["--dy" as string]: `${Math.sin(angle) * dist * 1.15}px`,
                  animation: `pl-spark ${0.9 + rand(index + 5) * 0.9}s ease-out both`,
                  animationDelay: ms(3750 + rand(index + 40) * 260),
                }}
              />
            );
          })}
        </div>

        {/* Selo de raridade e informações. */}
        <div className="absolute inset-x-0 top-[calc(42%+200px)] flex flex-col items-center gap-2 px-6 text-center">
          <div className="relative overflow-hidden rounded-md px-5 py-1.5 font-display text-[40px] leading-none font-extrabold tracking-[0.18em]" style={{ color, textShadow: `0 0 24px rgba(${cfg.rgb},.8)`, animation: "pl-slam 0.45s cubic-bezier(.2,.9,.2,1) both", animationDelay: ms(4000) }}>
            {cfg.label}
            {cfg.rays >= 0.85 && <span aria-hidden className="absolute inset-y-0 left-0 w-[30%]" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)", animation: "pl-sweep 1.4s ease-in-out 2", animationDelay: ms(4500) }} />}
          </div>
          <div className="font-display text-[26px] leading-none font-bold" style={{ animation: "pl-up 0.5s ease-out both", animationDelay: ms(4500) }}>{cfg.skinName}</div>
          <div className="text-[12px] text-white/70" style={{ animation: "pl-up 0.5s ease-out both", animationDelay: ms(4750) }}>
            Chance neste pacote: <strong className="text-white">{cfg.odds}</strong>
          </div>
          {cfg.note && (
            <div className="max-w-[300px] rounded-lg border px-3 py-1.5 text-[12px] font-medium" style={{ borderColor: `rgba(${cfg.rgb},.5)`, background: `rgba(${cfg.rgb},.12)`, color: rarity === "comum" ? "#cdd6de" : color, animation: "pl-up 0.5s ease-out both", animationDelay: ms(5100) }}>
              {cfg.note}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pl-fade-out { to { opacity: 0; } }`}</style>
    </main>
  );
}
