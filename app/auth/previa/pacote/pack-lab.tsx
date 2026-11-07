"use client";

import type { CSSProperties } from "react";
import { BrandMark } from "@/components/brand-logo";
import { CanchaCard } from "@/components/cancha-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import type { CardSkinKey } from "@/types/card-skin";

type Rarity = {
  label: string;
  /** Cor da luz (temperatura), do selo e do confete. */
  rgb: string;
  skin: CardSkinKey;
  skinName: string;
  odds: string;
  /** Fator de tempo: a lendária demora mais (câmera lenta). */
  k: number;
  /** Intensidade da luz e quantidade de névoa, bokeh e confete. */
  power: number;
  shards: number;
  bokeh: number;
  shake: number;
  note?: string;
};

const RARITIES: Record<string, Rarity> = {
  comum: { label: "Comum", rgb: "170,184,198", skin: "esmeralda", skinName: "Esmeralda", odds: "45%", k: 0.8, power: 0.35, shards: 8, bokeh: 3, shake: 0, note: "Repetida · +10 CC" },
  rara: { label: "Rara", rgb: "86,150,255", skin: "safira", skinName: "Safira", odds: "33%", k: 1, power: 0.6, shards: 22, bokeh: 8, shake: 0 },
  epica: { label: "Épica", rgb: "184,112,255", skin: "relampago", skinName: "Relâmpago", odds: "17%", k: 1.15, power: 0.85, shards: 40, bokeh: 12, shake: 0.5 },
  lendaria: { label: "Lendária", rgb: "255,196,84", skin: "destino", skinName: "Destino", odds: "5%", k: 1.45, power: 1, shards: 68, bokeh: 16, shake: 1, note: "Proteção de azar: essa carta não saía há 6 rodadas" },
};

/** Pseudo-aleatório determinístico (o vídeo sai igual toda vez). */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const ms = (value: number): string => `calc(var(--k) * ${value}ms)`;

const CRIMP =
  "polygon(0% 9px,4% 2px,8% 9px,12% 2px,16% 9px,20% 2px,24% 9px,28% 2px,32% 9px,36% 2px,40% 9px,44% 2px,48% 9px,52% 2px,56% 9px,60% 2px,64% 9px,68% 2px,72% 9px,76% 2px,80% 9px,84% 2px,88% 9px,92% 2px,96% 9px,100% 2px,100% calc(100% - 2px),96% calc(100% - 9px),92% calc(100% - 2px),88% calc(100% - 9px),84% calc(100% - 2px),80% calc(100% - 9px),76% calc(100% - 2px),72% calc(100% - 9px),68% calc(100% - 2px),64% calc(100% - 9px),60% calc(100% - 2px),56% calc(100% - 9px),52% calc(100% - 2px),48% calc(100% - 9px),44% calc(100% - 2px),40% calc(100% - 9px),36% calc(100% - 2px),32% calc(100% - 9px),28% calc(100% - 2px),24% calc(100% - 9px),20% calc(100% - 2px),16% calc(100% - 9px),12% calc(100% - 2px),8% calc(100% - 9px),4% calc(100% - 2px),0% calc(100% - 9px))";

export function PackLab({ rarity }: { rarity: string }) {
  const cfg = RARITIES[rarity] ?? RARITIES.lendaria;
  const color = `rgb(${cfg.rgb})`;
  const vars = { "--k": cfg.k, zoom: 2 } as CSSProperties;
  const mystery = { ...SAMPLE_PLAYER, photo: null, nickname: "", fullName: "", cardSkin: cfg.skin };

  return (
    <main style={vars} className="pack-lab relative mx-auto h-[844px] w-[390px] overflow-hidden bg-[#050907] text-white">
      <style>{`
        .pack-lab * { box-sizing: border-box; }
        @keyframes pl-float { 0%,100% { transform: translateY(0) rotateZ(-1deg); } 50% { transform: translateY(-9px) rotateZ(1deg); } }
        @keyframes pl-charge { 0%{transform:translate(0,0) rotate(0)} 12%{transform:translate(-2px,1px) rotate(-1deg)} 24%{transform:translate(2px,-1px) rotate(1deg)} 36%{transform:translate(-4px,1px) rotate(-2deg)} 48%{transform:translate(4px,-1px) rotate(2deg)} 60%{transform:translate(-6px,2px) rotate(-3deg)} 72%{transform:translate(6px,-2px) rotate(3deg)} 84%{transform:translate(-4px,1px) rotate(-2deg)} 100%{transform:translate(0,0) rotate(0)} }
        @keyframes pl-seam-grow { 0%{opacity:0;transform:scale(.2,.4)} 100%{opacity:1;transform:scale(1,1)} }
        @keyframes pl-bloom { 0%{opacity:0;transform:scale(.4)} 30%{opacity:1} 100%{opacity:0;transform:scale(2.4)} }
        @keyframes pl-expose { 0%{opacity:0} 28%{opacity:.9} 100%{opacity:0} }
        @keyframes pl-cap { 0%{transform:translate(0,0) rotate(0);opacity:1} 100%{transform:translate(120px,-540px) rotate(40deg);opacity:0} }
        @keyframes pl-body { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(260px) scale(.82);opacity:0} }
        @keyframes pl-rise { 0%{opacity:0;transform:translateY(170px) scale(.6)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pl-back-out { 0%{transform:rotateY(0)} 100%{transform:rotateY(90deg)} }
        @keyframes pl-front-in { 0%{transform:rotateY(-90deg) scale(.92)} 70%{transform:rotateY(6deg) scale(1.04)} 100%{transform:rotateY(0) scale(1)} }
        @keyframes pl-hover { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pl-fade { 0%{opacity:0} 100%{opacity:1} }
        @keyframes pl-out { to { opacity: 0; } }
        @keyframes pl-up { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes pl-track { 0%{opacity:0;letter-spacing:.7em} 100%{opacity:1;letter-spacing:.34em} }
        @keyframes pl-shard { 0%{opacity:0;transform:translate3d(0,0,0) rotateX(0) rotateY(0)} 10%{opacity:1} 38%{transform:translate3d(var(--dx),var(--up),0) rotateX(220deg) rotateY(160deg)} 100%{opacity:0;transform:translate3d(calc(var(--dx) * 1.3),var(--down),0) rotateX(760deg) rotateY(520deg)} }
        @keyframes pl-bokeh { 0%{opacity:0;transform:translateY(40px) scale(.7)} 25%{opacity:var(--o)} 100%{opacity:0;transform:translateY(-220px) scale(1.15)} }
        @keyframes pl-mist { 0%{transform:translate3d(-30px,10px,0) scale(1)} 100%{transform:translate3d(30px,-20px,0) scale(1.15)} }
        @keyframes pl-shake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-3px,2px)} 50%{transform:translate(3px,-2px)} 75%{transform:translate(-2px,-1px)} }
        @keyframes pl-sweep { 0%{transform:translateX(-160%) skewX(-18deg)} 100%{transform:translateX(420%) skewX(-18deg)} }
      `}</style>

      {/* Folha metálica amassada: ruído + iluminação (textura estática, só no pacote). */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="foil" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.019" numOctaves="4" seed="11" result="n" />
          <feDiffuseLighting in="n" surfaceScale="9" diffuseConstant="1.15" lightingColor="#dfeee5">
            <feDistantLight azimuth="232" elevation="48" />
          </feDiffuseLighting>
        </filter>
      </svg>

      {/* Estúdio: fundo escuro com um chão levemente refletivo. */}
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(130% 80% at 50% 38%, #101c16 0%, #060b08 62%, #030504 100%)" }} />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[34%]" style={{ background: "linear-gradient(180deg, transparent, rgba(255,255,255,.035))" }} />

      {/* Luz ambiente na cor da raridade, que cresce depois do estouro. */}
      <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(75% 48% at 50% 44%, rgba(${cfg.rgb},${0.38 * cfg.power}), transparent 72%)`, animation: "pl-fade 1.4s ease-out both", animationDelay: ms(1950) }} />

      {/* Névoa: massas largas e desfocadas passando devagar. */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: 420,
            height: 220,
            left: -60 + i * 90,
            top: 150 + i * 190,
            background: `radial-gradient(closest-side, rgba(${cfg.rgb},${0.16 * cfg.power + 0.04}), transparent)`,
            filter: "blur(28px)",
            animation: `pl-fade 1.6s ease-out both, pl-mist ${12 + i * 3}s ease-in-out infinite alternate`,
            animationDelay: `${ms(2000 + i * 200)}, 0s`,
          }}
        />
      ))}

      <div className="absolute inset-0" style={cfg.shake ? { animation: `pl-shake 0.12s linear ${Math.round(6 * cfg.shake)} both`, animationDelay: ms(1950) } : undefined}>
        {/* Halo atrás da carta (luz suave, sem raios). */}
        <div aria-hidden className="absolute top-[42%] left-1/2 -ml-[250px] -mt-[250px] size-[500px] rounded-full" style={{ background: `radial-gradient(closest-side, rgba(${cfg.rgb},${0.5 * cfg.power}), rgba(${cfg.rgb},${0.12 * cfg.power}) 55%, transparent)`, animation: "pl-fade 1.2s ease-out both", animationDelay: ms(3400) }} />

        {/* Sombra de contato no chão. */}
        <div aria-hidden className="absolute top-[calc(42%+190px)] left-1/2 -ml-[110px] h-[26px] w-[220px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(0,0,0,.65), transparent)", filter: "blur(6px)", animation: "pl-out .4s ease-in both", animationDelay: ms(2000) }} />

        {/* O pacote. */}
        <div className="absolute top-[42%] left-1/2 -ml-[120px] -mt-[180px] h-[360px] w-[240px]" style={{ perspective: "800px" }}>
          <div className="size-full" style={{ animation: "pl-float 3.4s ease-in-out infinite", transform: "rotateY(-8deg)", transformStyle: "preserve-3d" }}>
            <div className="relative size-full" style={{ animation: "pl-charge 0.9s linear both", animationDelay: ms(600) }}>
              {/* Tampa (serrilha de cima). */}
              <div className="absolute inset-x-0 top-0 h-[46px] overflow-hidden" style={{ clipPath: CRIMP, background: "linear-gradient(180deg,#8fa89a 0%,#4d6659 55%,#2d4338 100%)", animation: "pl-cap 0.85s ease-in both", animationDelay: ms(1950) }}>
                <div className="absolute inset-0 opacity-70 mix-blend-overlay" style={{ filter: "url(#foil)" }} />
              </div>
              {/* Corpo. */}
              <div className="absolute inset-x-0 top-[44px] bottom-0 overflow-hidden" style={{ clipPath: CRIMP, background: "linear-gradient(158deg,#6d8a7a 0%,#3a5446 34%,#18281f 66%,#4b6757 100%)", animation: "pl-body 0.75s ease-in both", animationDelay: ms(2000) }}>
                <div className="absolute inset-0 opacity-80 mix-blend-overlay" style={{ filter: "url(#foil)" }} />
                <div className="absolute inset-y-0 left-0 w-[24%]" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.34),transparent)", animation: "pl-sweep 3s ease-in-out infinite" }} />
                <div className="absolute inset-[7px] rounded-[3px] border border-white/25" />
                <div className="relative flex h-full flex-col items-center justify-center gap-3 font-display">
                  <BrandMark className="h-[74px] w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,.55)]" />
                  <span className="text-[17px] leading-none font-extrabold tracking-[0.32em] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.7)]">CANCHA CLUB</span>
                  <span className="text-[46px] leading-none font-extrabold text-white drop-shadow-[0_2px_5px_rgba(0,0,0,.7)]">RODADA 5</span>
                  <span className="font-sans text-[10px] tracking-[0.22em] text-white/80 uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">1 skin exclusiva</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Luz que vaza da fresta: mancha suave que cresce, na cor da raridade (a dica antes da carta). */}
        <div aria-hidden className="absolute top-[calc(42%-180px+30px)] left-1/2 -ml-[170px] h-[70px] w-[340px]" style={{ animation: "pl-seam-grow 0.6s ease-out both, pl-out .35s ease-in both", animationDelay: `${ms(1450)}, ${ms(2300)}` }}>
          <div className="size-full rounded-full" style={{ background: `radial-gradient(closest-side, #fff 0%, rgba(${cfg.rgb},.95) 38%, transparent 100%)`, filter: "blur(7px)" }} />
        </div>
        {/* Estouro: floração larga da cor da raridade e uma sobre-exposição curta. */}
        <div aria-hidden className="absolute top-[42%] left-1/2 -ml-[210px] -mt-[210px] size-[420px] rounded-full" style={{ background: `radial-gradient(closest-side, #fff 0%, rgba(${cfg.rgb},.85) 35%, transparent 100%)`, animation: "pl-bloom 1.1s ease-out both", animationDelay: ms(1950) }} />
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,.95), rgba(${cfg.rgb},.55) 45%, rgba(${cfg.rgb},0) 85%)`, animation: "pl-expose 0.9s ease-out both", animationDelay: ms(1980) }} />

        {/* A carta: costas e frente (design puro). */}
        <div className="absolute top-[42%] left-1/2 -ml-[130px] -mt-[182px] h-[364px] w-[260px]" style={{ perspective: "1000px", animation: "pl-rise 0.95s cubic-bezier(.16,.84,.24,1) both", animationDelay: ms(2000) }}>
          <div className="size-full" style={{ animation: "pl-hover 3.6s ease-in-out infinite", animationDelay: ms(4400) }}>
            <div className="relative size-full" style={{ transformStyle: "preserve-3d" }}>
              {/* Costas: carta lisa com a marca em relevo. */}
              <div className="absolute inset-0 rounded-[9%/6.5%]" style={{ background: "linear-gradient(155deg,#2a3b32 0%,#121c17 46%,#1c2b23 100%)", boxShadow: `0 0 0 1.5px rgba(${cfg.rgb},.7), 0 0 38px rgba(${cfg.rgb},${0.5 * cfg.power}), inset 0 0 40px rgba(0,0,0,.6)`, backfaceVisibility: "hidden", animation: "pl-back-out 0.4s ease-in both", animationDelay: ms(3400) }}>
                <div className="absolute inset-[7px] rounded-[8%/6%] border border-white/12" />
                <div className="absolute inset-0 opacity-45 mix-blend-overlay rounded-[9%/6.5%]" style={{ filter: "url(#foil)" }} />
                <div className="flex size-full items-center justify-center">
                  <BrandMark className="h-[150px] w-auto opacity-90" />
                </div>
              </div>
              <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", animation: "pl-front-in 0.7s cubic-bezier(.2,.9,.2,1) both", animationDelay: "calc(var(--k) * 3400ms + 380ms)" }}>
                <CanchaCard player={mystery} pure photoSizes="260px" className="w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Bokeh: círculos de luz desfocados subindo devagar (profundidade de campo). */}
        <div aria-hidden className="absolute inset-0">
          {Array.from({ length: cfg.bokeh }, (_, index) => {
            const size = 16 + rand(index + 61) * 46;
            return (
              <span
                key={index}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  left: `${rand(index + 7) * 100}%`,
                  top: `${40 + rand(index + 23) * 55}%`,
                  background: `radial-gradient(closest-side, rgba(${cfg.rgb},.75), rgba(${cfg.rgb},.18) 60%, transparent)`,
                  filter: `blur(${2 + rand(index + 9) * 5}px)`,
                  ["--o" as string]: `${0.25 + rand(index + 44) * 0.45}`,
                  animation: `pl-bokeh ${5 + rand(index + 13) * 5}s ease-in-out infinite backwards`,
                  animationDelay: ms(3300 + rand(index + 31) * 3200),
                }}
              />
            );
          })}
        </div>

        {/* Confete de folha: lascas metálicas girando e caindo (com peso, sem faísca de desenho). */}
        <div aria-hidden className="absolute top-[42%] left-1/2 size-0" style={{ perspective: "700px" }}>
          {Array.from({ length: cfg.shards }, (_, index) => {
            const angle = rand(index + 3) * Math.PI * 2;
            const reach = 70 + rand(index + 91) * 200;
            const w = 4 + rand(index + 17) * 9;
            return (
              <span
                key={index}
                className="absolute"
                style={{
                  width: w,
                  height: w * (0.5 + rand(index + 29) * 0.8),
                  background: index % 4 === 0 ? "linear-gradient(135deg,#fff,#cfd6dd)" : `linear-gradient(135deg, rgba(${cfg.rgb},1), rgba(${cfg.rgb},.55))`,
                  boxShadow: `0 0 6px rgba(${cfg.rgb},.6)`,
                  ["--dx" as string]: `${Math.cos(angle) * reach}px`,
                  ["--up" as string]: `${-40 - rand(index + 77) * 180 + Math.sin(angle) * reach * 0.4}px`,
                  ["--down" as string]: `${220 + rand(index + 53) * 360}px`,
                  animation: `pl-shard ${2.6 + rand(index + 5) * 1.8}s cubic-bezier(.2,.7,.4,1) both`,
                  animationDelay: ms(3750 + rand(index + 40) * 380),
                }}
              />
            );
          })}
        </div>

        {/* Raridade e informações: tipografia fina e sóbria. */}
        <div className="absolute inset-x-0 top-[calc(42%+205px)] flex flex-col items-center gap-2.5 px-6 text-center">
          <div className="flex items-center gap-3" style={{ animation: "pl-up .6s ease-out both", animationDelay: ms(4100) }}>
            <span className="h-px w-9" style={{ background: `linear-gradient(90deg, transparent, ${color})` }} />
            <span className="font-display text-[22px] leading-none font-semibold uppercase" style={{ color, textShadow: `0 0 18px rgba(${cfg.rgb},.7)`, animation: "pl-track 1.1s cubic-bezier(.2,.8,.2,1) both", animationDelay: ms(4100) }}>{cfg.label}</span>
            <span className="h-px w-9" style={{ background: `linear-gradient(270deg, transparent, ${color})` }} />
          </div>
          <div className="font-display text-[30px] leading-none font-bold tracking-wide" style={{ animation: "pl-up 0.6s ease-out both", animationDelay: ms(4500) }}>{cfg.skinName}</div>
          <div className="text-[12px] text-white/65" style={{ animation: "pl-up 0.6s ease-out both", animationDelay: ms(4750) }}>
            Chance neste pacote: <strong className="font-semibold text-white">{cfg.odds}</strong>
          </div>
          {cfg.note && (
            <div className="max-w-[300px] rounded-md border px-3 py-1.5 text-[12px]" style={{ borderColor: `rgba(${cfg.rgb},.45)`, background: `rgba(${cfg.rgb},.1)`, color: rarity === "comum" ? "#cdd6de" : color, animation: "pl-up 0.6s ease-out both", animationDelay: ms(5100) }}>
              {cfg.note}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
