"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CardBack } from "@/components/card-back";
import { CanchaCard, isTrimmedCard } from "@/components/cancha-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import { PACK_RARITY_NAMES, type PackRarity, type PackTier } from "@/lib/packs";
import { getCardSkin, isCardSkinKey } from "@/types/card-skin";

/**
 * Onde fica a carta no vídeo do palco (% da largura e da altura do quadro 9:16), do `slots.json` de
 * `scripts/blender/pacote-palco.py`: a carta flutua logo acima do círculo de luz.
 */
const CARD_SLOT = { left: 25.25, top: 23.56, width: 49.5, height: 37.03 };
/** Frente do círculo (% da altura): os avisos ficam logo abaixo dele. */
const RING_FRONT = 75.88;

type RarityLook = {
  /** Cor da raridade (o mesmo tom do círculo no vídeo). */
  rgb: string;
  /** Quando a carta gira, em ms depois que o palco começa (a lendária segura mais). */
  flipAt: number;
  /** Tremida da tela no clarão (só a lendária). */
  shake: boolean;
};

/** Visual por raridade: branco = comum, azul = rara, roxo = épica, dourado escuro = lendária (aprovado pelo dono do app em 2026-11-11). */
const RARITY_LOOKS: Record<PackRarity, RarityLook> = {
  comum: { rgb: "214,224,236", flipAt: 2500, shake: false },
  rara: { rgb: "86,150,255", flipAt: 2700, shake: false },
  epica: { rgb: "184,112,255", flipAt: 2800, shake: false },
  lendaria: { rgb: "232,168,72", flipAt: 3150, shake: true },
};

/** O clarão do vídeo do palco (quadro 41 de 30 por segundo): a carta sobe logo depois. */
const FLASH_MS = 1370;
const RISE_MS = 900;
const HALF_TURN_MS = 260;
/** Se um vídeo não começar nesse tempo, a cena segue sem ele (fica a capa do palco). */
const VIDEO_WAIT_MS = 1500;

/** Versão dos vídeos e capas na URL: os estáticos ficam 1 dia em cache, então mudou o arquivo, suba o número. */
const MEDIA_VERSION = 2;

const ms = (value: number): string => `${Math.round(value)}ms`;

/**
 * O capuz da Destino é vazado (o miolo é transparente). Na Loja o fundo é escuro e ele parece inteiro; no palco a luz
 * aparecia dentro dele. Um tampão escuro atrás do capuz mantém o miolo escuro, como na Loja.
 */
function HoodPlug() {
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
  /** Faixa do pacote: escolhe o vídeo do rasgo (a capa é a da faixa). */
  tier: PackTier;
  month: string;
  /** Chave da skin sorteada (a carta que gira). */
  skin: string;
  round: number | null;
  /** Chance real desta raridade neste pacote, em %. */
  oddsPercent: number | null;
  /** Skin repetida: vira cópia extra, para vender no Mercado ou na venda rápida. */
  isDuplicate: boolean;
  /** Movimento reduzido: o palco parado e a carta direto, sem animação. */
  reduced: boolean;
  /** Chamado quando a skin e os textos já estão na tela (o pai mostra os botões). */
  onReady: () => void;
};

type Phase = "tear" | "stage";

/**
 * A abertura do pacote (2026-11-11): o pacote rasga (vídeo do Blender, um por faixa), corta para o palco escuro onde o
 * círculo de luz acende na cor da raridade (vídeo do Blender, um por raridade), a carta sobe de costas sobre o círculo e
 * gira mostrando a skin. A carta é sempre do app (verso `CardBack` e frente `CanchaCard` em modo `pure`), presa ao círculo
 * pelo quadro 9:16 do vídeo; o giro é em duas metades, só `transform`.
 */
export function PackStage({ rarity, tier, skin, oddsPercent, isDuplicate, reduced, onReady }: PackStageProps) {
  const look = RARITY_LOOKS[rarity];
  const skinKey = isCardSkinKey(skin) ? skin : "esmeralda";
  const skinName = getCardSkin(skinKey).name;
  const label = PACK_RARITY_NAMES[rarity];
  const odds = oddsPercent === null ? null : `${String(oddsPercent).replace(".", ",")}%`;
  const note = isDuplicate ? "Repetida · fica guardada em Minhas cartas para vender" : null;
  const color = `rgb(${look.rgb})`;
  const mystery = { ...SAMPLE_PLAYER, photo: null, nickname: "", fullName: "", cardSkin: skinKey };

  const [phase, setPhase] = useState<Phase>("tear");
  const [isStageRunning, setIsStageRunning] = useState(false);
  const tearRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLVideoElement>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const goToStage = useCallback(() => setPhase("stage"), []);

  // Rasgo: toca o vídeo da faixa; se não tocar, vai direto ao palco.
  useEffect(() => {
    if (reduced) return;
    const video = tearRef.current;
    if (!video) return;
    const timer = window.setTimeout(() => {
      if (video.currentTime === 0) goToStage();
    }, VIDEO_WAIT_MS * 2);
    video.play().catch(goToStage);
    return () => window.clearTimeout(timer);
  }, [reduced, goToStage]);

  // Palco: toca o vídeo da raridade; a carta começa quando o vídeo começa (ou depois de um tempo, sem ele).
  useEffect(() => {
    if (reduced || phase !== "stage") return;
    const video = stageRef.current;
    const start = () => setIsStageRunning(true);
    const timer = window.setTimeout(start, VIDEO_WAIT_MS);
    if (video) {
      video.addEventListener("playing", start, { once: true });
      video.play().catch(start);
    }
    return () => {
      window.clearTimeout(timer);
      video?.removeEventListener("playing", start);
    };
  }, [reduced, phase]);

  // Os botões aparecem quando a skin e os textos já estão na tela.
  useEffect(() => {
    if (reduced) {
      onReadyRef.current();
      return;
    }
    if (!isStageRunning) return;
    const timer = window.setTimeout(() => onReadyRef.current(), look.flipAt + HALF_TURN_MS * 2 + 1100);
    return () => window.clearTimeout(timer);
  }, [reduced, isStageRunning, look.flipAt]);

  const flipOut = look.flipAt;
  const flipIn = look.flipAt + HALF_TURN_MS;
  const textAt = flipIn + HALF_TURN_MS + 250;
  const run = reduced || isStageRunning;
  const anim = (value: string): string | undefined => (reduced ? undefined : value);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black text-white">
      <style>{`
        @keyframes pk-flash { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes pk-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pk-rise { 0% { opacity: 0; transform: translateY(46%) scale(.82); } 35% { opacity: 1; } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pk-hover { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.2%); } }
        @keyframes pk-back-half { 0% { transform: rotateY(0); opacity: 1; } 99.9% { transform: rotateY(90deg); opacity: 1; } 100% { transform: rotateY(90deg); opacity: 0; } }
        @keyframes pk-front-half { 0% { transform: rotateY(-90deg); opacity: 0; } 1% { opacity: 1; } 70% { transform: rotateY(7deg) scale(1.03); opacity: 1; } 100% { transform: rotateY(0) scale(1); opacity: 1; } }
        @keyframes pk-glow { 0% { opacity: 0; transform: scale(.7); } 40% { opacity: 1; } 100% { opacity: .75; transform: scale(1); } }
        @keyframes pk-breathe { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
        @keyframes pk-sheen { 0% { transform: translateX(-140%) skewX(-16deg); } 100% { transform: translateX(340%) skewX(-16deg); } }
        @keyframes pk-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pk-track { from { opacity: 0; letter-spacing: .7em; } to { opacity: 1; letter-spacing: .34em; } }
        @keyframes pk-shake { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-4px, 3px); } 50% { transform: translate(4px, -2px); } 75% { transform: translate(-3px, -2px); } }
      `}</style>

      {/* Rasgo do pacote (vídeo da faixa). Corta seco para o palco quando termina. */}
      {!reduced && phase === "tear" && (
        <video
          ref={tearRef}
          aria-hidden
          muted
          playsInline
          preload="auto"
          poster={`/revelacao/pacote-rasgo-${tier}-poster.jpg?v=${MEDIA_VERSION}`}
          onEnded={goToStage}
          onError={goToStage}
          className="pointer-events-none absolute inset-0 size-full object-cover"
        >
          <source src={`/revelacao/pacote-rasgo-${tier}.webm?v=${MEDIA_VERSION}`} type="video/webm" />
          <source src={`/revelacao/pacote-rasgo-${tier}.mp4?v=${MEDIA_VERSION}`} type="video/mp4" />
        </video>
      )}

      {/* O palco num quadro 9:16 com a altura da tela: no celular as laterais sobram (cortadas); na tela larga, fundo escuro dos lados. */}
      <div
        className="absolute top-0 left-1/2 h-full aspect-9/16 -translate-x-1/2"
        style={{ opacity: reduced || phase === "stage" ? 1 : 0 }}
      >
        <div className="absolute inset-0" style={look.shake && run ? { animation: anim(`pk-shake .1s linear 6 both ${ms(FLASH_MS)}`) } : undefined}>
          {reduced ? (
            <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(/revelacao/pacote-${rarity}-poster.jpg?v=${MEDIA_VERSION})` }} />
          ) : (
            <video
              ref={stageRef}
              aria-hidden
              muted
              playsInline
              preload="auto"
              poster={`/revelacao/pacote-${rarity}-poster.jpg?v=${MEDIA_VERSION}`}
              className="pointer-events-none absolute inset-0 size-full object-cover"
            >
              <source src={`/revelacao/pacote-${rarity}.webm?v=${MEDIA_VERSION}`} type="video/webm" />
              <source src={`/revelacao/pacote-${rarity}.mp4?v=${MEDIA_VERSION}`} type="video/mp4" />
            </video>
          )}

          {run && (
            <>
              {/* Luz da raridade atrás da carta, depois do giro (degradê, sem `filter`). */}
              <div
                aria-hidden
                className="absolute rounded-full"
                style={{
                  left: `${CARD_SLOT.left - CARD_SLOT.width * 0.35}%`,
                  width: `${CARD_SLOT.width * 1.7}%`,
                  top: `${CARD_SLOT.top + CARD_SLOT.height * 0.5}%`,
                  aspectRatio: "1",
                  translate: "0 -50%",
                  background: `radial-gradient(closest-side, rgba(${look.rgb},.42), rgba(${look.rgb},.1) 60%, transparent)`,
                  animation: anim(`pk-glow .9s ease-out both ${ms(flipIn)}`),
                }}
              />

              {/* A carta: sobe de costas sobre o círculo e gira mostrando a skin. */}
              <div
                className="absolute"
                style={{
                  left: `${CARD_SLOT.left}%`,
                  width: `${CARD_SLOT.width}%`,
                  bottom: `${100 - CARD_SLOT.top - CARD_SLOT.height}%`,
                  animation: anim(`pk-rise ${ms(RISE_MS)} cubic-bezier(.16,.84,.24,1) both ${ms(FLASH_MS + 60)}`),
                }}
              >
                <div style={{ animation: anim(`pk-hover 3.6s ease-in-out infinite ${ms(FLASH_MS + RISE_MS)}`) }}>
                  <div className="relative aspect-5/7" style={{ perspective: "1100px" }}>
                    {!reduced && (
                      <div className="absolute inset-0" style={{ animation: `pk-back-half ${ms(HALF_TURN_MS)} ease-in both ${ms(flipOut)}` }}>
                        <CardBack rarity={rarity} skinName="" hideNames />
                        <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[9%/6.5%]">
                          {/* Expectativa antes de virar: a borda respira na cor da raridade e um reflexo passa. */}
                          <div className="absolute inset-0 rounded-[inherit]" style={{ boxShadow: `inset 0 0 26px rgba(${look.rgb},.6)`, animation: "pk-breathe 1.1s ease-in-out infinite" }} />
                          <div className="absolute inset-y-0 left-0 w-[26%]" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)", animation: `pk-sheen .9s ease-in-out both ${ms(flipOut - 900)}` }} />
                        </div>
                      </div>
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ animation: anim(`pk-front-half ${ms(HALF_TURN_MS + 140)} cubic-bezier(.2,.8,.3,1.2) both ${ms(flipIn)}`) }}
                    >
                      {/* Cartas de neon ocupam 84% da própria caixa: amplia para a frente ter o tamanho do verso. */}
                      <div className="relative" style={isTrimmedCard(mystery) ? { scale: String(1 / 0.84) } : undefined}>
                        {skinKey === "destino" && <HoodPlug />}
                        <CanchaCard player={mystery} pure photoSizes="320px" className="w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raridade e nome, acima da carta. */}
              <div className="absolute inset-x-0 top-[max(7%,calc(env(safe-area-inset-top)+12px))] flex flex-col items-center gap-2 px-6 text-center">
                <div className="flex items-center gap-3" style={{ animation: anim(`pk-up .6s ease-out both ${ms(textAt)}`) }}>
                  <span className="h-px w-9" style={{ background: `linear-gradient(90deg, transparent, ${color})` }} />
                  <span
                    className="font-display text-[22px] leading-none font-semibold tracking-[0.34em] uppercase"
                    style={{ color, textShadow: `0 0 18px rgba(${look.rgb},.7)`, animation: anim(`pk-track 1.1s cubic-bezier(.2,.8,.2,1) both ${ms(textAt)}`) }}
                  >
                    {label}
                  </span>
                  <span className="h-px w-9" style={{ background: `linear-gradient(270deg, transparent, ${color})` }} />
                </div>
                <div className="font-display text-[30px] leading-none font-bold tracking-wide" style={{ animation: anim(`pk-up .6s ease-out both ${ms(textAt + 300)}`) }}>
                  {skinName}
                </div>
                {odds && (
                  <div className="text-xs text-white/70" style={{ animation: anim(`pk-up .6s ease-out both ${ms(textAt + 500)}`) }}>
                    Chance neste pacote: <strong className="font-semibold text-white">{odds}</strong>
                  </div>
                )}
              </div>

              {/* Aviso de repetida, logo abaixo do círculo. */}
              {note && (
                <div className="absolute inset-x-0 flex justify-center px-6" style={{ top: `${RING_FRONT + 1.5}%` }}>
                  <div
                    className="max-w-[300px] rounded-md border px-3 py-1.5 text-center text-xs"
                    style={{
                      borderColor: `rgba(${look.rgb},.45)`,
                      background: `rgba(${look.rgb},.12)`,
                      color: rarity === "comum" ? "#dfe6ee" : color,
                      animation: anim(`pk-up .6s ease-out both ${ms(textAt + 700)}`),
                    }}
                  >
                    {note}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Corte do rasgo para o palco: um clarão branco curto. */}
      {!reduced && phase === "stage" && (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-white" style={{ animation: "pk-flash .45s ease-out both" }} />
      )}
    </div>
  );
}
