"use client";

import type { CSSProperties } from "react";
import { PackCover, PACK_CAP_PERCENT } from "@/components/pack-cover";
import { CardBack } from "@/components/card-back";
import { CanchaCard } from "@/components/cancha-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import { PACK_RARITY_NAMES, type PackRarity, type PackTier } from "@/lib/packs";
import { getCardSkin, isCardSkinKey } from "@/types/card-skin";

type RarityLook = {
  /** Cor da luz (temperatura), do selo e do confete. */
  rgb: string;
  /** Fator de tempo: a lendária demora mais (câmera lenta). */
  k: number;
  /** Intensidade da luz e quantidade de névoa, bokeh e confete. */
  power: number;
  shards: number;
  bokeh: number;
  shake: number;
};

/** Visual da abertura por raridade (aprovado pelo dono do app em 2026-11-07). */
const RARITY_LOOKS: Record<PackRarity, RarityLook> = {
  comum: { rgb: "170,184,198", k: 0.8, power: 0.35, shards: 8, bokeh: 3, shake: 0 },
  rara: { rgb: "86,150,255", k: 1, power: 0.6, shards: 22, bokeh: 8, shake: 0 },
  epica: { rgb: "184,112,255", k: 1.15, power: 0.85, shards: 40, bokeh: 12, shake: 0.5 },
  lendaria: { rgb: "255,196,84", k: 1.45, power: 1, shards: 68, bokeh: 16, shake: 1 },
};

/** Quanto dura a animação (ms, já com o fator da raridade) até a skin e os textos estarem na tela. */
export function getPackAnimationMs(rarity: PackRarity): number {
  return Math.round(5600 * RARITY_LOOKS[rarity].k);
}

/** Pseudo-aleatório determinístico (o vídeo sai igual toda vez). */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const ms = (value: number): string => `calc(var(--k) * ${value}ms)`;


/**
 * Verso da carta na abertura: o mesmo verso da raridade que a carta tem no app (`CardBack`, com a quadra e a moeda da logo), com os nomes
 * em branco (a skin ainda é segredo), a luz de borda respirando na cor da raridade e o reflexo que passa enquanto a carta gira.
 */
function PackCardBack({ rarity, rgb, power }: { rarity: PackRarity; rgb: string; power: number }) {
  return (
    <div
      className="absolute inset-0 rounded-[9%/6.5%]"
      style={{ boxShadow: `0 0 32px rgba(${rgb},${0.5 * power}), 0 22px 44px rgba(0,0,0,.55)`, backfaceVisibility: "hidden" }}
    >
      <CardBack rarity={rarity} skinName="" hideNames />
      <div className="absolute inset-0 overflow-hidden rounded-[9%/6.5%]">
        {/* Luz de borda respirando na cor da raridade (a expectativa antes de virar). */}
        <div aria-hidden className="absolute inset-0" style={{ boxShadow: `inset 0 0 26px rgba(${rgb},${0.55 * power})`, animation: "pl-breathe 1.1s ease-in-out infinite", borderRadius: "inherit" }} />
        {/* Reflexo passando enquanto a carta gira. */}
        <div aria-hidden className="absolute inset-y-0 left-0 w-[26%]" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)", animation: "pl-sheen-back 1s ease-in-out both", animationDelay: `calc(var(--k) * 3350ms)` }} />
      </div>
    </div>
  );
}

/**
 * O capuz da Destino é vazado (o miolo é transparente). Na Loja o fundo é escuro e ele parece inteiro; no palco da abertura o halo
 * dourado aparecia dentro dele. Um tampão escuro atrás do capuz mantém o miolo escuro, como na Loja.
 */
function HoodPlug() {
  // Sombra por dentro do capuz: bem escura no fundo do miolo e suave nas bordas (degradê, sem `filter`).
  return (
    <div
      aria-hidden
      className="absolute top-[2.5%] left-1/2 h-[11%] w-[16%] -translate-x-1/2"
      style={{ background: "radial-gradient(ellipse 50% 60% at 50% 62%, rgba(1,4,2,.98) 0%, rgba(2,6,4,.92) 55%, rgba(2,6,4,0) 100%)" }}
    />
  );
}

export type PackStageProps = {
  rarity: PackRarity;
  /** Faixa do pacote e mês do conjunto: a capa é a mesma do app. */
  tier: PackTier;
  month: string;
  /** Chave da skin sorteada (a carta que gira). */
  skin: string;
  round: number;
  /** Chance real desta raridade neste pacote, em %. */
  oddsPercent: number | null;
  /** Skin repetida: moedas recebidas no lugar. */
  duplicateCoins: number | null;
  /** Movimento reduzido: mostra só o resultado, sem a animação. */
  reduced: boolean;
};

/** A abertura do pacote (protótipo aprovado): pacote que treme, estouro de luz e a carta que gira mostrando a skin. */
export function PackStage({ rarity, tier, month, skin, round, oddsPercent, duplicateCoins, reduced }: PackStageProps) {
  const cfg = RARITY_LOOKS[rarity];
  const skinKey = isCardSkinKey(skin) ? skin : "esmeralda";
  const skinName = getCardSkin(skinKey).name;
  const label = PACK_RARITY_NAMES[rarity];
  const odds = oddsPercent === null ? null : `${String(oddsPercent).replace(".", ",")}%`;
  const note = duplicateCoins !== null ? `Repetida · +${duplicateCoins} CC` : null;
  const color = `rgb(${cfg.rgb})`;
  const vars = { "--k": reduced ? 0 : cfg.k } as CSSProperties;
  const mystery = { ...SAMPLE_PLAYER, photo: null, nickname: "", fullName: "", cardSkin: skinKey };

  if (reduced) {
    return (
      <div className="pack-lab absolute inset-0 overflow-hidden bg-[#050907] text-white">
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(75% 48% at 50% 44%, rgba(${cfg.rgb},${0.3 * cfg.power}), transparent 72%)` }} />
        <div className="absolute top-[42%] left-1/2 -ml-[130px] -mt-[182px] h-[364px] w-[260px]">
          <>
                  {skinKey === "destino" && <HoodPlug />}
                  <CanchaCard player={mystery} pure photoSizes="260px" className="w-full" />
                </>
        </div>
        <div className="absolute inset-x-0 top-[calc(42%+205px)] flex flex-col items-center gap-2.5 px-6 text-center">
          <span className="font-display text-[22px] leading-none font-semibold tracking-[0.34em] uppercase" style={{ color }}>{label}</span>
          <div className="font-display text-[30px] leading-none font-bold tracking-wide">{skinName}</div>
          {odds && <div className="text-xs text-white/65">Chance neste pacote: <strong className="font-semibold text-white">{odds}</strong></div>}
          {note && <div className="rounded-md border px-3 py-1.5 text-xs" style={{ borderColor: `rgba(${cfg.rgb},.45)`, background: `rgba(${cfg.rgb},.1)`, color }}>{note}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={vars} className="pack-lab absolute inset-0 overflow-hidden bg-[#050907] text-white">
      <style>{`
        
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
        @keyframes pl-flip { 0%{transform:rotateY(0) scale(1) translateY(0)} 16%{transform:rotateY(-12deg) scale(1.02) translateY(4px)} 58%{transform:rotateY(192deg) scale(1.13) translateY(-18px)} 80%{transform:rotateY(174deg) scale(1.05) translateY(-6px)} 100%{transform:rotateY(180deg) scale(1) translateY(0)} }
        @keyframes pl-breathe { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes pl-sheen-back { 0%{transform:translateX(-130%) skewX(-16deg)} 100%{transform:translateX(330%) skewX(-16deg)} }
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
        <div aria-hidden className="absolute top-[calc(42%+168px)] left-1/2 -ml-[100px] h-[24px] w-[200px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(0,0,0,.65), transparent)", filter: "blur(6px)", animation: "pl-out .4s ease-in both", animationDelay: ms(2000) }} />

        {/* O pacote (o da primeira versão, aprovado pelo dono do app). */}
        <div className="absolute top-[42%] left-1/2 -ml-[105px] -mt-[160px] h-[320px] w-[210px]" style={{ animation: "pl-float 3.2s ease-in-out infinite" }}>
          <div className="relative size-full" style={{ animation: "pl-charge 0.9s linear both", animationDelay: ms(600) }}>
            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 ${100 - PACK_CAP_PERCENT}% 0)`, animation: "pl-cap 0.85s ease-in both", animationDelay: ms(1950) }}>
              <PackCover tier={tier} month={month} round={round} className="size-full" />
            </div>
            <div className="absolute inset-0" style={{ clipPath: `inset(${PACK_CAP_PERCENT}% 0 0 0)`, animation: "pl-body 0.75s ease-in both", animationDelay: ms(2000) }}>
              <PackCover tier={tier} month={month} round={round} className="size-full" />
              <div className="absolute inset-y-0 left-0 w-[28%]" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)", animation: "pl-sweep 2.6s ease-in-out infinite" }} />
            </div>
          </div>
        </div>

        {/* Luz que vaza da fresta: mancha suave que cresce, na cor da raridade (a dica antes da carta). */}
        <div aria-hidden className="absolute top-[calc(42%-160px+22px)] left-1/2 -ml-[150px] h-[70px] w-[300px]" style={{ animation: "pl-seam-grow 0.6s ease-out both, pl-out .35s ease-in both", animationDelay: `${ms(1450)}, ${ms(2300)}` }}>
          <div className="size-full rounded-full" style={{ background: `radial-gradient(closest-side, #fff 0%, rgba(${cfg.rgb},.95) 38%, transparent 100%)`, filter: "blur(7px)" }} />
        </div>
        {/* Estouro: floração larga da cor da raridade e uma sobre-exposição curta. */}
        <div aria-hidden className="absolute top-[42%] left-1/2 -ml-[210px] -mt-[210px] size-[420px] rounded-full" style={{ background: `radial-gradient(closest-side, #fff 0%, rgba(${cfg.rgb},.85) 35%, transparent 100%)`, animation: "pl-bloom 1.1s ease-out both", animationDelay: ms(1950) }} />
        <div aria-hidden className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,.95), rgba(${cfg.rgb},.55) 45%, rgba(${cfg.rgb},0) 85%)`, animation: "pl-expose 0.9s ease-out both", animationDelay: ms(1980) }} />

        {/* A carta: um objeto só, que gira. Costas (acabamento de carta de verdade) e frente (design puro). */}
        <div className="absolute top-[42%] left-1/2 -ml-[130px] -mt-[182px] h-[364px] w-[260px]" style={{ perspective: "1100px", animation: "pl-rise 0.95s cubic-bezier(.16,.84,.24,1) both", animationDelay: ms(2000) }}>
          <div className="size-full" style={{ animation: "pl-hover 3.6s ease-in-out infinite", animationDelay: ms(4600) }}>
            <div className="relative size-full" style={{ transformStyle: "preserve-3d", animation: "pl-flip 1.15s cubic-bezier(.45,.05,.25,1) both", animationDelay: ms(3300) }}>
              <PackCardBack rarity={rarity} rgb={cfg.rgb} power={cfg.power} />
              <div className="absolute inset-0" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
                <>
                  {skinKey === "destino" && <HoodPlug />}
                  <CanchaCard player={mystery} pure photoSizes="260px" className="w-full" />
                </>
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
            <span className="font-display text-[22px] leading-none font-semibold uppercase" style={{ color, textShadow: `0 0 18px rgba(${cfg.rgb},.7)`, animation: "pl-track 1.1s cubic-bezier(.2,.8,.2,1) both", animationDelay: ms(4100) }}>{label}</span>
            <span className="h-px w-9" style={{ background: `linear-gradient(270deg, transparent, ${color})` }} />
          </div>
          <div className="font-display text-[30px] leading-none font-bold tracking-wide" style={{ animation: "pl-up 0.6s ease-out both", animationDelay: ms(4500) }}>{skinName}</div>
          {odds && (
            <div className="text-xs text-white/65" style={{ animation: "pl-up 0.6s ease-out both", animationDelay: ms(4750) }}>
              Chance neste pacote: <strong className="font-semibold text-white">{odds}</strong>
            </div>
          )}
          {note && (
            <div className="max-w-[300px] rounded-md border px-3 py-1.5 text-xs" style={{ borderColor: `rgba(${cfg.rgb},.45)`, background: `rgba(${cfg.rgb},.1)`, color: rarity === "comum" ? "#cdd6de" : color, animation: "pl-up 0.6s ease-out both", animationDelay: ms(5100) }}>
              {note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
