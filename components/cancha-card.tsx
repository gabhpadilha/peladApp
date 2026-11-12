import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { PHOTO_SHADOW_GRADIENT_ID } from "@/lib/card-svg-ids";
import { AWARD_ICONS } from "@/components/award-icons";
import { getCardRank, CARD_RANK_LABELS, RANK_FLAT_CLASSES, type CardRank } from "@/lib/card-rank";
import { getCardStats } from "@/lib/card-stats";
import { getInitials } from "@/lib/get-initials";
import type { CardThemeKey } from "@/lib/card-themes";
import { AWARD_LABELS, awardDesignKind, type AwardDesignKind, type AwardKind } from "@/types/award";
import type { CardSkinKey } from "@/types/card-skin";
import type { Player } from "@/types/player";

/**
 * Carta com identidade própria (branch de testes `feat/card-identity-redesign`):
 * retangular de baralho, foto protagonista integrada em camadas, 3 estatísticas
 * e patente no selo. Esqueleto fixo + "roupa" trocável (fundo, metal e cor da luz).
 * Ver docs/superpowers/specs/2026-10-28-cartas-identidade-propria-design.md.
 *
 * Regras do iPhone (design-system): sem `filter`, `mix-blend-mode` nem máscara com
 * a URL da foto. A riqueza vem dos fundos em imagem (`public/cartas/fundos/`) e de
 * camadas de degradê empilhadas.
 */

/**
 * Peça que flutua em volta da carta (carta Destino, 2026-11-05): arte do Gemini sobre transparência, posicionada em % da caixa da carta
 * (`x`, `y` = centro; `w` = largura), por trás (`back`) ou por cima (`front`) da moldura. Só `transform` e `opacity` (iPhone); some nas
 * cartas pequenas (miniaturas) e fica parada com movimento reduzido.
 */
export type Floater = {
  src: string;
  x: number;
  y: number;
  w: number;
  layer: "back" | "front";
  anim: "float" | "orbit" | "spin" | "thunder-strike";
  /** Duração do ciclo, em segundos. */
  dur: number;
  delay?: number;
  /** Inclinação fixa, em graus. */
  rot?: number;
};

export type Roupa = {
  /** Fundo artístico em `public/cartas/fundos/`. */
  background: string;
  /** Metal da moldura: escuro, base dos reflexos (`METAL_FRAME`) e fio interno. */
  metal: readonly [string, string, string];
  /** Fios, faixa e linhas. */
  accent: string;
  /** Cor da luz que envolve o jogador ("R G B", para `rgb(... / alfa)`). */
  light: string;
  /** Barras do nome e do rodapé. */
  bar: string;
  /** Texto secundário (posição, nomes das estatísticas). */
  muted: string;
  /** Cor do texto principal (nome, números); padrão branco. Cartas claras (Ícone) usam tinta escura. */
  ink?: string;
  /** Medalhão com o ícone do prêmio no canto da carta (carta-base dos prêmios individuais, 2026-11-09): fundo, aro e ícone. */
  awardMedal?: { bg: string; border: string; fg: string };
  /** Carta fosca (a padrão, de começo de jogo): sem clarão, brilhos, feixe de luz nem selo brilhante. */
  matte?: boolean;
  /** Estrelinhas piscando na frente do jogador (padrão: sim, menos na fosca). */
  sparkles?: boolean;
  /** Cor do neon: moldura fina em "tubo de neon" e o enfeite que abraça a base (skins premium e de evento). */
  neon?: string;
  /** Enfeite de neon por fora da carta (padrão: o abraço da base, `NEON_TRIMS.base`; `null` = sem enfeite). */
  trim?: NeonTrimKind | null;
  /** Neon "apagado": cor sem centro branco e brilho fraco (a Bola Murcha). */
  neonDim?: boolean;
  /**
   * Arte por fora da carta (WebP transparente em `public/cartas/fundos/`, do tamanho da caixa da
   * carta de neon): moldura e enfeites pintados, por cima da moldura de neon.
   */
  overflow?: string;
  /** A arte de fora é mais larga que a caixa (razão entre as larguras): o aglomerado que passa da sobra de 8%. */
  overflowWidth?: number;
  /** Quanto dessa largura extra fica à esquerda da caixa (razão com a largura da caixa); sem ele, tudo vai para a direita. */
  overflowLeft?: number;
  /**
   * Fundo claro e sem sombra por cima (pedido do dono do app em 2026-11-01, na Ícone de mármore): sem a sombra
   * atrás da pessoa, sem a vinheta e sem o degradê escuro que desce até as estatísticas.
   */
  clean?: boolean;
  /** O conteúdo (foto, nome e estatísticas) fica dentro de uma janela mais recuada: por dentro do fio fino de dentro da borda da arte. */
  window?: "inner" | "ring";
  /** Recuo da janela `ring` em % da carta (padrão 0,9 e 0,65): quando a caixa é o lado de fora do neon e o conteúdo vai até o ouro (Campeão do Mês). */
  windowInset?: { x: number; y: number };
  /** Raio do canto da janela `ring`, em cqw (padrão 8: o do fio de ouro dos destaques; a Lenda tem 5,2). */
  windowRadius?: number;
  /** Barra do nome sem o fundo escuro (só a linha embaixo): as letras ficam direto sobre a arte. */
  bareName?: boolean;
  /** Enquadramento da foto desta roupa (padrão: o da carta). */
  photoFrame?: PhotoFrame;
  /** A moldura é a da arte (`overflow`): a carta não desenha o tubo de neon, o brilho nem o enfeite. */
  artFrame?: boolean;
  /** Raios da arte de fora numa camada própria (mesmo tamanho), que estala como trovão. */
  overflowBolts?: string;
  /**
   * Raios de dentro da janela, atrás do jogador (WebP do tamanho da janela): piscam junto com os de fora
   * (`overflowBolts`), acendendo e apagando por inteiro, como um trovão.
   */
  innerBolts?: string;
  /** Os raios (`innerBolts` e `overflowBolts`) ficam parados, sem animação. */
  still?: boolean;
  /**
   * Conteúdo por baixo da moldura (2026-11-05, ideia do dono do app: "a borda fica por cima de tudo"): a arte do fundo e a janela do conteúdo
   * vão quase até a borda da carta (esta folga, em % da carta, fica escondida sob a faixa da moldura) e a moldura corta tudo na borda de dentro,
   * sem emenda possível. A janela fica sem fundo (a arte é esta camada).
   */
  artInset?: { x: number; y: number; radius: number };
  /**
   * Janela mais larga (até a moldura fina, sem faixa de arte aparente em volta das barras): a mesma folga, em cqw, é devolvida ao nome, ao selo
   * do OVR, à faixa e às estatísticas, para as informações ficarem onde sempre ficam.
   */
  contentPad?: number;
  /** Sobe as estatísticas, a faixa e o fim da foto (em cqw) quando enfeites da moldura cobrem a parte de baixo (Natal gelo: os montes de neve). */
  statsLift?: number;
  /** Afasta as 3 estatísticas das laterais (em cqw), para enfeites da moldura que entram na carta não cobrirem os números. */
  statsPadX?: number;
  /** Afasta o nome e o selo do OVR das laterais (em cqw), quando enfeites da moldura entram na carta pelo alto. */
  namePadX?: number;
  /** Desce o nome e a posição (em cqw) quando o enfeite do topo da moldura cobre o nome (Cartada e Ímã, 2026-11-12); o selo do OVR fica onde está. */
  nameDrop?: number;
  /** Desce a foto inteira (em cqw), para a cabeça não passar por cima da caixa do nome (épicas de dezembro, 2026-11-12); o peito some atrás das estatísticas. */
  photoDrop?: number;
  /** Peças que flutuam em volta da carta (animação lenta, só nas cartas grandes). */
  floaters?: readonly Floater[];
  /** Sobe e afasta das laterais os números das estatísticas (em cqw), para a moldura da arte não passar por cima deles. */
  statsInset?: { bottom: number; side: number };
  /** Gotas de água escorrendo pela carta, desenhadas em código (só `transform` e `opacity`); ficam por cima do conteúdo e por baixo da moldura. */
  drops?: boolean;
  /**
   * Camada de luz que desliza devagar atrás do jogador (WebP 12% mais larga que a janela; só `transform`, a Aurora):
   * as cortinas dela passam sobre as do fundo. Parada com movimento reduzido.
   */
  drift?: string;
  /** Os raios acendem forte e esmaecem devagar (`cc-thunder-glow`), em vez do estalo curto. */
  glow?: boolean;
};

/** Gotas que escorrem (x e y em % da carta; `drip` = quantas alturas da gota ela desce; `size` = largura em % da carta). */
const DRIPS = [
  { x: 9, y: 27, size: 2.6, drip: 9, seconds: 7.5, delay: 0 },
  { x: 20, y: 33, size: 1.8, drip: 7, seconds: 6.2, delay: 2.4 },
  { x: 32, y: 24, size: 2.1, drip: 8, seconds: 8.4, delay: 4.6 },
  { x: 66, y: 29, size: 2.2, drip: 10, seconds: 7, delay: 1.2 },
  { x: 78, y: 36, size: 1.7, drip: 7, seconds: 6.6, delay: 3.4 },
  { x: 90, y: 26, size: 2.5, drip: 9, seconds: 8, delay: 5.6 },
  { x: 14, y: 52, size: 2, drip: 6, seconds: 7.8, delay: 6.4 },
  { x: 86, y: 55, size: 2.3, drip: 6, seconds: 7.2, delay: 0.8 },
] as const;

/** Gotas d'água escorrendo (feitas em código: degradê com reflexo e um rastro fino; param e escorrem de novo). */
function WaterDrops() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-[0.9%] inset-y-[0.65%] z-[10] overflow-hidden rounded-[7cqw] motion-reduce:hidden">
      {DRIPS.map((drop, index) => (
        <span
          key={index}
          className="absolute block rounded-[50%_50%_50%_50%/60%_60%_40%_40%] border border-white/45 bg-[radial-gradient(circle_at_34%_28%,rgb(255_255_255/0.95)_0_12%,rgb(200_232_255/0.5)_30%,rgb(120_190_255/0.22)_65%,rgb(20_60_110/0.35))] opacity-0"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            width: `${drop.size}%`,
            aspectRatio: "0.78",
            ["--drip" as string]: drop.drip,
            animation: `cc-drip ${drop.seconds}s ease-in-out ${drop.delay}s infinite`,
          }}
        >
          <span className="absolute bottom-full left-1/2 h-[260%] w-[26%] -translate-x-1/2 bg-linear-to-t from-white/35 to-transparent" />
        </span>
      ))}
    </div>
  );
}

const GOLD = ["#7a5512", "#e9c86a", "#fff4c8"] as const;
const SILVER = ["#3b4450", "#c9d1d6", "#ffffff"] as const;

/** Runas e cacos de esmeralda que flutuam em volta da Destino (`prototipos/destino-runas.cjs`); o círculo arcano gira atrás da carta e só aparece nas laterais. */
const DESTINO_FLOATERS: readonly Floater[] = [
  { src: "destino-circulo", x: 50, y: 50, w: 100, layer: "back", anim: "spin", dur: 90 },
  { src: "destino-runa", x: 10, y: 30, w: 17, layer: "front", anim: "float", dur: 7, rot: -8 },
  { src: "destino-runa", x: 91, y: 58, w: 14, layer: "front", anim: "orbit", dur: 9, delay: 1, rot: 10 },
  { src: "destino-runa", x: 9, y: 79, w: 12, layer: "front", anim: "float", dur: 8, delay: 2.5, rot: 6 },
  { src: "destino-runa", x: 90, y: 13, w: 11, layer: "front", anim: "orbit", dur: 10, delay: 0.5, rot: -12 },
  { src: "destino-caco-a", x: 94, y: 84, w: 9, layer: "front", anim: "float", dur: 6, delay: 1.2 },
  { src: "destino-caco-b", x: 5, y: 54, w: 7, layer: "front", anim: "orbit", dur: 7, delay: 3 },
  { src: "destino-caco-c", x: 52, y: 3.5, w: 8, layer: "back", anim: "float", dur: 8, delay: 0.8 },
];

/** Peças 3D que flutuam atrás e em volta do Dilúvio (`prototipos/diluvio-flutuantes.cjs`): um anel de raio gira atrás da carta (só aparece nas laterais), gotas gigantes e cacos de cristal flutuam. */
const DILUVIO_FLOATERS: readonly Floater[] = [
  { src: "diluvio-anel", x: 50, y: 50, w: 100, layer: "back", anim: "spin", dur: 80 },
  { src: "diluvio-gota-a", x: 9, y: 28, w: 14, layer: "front", anim: "float", dur: 7, rot: -6 },
  { src: "diluvio-gota-b", x: 8, y: 80, w: 10, layer: "front", anim: "orbit", dur: 9, delay: 1.5, rot: 5 },
  { src: "diluvio-gota-c", x: 93, y: 20, w: 11, layer: "back", anim: "float", dur: 8, delay: 0.6, rot: 8 },
  { src: "diluvio-gota-d", x: 52, y: 96, w: 8, layer: "back", anim: "orbit", dur: 10, delay: 2.2 },
  { src: "diluvio-caco-a", x: 94, y: 78, w: 11, layer: "front", anim: "float", dur: 6, delay: 1.2, rot: 12 },
  { src: "diluvio-caco-b", x: 5, y: 54, w: 9, layer: "front", anim: "orbit", dur: 8, delay: 3, rot: -10 },
  { src: "diluvio-caco-c", x: 50, y: 3, w: 8, layer: "back", anim: "float", dur: 7, delay: 0.8 },
];

/** Runas, rochas e raios que flutuam em volta da Tormenta (`prototipos/tormenta-pecas.cjs`); os raios estalam como trovão (só `opacity`). */
const TORMENTA_FLOATERS: readonly Floater[] = [
  { src: "tormenta-pedra-a", x: 8, y: 27, w: 15, layer: "front", anim: "float", dur: 8, rot: -10 },
  { src: "tormenta-runa", x: 92, y: 60, w: 14, layer: "front", anim: "orbit", dur: 9, delay: 1, rot: 8 },
  { src: "tormenta-pedra-b", x: 91, y: 12, w: 10, layer: "front", anim: "orbit", dur: 10, delay: 0.5, rot: 14 },
  { src: "tormenta-runa", x: 8, y: 80, w: 11, layer: "front", anim: "float", dur: 7, delay: 2.2, rot: -6 },
  { src: "tormenta-pedra-b", x: 93, y: 86, w: 9, layer: "front", anim: "float", dur: 6, delay: 1.4, rot: -12 },
  { src: "tormenta-raio-b", x: 5.5, y: 52, w: 8, layer: "front", anim: "thunder-strike", dur: 3.4 },
  { src: "tormenta-raio-c", x: 95, y: 36, w: 9, layer: "front", anim: "thunder-strike", dur: 4.1, delay: 1.3 },
  { src: "tormenta-raio-a", x: 7, y: 92, w: 6, layer: "front", anim: "thunder-strike", dur: 3.8, delay: 2.1 },
];

/** Fumaça, runas, rochas e adaga que flutuam em volta do Embuste (`prototipos/embuste-pecas.cjs`); a fumaça gira devagar atrás da carta. */
const EMBUSTE_FLOATERS: readonly Floater[] = [
  { src: "embuste-fumaca", x: 50, y: 50, w: 108, layer: "back", anim: "spin", dur: 140 },
  { src: "embuste-pedra-a", x: 8, y: 27, w: 14, layer: "front", anim: "float", dur: 8, rot: -10 },
  { src: "embuste-runa", x: 92, y: 60, w: 13, layer: "front", anim: "orbit", dur: 9, delay: 1, rot: 8 },
  { src: "embuste-pedra-b", x: 91, y: 12, w: 10, layer: "front", anim: "orbit", dur: 10, delay: 0.5, rot: 14 },
  { src: "embuste-adaga", x: 7, y: 80, w: 10, layer: "front", anim: "float", dur: 7, delay: 2, rot: 24 },
  { src: "embuste-runa", x: 93, y: 88, w: 9, layer: "front", anim: "float", dur: 6, delay: 1.4, rot: -8 },
];

const ROUPAS = {
  // Grafite fosco (aprovado pelo dono do app em 2026-10-29): menos premium que as skins, de propósito.
  padrao: { background: "fosco-grafite", metal: ["#2a312d", "#2a312d", "rgb(255 255 255 / 0.1)"], accent: "#8fa197", light: "255 255 255", bar: "#121714", muted: "#9fb0a4", matte: true },
  // Skins premium (aprovadas pelo dono do app em 2026-10-29): fundo lapidado na cor da pedra,
  // moldura em tubo de neon com o enfeite da base (`neon`) e sem estrelinhas. Fundos gerados por `prototipos/gemas.cjs` (docs).
  esmeralda: { background: "premium-esmeralda", overflow: "premium-esmeralda-vaza", overflowWidth: 774 / 714, artFrame: true, trim: null, metal: ["#0f6b45", "#0f6b45", "#5fd39a"], accent: "#5fd39a", light: "160 255 200", bar: "#03140c", muted: "#9fffc8", sparkles: false, neon: "#2dffa0" },
  safira: { background: "premium-safira", overflow: "premium-safira-vaza", overflowWidth: 774 / 714, artFrame: true, trim: null, metal: ["#1d4fa8", "#1d4fa8", "#7fb0ff"], accent: "#7fb0ff", light: "170 200 255", bar: "#040a1c", muted: "#a9c8ff", sparkles: false, neon: "#36a6ff" },
  ametista: { background: "premium-ametista", overflow: "premium-ametista-vaza", overflowWidth: 774 / 714, artFrame: true, trim: null, metal: ["#5b2fa0", "#5b2fa0", "#b99bff"], accent: "#b99bff", light: "220 190 255", bar: "#0e0620", muted: "#d2bcff", sparkles: false, neon: "#c46bff" },
  rubi: { background: "premium-rubi", overflow: "premium-rubi-vaza", overflowWidth: 774 / 714, artFrame: true, trim: null, metal: ["#9b1530", "#9b1530", "#ff8fa3"], accent: "#ff8fa3", light: "255 190 200", bar: "#1a0309", muted: "#ffb3c0", sparkles: false, neon: "#ff2f66" },
  // Ícone: branco creme com moldura de ouro claro, lembrando a carta Icon do FIFA (2026-10-29).
  // Natal campeão = carta do CAMPEÃO DO MÊS (melhor jogador do mês) de dezembro de 2026 (decisão do dono do app em 2026-11-05; GUARDADA: falta ligar em `CAMPEAO_MES`/`awardRoupa` quando o tema de dezembro existir em `CARD_THEMES`): malha de tricô verde natalina
  // e moldura de ouro com pinheiro, laços, sinos e azevinho por fora (arte do dono em `prototipos/natal-campeao-*-dono.jpg`, montada por `montar-carta.cjs`). Mesmo padrão da Rubi e da Ícone.
  natalCampeao: { background: "premium-natal-campeao", overflow: "premium-natal-campeao-vaza", artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#b8902f", "#b8902f", "#fff1c2"], accent: "#f3d27a", light: "255 215 150", bar: "#08170d", muted: "#ffe9b8", sparkles: false, neon: "#f3d27a" },
  // Natal gelo = carta dos DESTAQUES DA RODADA de dezembro de 2026 (decisão do dono do app em 2026-11-05; LIGADA em `awardRoupa` como carta-base dos prêmios individuais em 2026-11-09): tricô azul-gelo com renas e flocos e moldura de ouro
  // com boneco de neve, pinheiro com neve, laços azuis e montes de neve por fora (arte do dono em `prototipos/natal-gelo-*-dono.jpg`). Mesmo padrão da Rubi e da Ícone.
  natalGelo: { background: "premium-natal-gelo", overflow: "premium-natal-gelo-vaza", statsLift: 6, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#b8902f", "#b8902f", "#fff1c2"], accent: "#f3d27a", light: "190 225 255", bar: "#07182a", muted: "#d4ebff", sparkles: false, neon: "#f3d27a" },
  // Natal craque = carta do MELHOR JOGADOR da rodada ("jogador da rodada") de dezembro de 2026 (decisão do dono do app em 2026-11-05; LIGADA em `awardRoupa` como carta-base dos prêmios individuais em 2026-11-09): tricô vermelho
  // com barras brancas e moldura de ouro com sinos, estrela, laços, pinhas, laranjas e neve (arte do dono em `prototipos/natal-craque-*-dono.jpg`). Mesmo padrão. O Time da Semana saiu do jogo.
  natalCraque: { background: "premium-natal-craque", overflow: "premium-natal-craque-vaza", statsLift: 6, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#b8902f", "#b8902f", "#fff1c2"], accent: "#f3d27a", light: "255 200 170", bar: "#2a0707", muted: "#ffe0c8", sparkles: false, neon: "#f3d27a", awardMedal: { bg: "#7a1111", border: "#fff1c2", fg: "#f3d27a" } },
  // Natal murcha = carta da BOLA MURCHA de dezembro de 2026 (decisão do dono do app em 2026-11-05; LIGADA em `awardRoupa` como carta-base dos prêmios individuais em 2026-11-09): tricô cinza-carvão com um presente que solta
  // uma bola murcha e moldura de aço fosco com pinheiro, laços vermelhos, bolinhas e uma bola de pano murcha no topo (arte do dono em `prototipos/natal-murcha-*-dono.jpg`). Sem brilho (`matte`), como a Bola Murcha.
  natalMurcha: { background: "premium-natal-murcha", overflow: "premium-natal-murcha-vaza", statsLift: 3, namePadX: 6, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, matte: true, trim: null, metal: ["#7d848c", "#7d848c", "#c9ced3"], accent: "#aeb5bc", light: "180 190 200", bar: "#17181b", muted: "#c9ced3", sparkles: false, neon: "#aeb5bc", awardMedal: { bg: "#17181b", border: "#aeb5bc", fg: "#c9ced3" } },
  // Natal time do mês = carta do TIME DO MÊS de dezembro de 2026 (decisão do dono do app em 2026-11-05; GUARDADA, ainda não ligada em `MONTH_ROUPA`): tricô roxo com presentes e flocos em ouro e creme
  // e moldura fina de ouro com presentes roxos e dourados, laços, bolas de Natal e ametistas (arte do dono em `prototipos/natal-timedomes-*-dono.jpg`).
  natalTimeDoMes: { background: "premium-natal-timedomes", overflow: "premium-natal-timedomes-vaza", statsLift: 4, statsPadX: 12, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#b8902f", "#b8902f", "#fff1c2"], accent: "#f3d27a", light: "220 180 255", bar: "#1a0a26", muted: "#f1dcc0", sparkles: false, neon: "#f3d27a" },
  // Destino (2026-11-05, evento "Destino" da Loja de dezembro, carta de prestígio, nível 5, 600 CC, em `CARD_SKINS` só para dezembro de 2026; design original que só alude a um vilão de cinema, sem nome, logo ou traje): ferro forjado e aço com runas
  // de um alfabeto inventado brilhando em verde-esmeralda, pano verde-musgo e cristais, e moldura de aço escovado com runas verdes, cristais nos cantos de cima e um capuz verde no topo (arte do dono em `prototipos/destino-fundo-dono.jpg` e `destino-borda-capuz-dono.jpg`).
  // Dilúvio (2026-11-10, lendária do conjunto de novembro, só de pacote; tema Toró): fundo de nuvens de tempestade em relevo com cristais e gotas de vidro, moldura de ferro e bronze com raios de plasma e uma coroa de pára-raios no topo,
  // aglomerado de cristais de tempestade que passa pela borda direita (meio dentro, meio fora) e peças 3D flutuando atrás (anel de raio, gotas e cacos). Arte do dono no Gemini (`prototipos/diluvio-*-dono.jpg`, `diluvio-v1.cjs`).
  diluvio: { background: "premium-diluvio", overflow: "premium-diluvio-vaza", overflowWidth: 800 / 714, floaters: DILUVIO_FLOATERS, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#5a4a33", "#5a4a33", "#d9b988"], accent: "#7fb6ff", light: "150 200 255", bar: "#050a14", muted: "#a9c8ff", sparkles: false, neon: "#3aa0ff" },
  // Aguaceiro e Chuva Violeta (raras de novembro de 2026, só de pacote; feitas em código por Claude, `prototipos/aguaceiro.cjs`): chuva em diagonal sobre vidro azul-noite com gotas, e moldura de aço azul-petróleo trabalhada de leve com suportes de canto,
  // raios e gotas em relevo e uma gota pendente embaixo. Chuva Violeta é o mesmo desenho girado para o violeta. Nublado e Neblina (comuns, `prototipos/nublado.cjs`): céu de toró de textura leve em cinza-azulado e em verde-musgo, com o tubo de neon de sempre.
  aguaceiro: { background: "premium-aguaceiro", overflow: "premium-aguaceiro-vaza", artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#4e6b82", "#4e6b82", "#d4e6f3"], accent: "#a6c8e6", light: "170 210 255", bar: "#050d18", muted: "#b8d4ec", sparkles: false, neon: "#6fb2ff" },
  chuvavioleta: { background: "premium-chuvavioleta", overflow: "premium-chuvavioleta-vaza", artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#5f5a86", "#5f5a86", "#e1dbf5"], accent: "#c9c0ee", light: "205 190 255", bar: "#0a0818", muted: "#d6cdf5", sparkles: false, neon: "#a58bff" },
  nublado: { background: "skin-nublado", metal: ["#5f7388", "#5f7388", "#dbe7f3"], accent: "#cfe0f1", light: "200 220 245", bar: "#0a121b", muted: "#c3d3e4", sparkles: false, neon: "#a9c6e4", trim: null },
  neblina: { background: "skin-neblina", metal: ["#5f7a6a", "#5f7a6a", "#dcefe3"], accent: "#c5dccd", light: "190 235 215", bar: "#08130e", muted: "#bcd8c7", sparkles: false, neon: "#9fd4b5", trim: null },
  chuvaesmeralda: { background: "premium-chuvaesmeralda", overflow: "premium-chuvaesmeralda-vaza", artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#3f7a63", "#3f7a63", "#d5f5e5"], accent: "#a5e3c4", light: "170 255 210", bar: "#04120c", muted: "#bfe9d3", sparkles: false, neon: "#4fe0a0" },
  chuvarubi: { background: "premium-chuvarubi", overflow: "premium-chuvarubi-vaza", artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#8a3a48", "#8a3a48", "#ffe0e5"], accent: "#f0a5b2", light: "255 190 200", bar: "#14060a", muted: "#f2c4cc", sparkles: false, neon: "#ff5a7a" },
  cerracao: { background: "skin-cerracao", metal: ["#8a7a62", "#8a7a62", "#f0e6d2"], accent: "#e6d5b8", light: "255 235 200", bar: "#120e08", muted: "#dccfb6", sparkles: false, neon: "#e0c99a", trim: null },
  crepusculo: { background: "skin-crepusculo", metal: ["#7a5f78", "#7a5f78", "#f0dcee"], accent: "#e0c5dc", light: "240 200 235", bar: "#10080f", muted: "#d8c0d4", sparkles: false, neon: "#d9a6d1", trim: null },
  destino: { background: "premium-destino", overflow: "premium-destino-vaza", floaters: DESTINO_FLOATERS, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#6b6f73", "#6b6f73", "#d6c07a"], accent: "#c9a85c", light: "120 255 170", bar: "#06100b", muted: "#b9e8c8", sparkles: false, neon: "#3dffa0" },
  // Tormenta (2026-11-09, evento "Destino" da Loja de dezembro, segunda carta de prestígio, nível 5, 600 CC; só alusões à mitologia nórdica, sem nome, logo ou traje de obra): tempestade azul com raios, moldura de ferro com runas azuis brilhando,
  // um martelo de nós celtas no topo e peles nos cantos de cima, com rochas de cristal, runas e raios flutuando em volta (arte do dono em `prototipos/tormenta-{fundo,borda,pecas}-dono.*`; o fundo com `montar-carta.cjs tormenta ... 60,75,704,965 - 12 0,0,765,1024` e a moldura com `tormenta-borda.cjs`, recorte próprio: ferro e peles opacos, raios só por luz, sem mancha preta).
  tormenta: { background: "premium-tormenta", overflow: "premium-tormenta-vaza", floaters: TORMENTA_FLOATERS, statsLift: 5, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#5d6672", "#5d6672", "#cfe6ff"], accent: "#7fc4ff", light: "120 190 255", bar: "#050b18", muted: "#bcd8ff", sparkles: false, neon: "#4aa8ff" },
  // Embuste (2026-11-09, evento "Destino" da Loja de dezembro, terceira carta de prestígio, nível 5, 600 CC; só alusões à mitologia nórdica): floresta sob aurora verde com fumaça em serpente, moldura de ferro com runas verdes,
  // chifres dourados e esmeralda no topo, dragões e panos nos cantos de cima (arte do dono em `prototipos/embuste-{fundo,borda,pecas}-dono.*`; fundo com `montar-carta.cjs embuste ... 48,88,692,965 - 12 0,0,728,1024`
  // e moldura com `embuste-borda.cjs`, recorte de luz: ferro e peças opacos, fumaça só por luz).
  embuste: { background: "premium-embuste", overflow: "premium-embuste-vaza", floaters: EMBUSTE_FLOATERS, statsLift: 5, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#56604f", "#56604f", "#e2f5c9"], accent: "#6ef0a4", light: "90 255 170", bar: "#040f09", muted: "#c3f0d4", sparkles: false, neon: "#3dffa0" },
  // Épicas de dezembro de 2026 (evento Destino, só de pacote; aprovadas pelo dono do app em 2026-11-12): fundo e borda do dono no Gemini, montados por
  // `scripts/cartas/montar-epica.py` (borda opaca POR CIMA do conteúdo, mesmo cobrindo uma coisa ou outra; o brilho do neon entra só como luz).
  // Rajada (feixe vermelho; gema de rubi no topo)
  rajada: { background: "premium-rajada", overflow: "premium-rajada-vaza", statsLift: 8, photoDrop: 6, statsPadX: 4, nameDrop: 4, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#5a6470", "#5a6470", "#ffd0cc"], accent: "#ff6b5e", light: "255 120 110", bar: "#14060a", muted: "#ffc9c4", sparkles: false, neon: "#ff3b30" },
  // Pedreira (rochas; bloco de pedra no topo)
  pedreira: { background: "premium-pedreira", overflow: "premium-pedreira-vaza", statsLift: 8, photoDrop: 6, nameDrop: 4, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#8a5a32", "#8a5a32", "#ffe0bf"], accent: "#f0a35e", light: "255 190 130", bar: "#140b05", muted: "#f5d2b0", sparkles: false, neon: "#ff9a3c" },
  // Cartada (cartas em energia rosa; losango com gema no topo)
  cartada: { background: "premium-cartada", overflow: "premium-cartada-vaza", statsLift: 9, photoDrop: 10, statsPadX: 5, nameDrop: 8, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#5a4a5c", "#5a4a5c", "#ffd6f4"], accent: "#ff7ad9", light: "255 140 230", bar: "#12060f", muted: "#ffc9ee", sparkles: false, neon: "#ff4fd2" },
  // Ímã (redemoinho magnético; ímã de ferradura no topo)
  ima: { background: "premium-ima", overflow: "premium-ima-vaza", statsLift: 9, photoDrop: 10, statsPadX: 5, nameDrop: 8, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#6a3a4a", "#6a3a4a", "#f0d0ff"], accent: "#c78bff", light: "200 140 255", bar: "#10060f", muted: "#e3c8ff", sparkles: false, neon: "#b05cff" },
  // Miragem (campo de força de gelo; cristal hexagonal no topo)
  miragem: { background: "premium-miragem", overflow: "premium-miragem-vaza", statsLift: 6, photoDrop: 6, nameDrop: 4, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#6f8fae", "#6f8fae", "#eaf6ff"], accent: "#9fd8ff", light: "170 225 255", bar: "#06121e", muted: "#cfeaff", sparkles: false, neon: "#7fd0ff" },
  // Elástico (fios azuis esticados; nó de fios no topo)
  elastico: { background: "premium-elastico", overflow: "premium-elastico-vaza", statsLift: 6, photoDrop: 4, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#3f5a80", "#3f5a80", "#d8e8ff"], accent: "#7fb6ff", light: "140 190 255", bar: "#050b18", muted: "#c4dcff", sparkles: false, neon: "#4a9dff" },
  // Labareda (fogo; chama dourada no topo)
  labareda: { background: "premium-labareda", overflow: "premium-labareda-vaza", statsLift: 6, photoDrop: 4, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#4a5466", "#4a5466", "#ffe2b8"], accent: "#ffb04a", light: "255 180 90", bar: "#140904", muted: "#ffd9ad", sparkles: false, neon: "#ff8a1f" },
  // Garra (cortes de garra em metal escuro; presilha de aço no topo)
  garra: { background: "premium-garra", overflow: "premium-garra-vaza", statsLift: 6, photoDrop: 4, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, trim: null, metal: ["#8a8f96", "#8a8f96", "#f5f2e6"], accent: "#f2c94c", light: "255 225 140", bar: "#0a0b0d", muted: "#e6e3d6", sparkles: false, neon: "#f2c94c" },
  // GUARDADAS, fora da Loja (sem entrada em `CARD_SKINS`; para usar: entrada lá, `case` em `skinRoupa` e `SKIN_CLASSES`): Voltagem e Maré.
  // Voltagem (2026-11-05, pedido do dono do app: o estilo da borda da referência dele no nosso retângulo): fio duplo de ouro pálido por dentro e
  // linhas de neon por fora, com o degrau onde se dividem (`prototipos/voltagem.cjs`). Janela `ring` recuada até o fio de dentro.
  voltagem: { background: "premium-voltagem", overflow: "premium-voltagem-vaza", overflowWidth: 1.25, innerBolts: "premium-voltagem-dentro", still: true, window: "ring", windowInset: { x: 7.68, y: 5.48 }, windowRadius: 4.94, artFrame: true, clean: true, trim: null, metal: ["#c9b84e", "#c9b84e", "#fff7b0"], accent: "#f5ee9c", light: "150 230 255", bar: "#03121c", muted: "#bfeeff", sparkles: false, neon: "#36d6ff" },
  // Rubi e Ícone (2026-11-05): a moldura fina da Maré (ouro com gemas por fora) com as gemas na cor da carta (`montar-carta.cjs`, `GEM`), sem o aglomerado vazando.
  // Maré (2026-11-05, teste do kit em camadas: fundo e borda feitos no Gemini com o gabarito 5:7, montados por `prototipos/montar-carta.cjs`):
  // tromba-d'água num mar de enchente e moldura de ouro com a "capa" de lâminas nos cantos de baixo. Janela padrão (`ring`, 64,5 px da caixa).
  mare: { background: "premium-mare", overflow: "premium-mare-vaza", artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, clean: true, trim: null, metal: ["#b8902f", "#b8902f", "#fff1c2"], accent: "#f3d27a", light: "120 230 255", bar: "#031018", muted: "#bfeeff", sparkles: false, neon: "#f3d27a" },
  icone: { background: "premium-marfim", overflow: "premium-marfim-vaza", overflowWidth: 800 / 714, artInset: { x: 1.43, y: 1.02, radius: 7.5 }, window: "ring", windowInset: { x: 1.43, y: 1.02 }, windowRadius: 7.5, contentPad: 6.25, artFrame: true, clean: true, bareName: true, ink: "#2a2113", trim: null, metal: ["#c9a24e", "#c9a24e", "#fff4d6"], accent: "#c9a24e", light: "255 240 200", bar: "#f4efe4", muted: "#6b5a36", sparkles: false, neon: "#ffcf4d" },
  // Aurora (2026-11-04, GUARDADA: o dono gostou mas pediu para não aplicar ainda; não está em `CARD_SKINS`, então não aparece na Loja.
  // Para usar: entrada em `CARD_SKINS` (sugestão nível 14, 1600 CC), `case` em `skinRoupa` e `SKIN_CLASSES`): aurora boreal renderizada pixel a pixel em código (`prototipos/premium-aurora.cjs`), fio de ouro, respiro preto,
  // tubo de neon verde-água por fora e a Estrela Polar no topo; a luz da aurora vaza sobre a moldura. Concêntrica: windowRadius = raio da carta − o aro.
  auroraBoreal: { background: "premium-aurora", drift: "premium-aurora-luz", overflow: "premium-aurora-vaza", window: "ring", windowRadius: 8.1, artFrame: true, clean: true, trim: null, metal: ["#b8902f", "#b8902f", "#f3d27a"], accent: "#e6c677", light: "120 255 200", bar: "#02100f", muted: "#bfffe9", sparkles: false, neon: "#2dffc4" },
  // Halloween 2026 (aprovadas pelo dono do app em 2026-10-29): fundo que conta o evento, sem estrelinhas,
  // e o tubo de neon das premium com enfeite do bicho (azul-luar com garras e presas; vermelho-sangue com morcego e asa).
  lobisomem: { background: "skin-lobisomem", metal: ["#5f6b78", "#5f6b78", "#e2e8ef"], accent: "#e2e8ef", light: "207 226 255", bar: "#03070d", muted: "#cfe2ff", sparkles: false, neon: "#8fd0ff", trim: "lobisomem" },
  // Relâmpago (arte montada pelo dono do app em 2026-10-31): o miolo da arte no fundo e, por fora,
  // a moldura dourada pintada com o raio no topo, cacos e raios, que estalam como trovão
  // (`prototipos/skin-relampago-arte.cjs`).
  // Lenda do Trovão (carta de prestígio): desde 2026-11-02, as três camadas do Gemini (a tempestade azul e laranja, o fio de ouro
  // com o neon em raios e o cristal de rocha com raios por cima da moldura), em `prototipos/skin-lenda-v5.cjs`.
  lenda: { background: "skin-lenda", overflow: "skin-lenda-vaza", overflowWidth: 800 / 714, overflowBolts: "skin-lenda-raios", innerBolts: "skin-lenda-raios-dentro", glow: true, window: "ring", windowRadius: 5.2, artFrame: true, clean: true, bareName: true, metal: ["#7a5a1c", "#7a5a1c", "#f0d48a"], accent: "#e6b85c", light: "190 200 255", bar: "#050816", muted: "#f0dcb0", sparkles: false, neon: "#8fc2ff", trim: null },
  relampago: { background: "premium-relampago", clean: true, overflow: "premium-relampago-vaza", overflowWidth: 774 / 714, overflowBolts: "premium-relampago-raios", innerBolts: "premium-relampago-raios-dentro", artFrame: true, metal: ["#7a5a1c", "#7a5a1c", "#f0d48a"], accent: "#e0b250", light: "255 190 90", bar: "#0b0805", muted: "#f0d9a0", sparkles: false, neon: "#e8b54a", trim: null },
  // Nuvem carregada (Loja, Temporal 2026, aprovada pelo dono do app em 2026-10-31, no lugar do
  // Trovão): nuvens de tempestade pintadas em poucos tons, neon branco, a nuvem com raio no topo,
  // a moldura elétrica em volta da metade de baixo e mini raios estalando nas nuvens.
  nuvem: { background: "premium-nuvem", clean: true, overflow: "premium-nuvem-vaza", overflowWidth: 774 / 714, overflowBolts: "premium-nuvem-raios", innerBolts: "premium-nuvem-raios-dentro", artFrame: true, metal: ["#9aa3b5", "#9aa3b5", "#ffffff"], accent: "#ffffff", light: "220 228 240", bar: "#0b0f17", muted: "#e1e6ef", sparkles: false, neon: "#f2f5fb", trim: null },
  vampiro: { background: "skin-vampiro", metal: ["#6e0f20", "#6e0f20", "#e3384e"], accent: "#e3384e", light: "255 120 140", bar: "#0d0105", muted: "#ffb3bd", sparkles: false, neon: "#ff1f3d", trim: "vampiro" },
  marmore: { background: "marmore", metal: GOLD, accent: "#e9c86a", light: "233 200 106", bar: "#070707", muted: "#e9c86a" },
  estilhacos: { background: "estilhacos", metal: GOLD, accent: "#f2c94c", light: "140 180 255", bar: "#050b20", muted: "#8fb8ff" },
  cristais: { background: "cristais", metal: ["#3b2a7a", "#c9b8ff", "#ffffff"], accent: "#c9b8ff", light: "200 170 255", bar: "#120a2a", muted: "#c9b8ff" },
  prisma: { background: "prisma", metal: ["#7a5512", "#f7d76b", "#fff4c8"], accent: "#f2c94c", light: "255 225 150", bar: "#140c00", muted: "#f2c94c" },
  aurora: { background: "aurora", metal: SILVER, accent: "#dfe6ea", light: "150 230 255", bar: "#071423", muted: "#9fe7ff" },
  holo: { background: "holo", metal: ["#8d7bd8", "#f6d6ff", "#ffffff"], accent: "#ffffff", light: "246 183 255", bar: "#120d24", muted: "#f6b7ff" },
  meiotom: { background: "meiotom", metal: ["#2b2b2b", "#5a5a5a", "#ff8a6b"], accent: "#ff8a6b", light: "255 140 110", bar: "#1e0410", muted: "#ffb199" },
} as const satisfies Record<string, Roupa>;

type RoupaKey = keyof typeof ROUPAS;

/** Cores de um prêmio num tema: moldura, fio interno, detalhes, luz, barras e texto secundário. */
type AwardColors = Omit<Roupa, "background" | "metal" | "matte" | "sparkles" | "neon" | "trim"> & { frame: string; hairline: string; neon: string };

/**
 * Melhor Jogador (aprovado pelo dono do app em 2026-10-29): a taça ao lado do jogador,
 * no metal de cada tema; fora de evento, desde 2026-10-31, o sol art déco gravado em metal
 * escuro atrás da cabeça (`prototipos/craque-sol.cjs`). Destaques (Atacante, Criativo, Defensor, Goleiro, Gol): o ícone
 * do prêmio no mesmo lugar. O tema do mês veste cor e marca d'água (fantasma, taça), como
 * antes (hoje só o Halloween). Moldura em tubo de neon na cor do prêmio, com um traço curto na base (no Halloween, mais uma abóbora acesa no topo) (pedido
 * do dono do app em 2026-10-29). Fundos `premio-<prêmio>-<tema>.webp`, gerados por `prototipos/premios.cjs` (docs).
 */
const CRAQUE_COLORS: Record<CardThemeKey, AwardColors> = {
  default: { frame: "#b8902f", hairline: "#fff1c2", accent: "#e9c86a", light: "255 225 150", bar: "#070605", muted: "#e9c86a", neon: "#ffc83d" },
  halloween: { frame: "#c2560f", hairline: "#ffd29a", accent: "#ffb04a", light: "255 176 74", bar: "#0a0410", muted: "#ffc98a", neon: "#ff8a1f" },
  temporal: { frame: "#d9a400", hairline: "#fff6c8", accent: "#ffe066", light: "190 225 255", bar: "#03040a", muted: "#ffe9a0", neon: "#ffd84a" },
};
const HIGHLIGHT_COLORS: Record<CardThemeKey, AwardColors> = {
  default: { frame: "#2f6fd6", hairline: "#cfe2ff", accent: "#8fc2ff", light: "190 220 255", bar: "#040c22", muted: "#a9cbff", neon: "#36a6ff" },
  halloween: { frame: "#6a2bb0", hairline: "#c9ff8a", accent: "#b6ff5c", light: "210 180 255", bar: "#0d0418", muted: "#c9ff8a", neon: "#9dff3a" },
  temporal: { frame: "#b8902f", hairline: "#fff1c2", accent: "#f3d27a", light: "255 225 150", bar: "#01030a", muted: "#f3d27a", neon: "#ffc83d" },
};
/** Prêmios com arte própria do ícone ao lado (cartas antigas de Fair Play vestem o Gol). */
const HIGHLIGHT_ART = new Set<AwardKind>(["atacante", "criativo", "defensor", "goleiro", "gol", "foguete", "garcom", "drible", "motor"]);

/**
 * Time do Mês: tempestade roxa num cartão de fio de ouro com neon roxo e coroa, no estilo das cartas da Loja (2026-11-04).
 * Não veste o tema do mês (`hasSeasonalTheme`). As cartas de outubro seguem no cristal (`MONTH_ROUPA_CRISTAL`).
 */
const MONTH_ROUPA: Roupa = {
  // Versão de 2026-11-04 (arte do dono do app no Gemini): tempestade roxa com raios e poeira dourada num cartão com fio de ouro, respiro
  // preto e tubo de neon roxo com a coroa (a nuvem que o Gemini pôs no canto saiu), sem animação (`prototipos/premio-time-do-mes-v4.cjs`).
  background: "premium-time-do-mes",
  overflow: "premium-time-do-mes-vaza",
  window: "inner",
  artFrame: true,
  clean: true,
  metal: ["#b8902f", "#b8902f", "#fff1c2"],
  accent: "#f3d27a",
  light: "220 180 255",
  bar: "#0b0318",
  muted: "#f3d27a",
  sparkles: false,
  neon: "#b46bff",
  trim: null,
};

/**
 * Bola Murcha (aprovada pelo dono do app em 2026-10-29): fosca e sem brilho, com a bola murcha
 * ao lado do jogador. Desde 2026-10-31, o alagamento: parede escura escorrendo e água barrenta
 * subindo até a metade, com a bola boiando na linha da água (`prototipos/murcha-alagamento.cjs`). Moldura em neon apagado, sem enfeite
 * (pedido do dono do app em 2026-10-29: a lâmpada que quase não acende). Igual o ano todo (não veste o tema).
 * Cartas antigas de Fominha vestem a mesma. Fundo `premio-bola-murcha.webp` (`prototipos/murcha.cjs`).
 */
const FLOP_ROUPA: Roupa = {
  background: "premio-bola-murcha",
  metal: ["#4f4a3a", "#4f4a3a", "rgb(168 181 160 / 0.3)"],
  accent: "#8f9a86",
  light: "168 181 160",
  bar: "#18110b",
  muted: "#a8b5a0",
  matte: true,
  neon: "#8f9a78",
  neonDim: true,
  trim: null,
};

/** Desenhos de antes de 2026-10-31, só para as cartas já ganhas (`prototipos/mes-cristal.cjs`, `murcha.cjs`). */
// O desenho antigo (cristal roxo com a coroa) das cartas ganhas em outubro: só o fundo e o enfeite, sem a arte de fora.
const MONTH_ROUPA_CRISTAL: Roupa = {
  ...MONTH_ROUPA,
  background: "premio-time-do-mes-cristal",
  trim: "mes",
  overflow: undefined,
  overflowWidth: undefined,
  overflowBolts: undefined,
  innerBolts: undefined,
  still: false,
  window: undefined,
  windowRadius: undefined,
  statsInset: undefined,
  artFrame: false,
  clean: false,
};
const FLOP_ROUPA_BRONZE: Roupa = { ...FLOP_ROUPA, background: "premio-bola-murcha-bronze" };

/** Fora do jogo (só cartas antigas): roupas provisórias. */
const PROVISIONAL_AWARD_ROUPAS: Partial<Record<AwardDesignKind, Roupa>> = {
  // Time da Semana (saiu do jogo em 2026-10-29): neon dourado, como os outros prêmios.
  time_da_semana: { ...ROUPAS.estilhacos, neon: "#ffd24d", trim: null },
};

/**
 * Melhor Jogador fora de evento (2026-11-02, arte do dono do app em três camadas do Gemini): o sol com circuitos dourados, o neon
 * dourado com fogo em volta e uma coroa em chamas que passa por cima da moldura pela direita (`prototipos/premio-craque-fogo.cjs`).
 * Neon e coroa vêm da arte (`artFrame`); sem sombras por cima (`clean`) e o nome direto sobre a arte (`bareName`), para a estrela do topo aparecer.
 */
const CRAQUE_FOGO: Roupa = {
  background: "premio-craque-fogo",
  overflow: "premio-craque-fogo-vaza",
  overflowWidth: 824 / 714,
  window: "inner",
  artFrame: true,
  clean: true,
  bareName: true,
  metal: ["#b8902f", "#b8902f", "#fff1c2"],
  accent: "#ffc14d",
  light: "255 190 90",
  bar: "#0a0604",
  muted: "#ffd9a0",
  sparkles: false,
  neon: "#ffb020",
  trim: null,
};

/**
 * Destaques fora do Halloween (2026-11-04, arte do dono do app no Gemini): uma tempestade no mar fotorrealista até o tubo de neon ciano,
 * com respingos de água por cima e gotas escorrendo em código (`prototipos/destaques-mar.cjs`). Um fundo só para todos; o que distingue
 * o prêmio é a faixa com o nome.
 */
const HIGHLIGHT_AGUA: Roupa = {
  // Versão "mar" (2026-11-04): tempestade fotorrealista até o tubo de neon ciano, com a moldura e os respingos por cima e gotas
  // escorrendo em código (`prototipos/destaques-mar.cjs`).
  background: "premio-destaque-mar",
  overflow: "premio-destaque-mar-vaza",
  drops: true,
  window: "ring",
  windowRadius: 7,
  statsInset: { bottom: 3.2, side: 3.5 },
  artFrame: true,
  clean: true,
  metal: ["#2f6fd6", "#2f6fd6", "#cfe2ff"],
  accent: "#8fe4ff",
  light: "190 220 255",
  bar: "#040c22",
  muted: "#a9e6ff",
  sparkles: false,
  neon: "#36d4ff",
  trim: null,
};

/**
 * Campeão do Mês (2026-11-02, arte do dono do app no Gemini; `prototipos/campeao-mes.cjs`): tempestade azul e laranja num
 * cartão de fio de ouro fino com o neon azul por fora, o louro de platina no topo e um aglomerado de cristais com
 * nuvem e raios que passa por cima da moldura pela direita. Janela `ring` (o conteúdo vai até o lado de dentro do ouro).
 */
const CAMPEAO_MES: Roupa = {
  background: "campeao-mes",
  overflow: "campeao-mes-vaza",
  overflowBolts: "campeao-mes-raios",
  innerBolts: "campeao-mes-raios-dentro",
  glow: true,
  window: "ring",
  windowInset: { x: 6.7, y: 4.8 },
  windowRadius: 7.6,
  artFrame: true,
  clean: true,
  metal: ["#2f6fd6", "#2f6fd6", "#cfe2ff"],
  accent: "#ffd277",
  light: "190 215 255",
  bar: "#050b24",
  muted: "#bcd4ff",
  sparkles: false,
  neon: "#2f8dff",
  trim: null,
};

/**
 * Temas cujas cartas já foram ganhas com o desenho próprio do evento: ficam de colecionador (Halloween e Toró).
 * Dos eventos seguintes em diante, os prêmios individuais vestem a carta-base (decisão do dono do app em 2026-11-09).
 */
const LEGACY_AWARD_THEMES: readonly CardThemeKey[] = ["halloween", "temporal"];

function awardRoupa(kind: AwardKind, theme: CardThemeKey): Roupa {
  const design = awardDesignKind(kind);
  // Carta-base dos prêmios individuais: o mesmo desenho em todos (muda só o ícone do medalhão); a Bola Murcha tem o seu, em destaque negativo.
  if (!LEGACY_AWARD_THEMES.includes(theme) && design !== "time_da_semana") {
    return design === "bola_murcha" ? ROUPAS.natalMurcha : ROUPAS.natalCraque;
  }
  // Time do Mês e Bola Murcha não vestem o tema do mês, mas o desenho mudou em 2026-10-31: as cartas
  // ganhas antes (todas gravadas com o tema do Halloween) são de colecionador e ficam com o desenho
  // da época (pedido do dono do app): o cristal com a coroa e o bronze oxidado.
  if (design === "campeao_do_mes") return CAMPEAO_MES;
  if (design === "jogador_do_mes") return theme === "halloween" ? MONTH_ROUPA_CRISTAL : MONTH_ROUPA;
  if (design === "bola_murcha") return theme === "halloween" ? FLOP_ROUPA_BRONZE : FLOP_ROUPA;
  const provisional = PROVISIONAL_AWARD_ROUPAS[design];
  if (provisional) return { ...provisional, trim: theme === "halloween" ? "abobora" : "destaque" };
  const isCraque = design === "craque";
  if (isCraque && theme !== "halloween") return CRAQUE_FOGO;
  // No Toró, Melhor Jogador e destaques usam as cartas novas dos prêmios (o sol art déco e a água
  // com a nuvem chovendo, as mesmas de fora de evento), no lugar da taça e dos raios dourados
  // (pedido do dono do app em 2026-10-31).
  const designTheme: CardThemeKey = theme === "temporal" ? "default" : theme;
  if (!isCraque && designTheme !== "halloween") return HIGHLIGHT_AGUA;
  const colors = (isCraque ? CRAQUE_COLORS : HIGHLIGHT_COLORS)[designTheme];
  const art = isCraque ? "craque" : HIGHLIGHT_ART.has(kind) ? kind : "gol";
  return {
    background: `premio-${art}-${designTheme}`,
    metal: [colors.frame, colors.frame, colors.hairline],
    accent: colors.accent,
    light: colors.light,
    bar: colors.bar,
    muted: colors.muted,
    sparkles: false,
    neon: colors.neon,
    trim: isCraque ? "craque" : "abobora",
  };
}

/**
 * Roupa de cada skin da Loja (premium e Halloween, aprovadas pelo dono do app).
 */
function skinRoupa(skin: CardSkinKey): RoupaKey {
  switch (skin) {
    case "esmeralda": return "esmeralda";
    case "safira": return "safira";
    case "ametista": return "ametista";
    case "rubi": return "rubi";
    case "icone": return "icone";
    case "destino": return "destino";
    case "diluvio": return "diluvio";
    case "aguaceiro": return "aguaceiro";
    case "chuvavioleta": return "chuvavioleta";
    case "nublado": return "nublado";
    case "neblina": return "neblina";
    case "chuvaesmeralda": return "chuvaesmeralda";
    case "chuvarubi": return "chuvarubi";
    case "cerracao": return "cerracao";
    case "crepusculo": return "crepusculo";
    case "tormenta": return "tormenta";
    case "embuste": return "embuste";
    case "rajada": return "rajada";
    case "pedreira": return "pedreira";
    case "cartada": return "cartada";
    case "ima": return "ima";
    case "miragem": return "miragem";
    case "elastico": return "elastico";
    case "labareda": return "labareda";
    case "garra": return "garra";
    case "lobisomem": return "lobisomem";
    case "nuvem": return "nuvem";
    case "relampago": return "relampago";
    case "lenda": return "lenda";
    case "vampiro": return "vampiro";
    default: return "padrao";
  }
}

/** Selo da patente: cor e insígnia (divisas, estrela, coroa). */
const RANK_CREST: Record<CardRank, string> = {
  peneira: "bg-[linear-gradient(160deg,#e9ece9,#a9b0aa)]",
  base: "bg-[linear-gradient(160deg,#d9f2e3,#5fa77b)]",
  profissional: "bg-[linear-gradient(160deg,#e4ff9e,#8fbf1f)]",
  selecao: "bg-[linear-gradient(160deg,#fbe39a,#c9971f)]",
  lenda: "bg-[linear-gradient(160deg,#ffffff,#f6b7ff_40%,#9fe7ff_75%,#fff4b0)]",
};

/** Insígnia da patente (divisas, estrela, coroa); também usada fora da carta (slide de patentes). */
export function RankInsignia({ rank, className }: { rank: CardRank; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 30 18" className={className ?? "mt-[0.6cqw] h-[5.6cqw] w-[9.5cqw]"}>
      {rank === "peneira" && <path d="M3 9 15 3l12 6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeDasharray="3 2.4" />}
      {rank === "base" && <path d="M3 11 15 5l12 6" fill="none" stroke="currentColor" strokeWidth={3.2} />}
      {rank === "profissional" && <path d="M3 8 15 2l12 6M3 15 15 9l12 6" fill="none" stroke="currentColor" strokeWidth={3} />}
      {rank === "selecao" && (
        <>
          <path d="M15 1.5l2 4.2 4.6.6-3.4 3.1.9 4.5L15 11.7l-4.1 2.2.9-4.5-3.4-3.1 4.6-.6z" fill="currentColor" />
          <path d="M2 16h7M21 16h7" stroke="currentColor" strokeWidth={2.4} />
        </>
      )}
      {rank === "lenda" && <path d="M4 15 2 4l7 5 6-7 6 7 7-5-2 11z" fill="currentColor" />}
    </svg>
  );
}

/** Estrelinhas e pontos de luz na frente do jogador (posição em % da carta). */
const SPARKS = [
  { left: "14%", top: "30%", delay: "0s" },
  { left: "80%", top: "24%", delay: "0.6s" },
  { left: "22%", top: "56%", delay: "1.1s" },
  { left: "86%", top: "50%", delay: "0.3s" },
] as const;

/**
 * Cantos da janela de dentro: arredondados como os de fora (pedido do dono do app em
 * 2026-10-29; os chanfrados destoavam). Raio de fora (9cqw) menos a moldura (2,6cqw).
 */
const INNER_CORNERS = "rounded-[6.4cqw]";

/**
 * Moldura fina em metal polido (pedido do dono do app em 2026-10-29), em todas as cartas:
 * faixas de reflexo na diagonal, tiradas da cor da moldura da roupa (`--cc-m2`) misturada
 * com preto e branco. Só degradê, sem `filter` (iPhone).
 */
const METAL_FRAME =
  "shadow-[inset_0_0_0_0.3cqw_rgb(0_0_0/0.45)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--cc-m2),black_45%),var(--cc-m2)_14%,color-mix(in_oklab,var(--cc-m2),white_60%)_28%,var(--cc-m2)_40%,color-mix(in_oklab,var(--cc-m2),black_40%)_54%,var(--cc-m2)_68%,color-mix(in_oklab,var(--cc-m2),white_70%)_82%,color-mix(in_oklab,var(--cc-m2),black_50%))]";

/**
 * Tubo de neon das skins premium (aprovado pelo dono do app em 2026-10-29): moldura mais
 * fina, centro quase branco e a cor do neon (`--cc-neon`) só no brilho em volta, por fora
 * (`NEON_HALO`) e por dentro (`NEON_INNER_GLOW`). Só degradê e sombra, sem `filter` (iPhone).
 */
const NEON_FRAME =
  "bg-[linear-gradient(160deg,#fff,color-mix(in_oklab,var(--cc-neon),white_55%)_30%,color-mix(in_oklab,var(--cc-neon),white_25%)_55%,color-mix(in_oklab,var(--cc-neon),white_60%)_80%,#fff)]";
const NEON_INNER_GLOW =
  "shadow-[inset_0_0_0.8cqw_var(--cc-neon),inset_0_0_3.5cqw_color-mix(in_oklab,var(--cc-neon),transparent_40%)]";
/** Neon apagado (Bola Murcha): o tubo sem o centro branco e um brilho fraco em volta. */
const NEON_FRAME_DIM =
  "bg-[linear-gradient(160deg,color-mix(in_oklab,var(--cc-neon),white_30%),var(--cc-neon)_30%,color-mix(in_oklab,var(--cc-neon),black_30%)_55%,var(--cc-neon)_80%,color-mix(in_oklab,var(--cc-neon),white_20%))]";
const NEON_INNER_GLOW_DIM = "shadow-[inset_0_0_1.6cqw_color-mix(in_oklab,var(--cc-neon),transparent_70%)]";
/** Janela das cartas de neon: a moldura é mais fina (1,7% da largura). */
const NEON_WINDOW = "inset-x-[1.7%] inset-y-[1.21%] rounded-[7.3cqw]";
/** Janela do conteúdo das cartas com a borda desenhada na arte (`window: "inner"`): por dentro do fio fino de dentro dela. */
/** Janela até o lado de dentro do fio de ouro da arte (`window: "ring"`): sem faixa de arte entre o conteúdo e o fio. */
const RING_WINDOW = "inset-x-[0.9%] inset-y-[0.65%]";
const INNER_WINDOW = "inset-x-[5.8%] inset-y-[4.2%] rounded-[3.6cqw]";
const METAL_WINDOW = cn("inset-x-[2.6%] inset-y-[1.86%]", INNER_CORNERS);

/**
 * Enfeites de neon por fora da carta (aprovados pelo dono do app em 2026-10-29). Coordenadas
 * da carta (100 × 140); `side` é o lado direito, espelhado para a esquerda, e `center` fica no meio.
 * - `base` (skins premium, o "C · Abraço da base"): dois fios que começam no meio das
 *   laterais, abraçam a base e fecham numa ponta no centro.
 * - `vampiro`: um morcego no topo e a base recortada como a borda de uma asa.
 * - `lobisomem`: três arranhões de garra nas laterais e a base com presas.
 * - `craque` (Melhor Jogador, aprovado pelo dono do app em 2026-10-29): um fio só abraçando
 *   a base (dois ficaria igual às premium) e uma estrela acesa no topo, em qualquer tema.
 * - `destaque` (os outros prêmios, aprovado pelo dono do app em 2026-10-29): um traço curto
 *   no meio da base com a pontinha para baixo; `abobora`, no Halloween, o mesmo traço e
 *   uma abóbora acesa no topo, no lugar da teia.
 * - `teia` (sem uso desde a abóbora; fica para eventos futuros), pedido do dono do app em 2026-10-29): uma teia
 *   pequena em cada canto de cima, mais discreta (`subtle`) que os enfeites das skins.
 */
const NEON_TRIM_INNER = "M104.6 80 V131 Q104.6 144.6 93 144.6";

export type NeonTrimShape = {
  side: { d: string; width: number }[];
  center?: string;
  /** Fios do enfeite do meio (sem preencher), no mesmo neon dos outros fios. */
  centerLines?: string;
  subtle?: boolean;
};

const NEON_TRIMS = {
  base: {
    side: [
      { d: "M102.4 64 V133 Q102.4 142.4 93 142.4 H58 L50 146", width: 0.55 },
      { d: `${NEON_TRIM_INNER} H64`, width: 0.7 },
    ],
  },
  vampiro: {
    side: [
      { d: "M102.4 64 V133 Q102.4 142.4 93 142.4 Q88.5 146 84 142.4 Q79.5 146 75 142.4 Q70.5 146 66 142.4 H58 L50 146", width: 0.55 },
      { d: NEON_TRIM_INNER, width: 0.7 },
    ],
    center:
      "M41 -7 Q45 -10 47.6 -7 L49 -9.4 L50 -8 L51 -9.4 L52.4 -7 Q55 -10 59 -7 Q56.2 -6 56.4 -3.4 Q53.6 -4.6 52 -3 Q51 -2 50 -1.4 Q49 -2 48 -3 Q46.4 -4.6 43.6 -3.4 Q43.8 -6 41 -7 Z",
  },
  lobisomem: {
    side: [
      { d: "M99 26 L109 38", width: 0.7 },
      { d: "M99 32.5 L108.4 43.4", width: 0.58 },
      { d: "M99 39 L107.6 48.6", width: 0.46 },
      { d: "M102.4 64 V133 Q102.4 142.4 93 142.4 H82 L79.5 146.6 L77 142.4 H68 L65.5 146 L63 142.4 H58 L50 146", width: 0.55 },
      { d: NEON_TRIM_INNER, width: 0.7 },
    ],
  },
  craque: {
    side: [
      { d: "M102.4 64 V133 Q102.4 142.4 93 142.4 H58 L50 146", width: 0.6 },
    ],
    center: "M50.00 -9.20 L51.06 -6.46 L53.99 -6.30 L51.71 -4.44 L52.47 -1.60 L50.00 -3.20 L47.53 -1.60 L48.29 -4.44 L46.01 -6.30 L48.94 -6.46 Z",
  },
  // Time do Mês das cartas de outubro (continuam com ele; as novas usam a arte do dono do app):
  // o abraço da base das premium e a coroa no topo, em neon.
  mes: {
    side: [
      { d: "M102.4 64 V133 Q102.4 142.4 93 142.4 H58 L50 146", width: 0.55 },
      { d: `${NEON_TRIM_INNER} H64`, width: 0.7 },
    ],
    // Coroa no traço do ícone que o dono do app mandou: zigue-zague cruzado, bolinhas nas
    // pontas e o losango em cima, no mesmo neon roxo da carta.
    centerLines: "M42.06 -8.44 L44.38 -1.78 L46.73 -6.82 L48.41 -1.78 L50.09 -10.42 L51.77 -1.78 L53.53 -6.82 L55.81 -1.78 L58.13 -8.44 M42.06 -8.44 L48.41 -1.78 M58.13 -8.44 L51.77 -1.78",
    center: "M50.09 -14.13 L50.95 -12.51 L50.09 -10.96 L49.23 -12.51 Z M41.43 -9.34 A0.64 0.64 0 1 0 42.70 -9.34 A0.64 0.64 0 1 0 41.43 -9.34 Z M46.28 -7.43 A0.45 0.45 0 1 0 47.18 -7.43 A0.45 0.45 0 1 0 46.28 -7.43 Z M53.08 -7.43 A0.45 0.45 0 1 0 53.98 -7.43 A0.45 0.45 0 1 0 53.08 -7.43 Z M57.42 -9.34 A0.64 0.64 0 1 0 58.69 -9.34 A0.64 0.64 0 1 0 57.42 -9.34 Z",
  },
  destaque: {
    side: [{ d: "M72 142.4 H57 L50 145.6", width: 0.55 }],
  },
  abobora: {
    side: [{ d: "M72 142.4 H57 L50 145.6", width: 0.55 }],
    center: "M45.4 -4.4 A4.6 3.6 0 1 0 54.6 -4.4 A4.6 3.6 0 1 0 45.4 -4.4 Z M47.5 -5.8 L49 -5.8 L48.25 -4.5 Z M51 -5.8 L52.5 -5.8 L51.75 -4.5 Z M47.4 -3.4 Q50 -1.6 52.6 -3.4 Q50 -2.5 47.4 -3.4 Z M49.4 -7.8 L50.6 -7.8 L51.3 -9.8 L50.2 -9.8 Z",
  },


  teia: {
    subtle: true,
    side: [
      { d: "M104.0 -5.0 L89.0 -5.0 M104.1 -4.6 L90.2 1.1 M104.3 -4.3 L93.7 6.3 M104.6 -4.1 L98.9 9.8 M105.0 -4.0 L105.0 11.0", width: 0.3 },
      { d: "M99.0 -5.0 Q99.9 -4.0 99.5 -2.7 Q100.7 -2.1 100.8 -0.8 Q102.1 -0.7 102.7 0.5 Q104.0 0.1 105.0 1.0", width: 0.3 },
      { d: "M94.0 -5.0 Q95.7 -3.2 94.8 -0.8 Q97.1 0.3 97.2 2.8 Q99.7 2.9 100.8 5.2 Q103.2 4.3 105.0 6.0", width: 0.3 },
    ],
  },
} satisfies Record<string, NeonTrimShape>;

export type NeonTrimKind = keyof typeof NEON_TRIMS;

/** Desenho do enfeite (para o story em canvas, `lib/story-canvas.ts`). */
export function getNeonTrimShape(kind: NeonTrimKind): NeonTrimShape {
  return NEON_TRIMS[kind];
}

/** Fio de neon: halo largo, halo médio e o fio (no discreto, halo menor e mais fraco). */
function NeonLine({ d, width, subtle }: { d: string; width: number; subtle?: boolean }) {
  return (
    <>
      <path d={d} strokeWidth={subtle ? 2.4 : 4.4} opacity={subtle ? 0.14 : 0.18} />
      <path d={d} strokeWidth={subtle ? 1.2 : 2.2} opacity={subtle ? 0.3 : 0.45} />
      <path d={d} strokeWidth={width * 1.6} opacity={subtle ? 0.7 : 0.9} />
      {/* Miolo quase branco, como o tubo de neon da moldura (pedido do dono do app em 2026-10-29). */}
      <path d={d} strokeWidth={width * 0.6} stroke={NEON_CORE} />
    </>
  );
}

/** Cor do miolo aceso dos enfeites: a cor do neon puxada para o branco. */
const NEON_CORE = "color-mix(in oklab, var(--cc-neon), white 65%)";

/**
 * Espelha um traço (comandos absolutos M, L, H, V, Q, A, Z) na vertical do meio da carta
 * (x → 100 − x). Sem `transform` no SVG: a captura do story no iPhone (`modern-screenshot`)
 * desenhava o lado espelhado como um bloco de cor ao lado da carta.
 */
export function mirrorPath(d: string): string {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const out: string[] = [];
  let command = "";
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (/[A-Za-z]/.test(token)) {
      command = token;
      out.push(token);
      index += 1;
      if (command === "Z" || command === "z") continue;
    }
    const take = (count: number) => tokens.slice(index, index + count).map(Number);
    if (command === "H") {
      out.push(String(100 - take(1)[0]));
      index += 1;
    } else if (command === "V") {
      out.push(String(take(1)[0]));
      index += 1;
    } else if (command === "M" || command === "L") {
      const [x, y] = take(2);
      out.push(`${100 - x} ${y}`);
      index += 2;
    } else if (command === "Q") {
      const [x1, y1, x, y] = take(4);
      out.push(`${100 - x1} ${y1} ${100 - x} ${y}`);
      index += 4;
    } else if (command === "A") {
      const [rx, ry, rotation, large, sweep, x, y] = take(7);
      out.push(`${rx} ${ry} ${-rotation} ${large} ${sweep ? 0 : 1} ${100 - x} ${y}`);
      index += 7;
    } else {
      index += 1;
    }
  }
  return out.join(" ");
}

/** Contorno da carta (100 × 140, cantos de 9 × 9,1, como `rounded-[9%/6.5%]`). */
const CARD_OUTLINE = { x: 0, y: 0, width: 100, height: 140, rx: 9, ry: 9.1 } as const;

/**
 * Brilho e enfeite das cartas de neon, num SVG ao lado da carta (na caixa dela, com a
 * sobra de `TRIMMED_CARD`). Brilho em traços do contorno, não `box-shadow`: na captura do
 * story no iPhone (`modern-screenshot`), a sombra virava um bloco de cor ao lado da carta e
 * o que passava da carta era cortado (pedido do dono do app em 2026-10-29).
 */
function NeonOverlay({ kind, isDim }: { kind: NeonTrimKind | null; isDim: boolean }) {
  const trim: NeonTrimShape | null = kind ? NEON_TRIMS[kind] : null;
  return (
    <svg
      aria-hidden
      // A carta ocupa os 84% do meio da caixa: em unidades da carta, a caixa vai de
      // −9,52 a 109,52 na largura e de −13,33 a 153,33 na altura.
      viewBox="-9.524 -13.333 119.048 166.667"
      preserveAspectRatio="none"
      fill="none"
      stroke="var(--cc-neon)"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute inset-0 z-[10] size-full"
    >
      <g>
        {(isDim ? NEON_HALO_DIM_STROKES : NEON_HALO_STROKES).map((stroke) => (
          <rect key={stroke.width} {...CARD_OUTLINE} strokeWidth={stroke.width} opacity={stroke.opacity} />
        ))}
      </g>
      {trim && (
        <>
          <g>
            {trim.side.map((line) => (
              <NeonLine key={line.d} {...line} subtle={trim.subtle} />
            ))}
          </g>
          <g>
            {trim.side.map((line) => (
              <NeonLine key={`espelho-${line.d}`} {...line} d={mirrorPath(line.d)} subtle={trim.subtle} />
            ))}
          </g>
          {trim.centerLines && <NeonLine d={trim.centerLines} width={0.5} />}
          {trim.center && (
            <>
              <path d={trim.center} strokeWidth={4} opacity={0.2} />
              <path d={trim.center} strokeWidth={1.8} opacity={0.45} />
              <path d={trim.center} fill={NEON_CORE} fillRule="evenodd" strokeWidth={0.5} />
            </>
          )}
        </>
      )}
    </svg>
  );
}

/** Brilho em volta da carta: traços do contorno, do mais largo e fraco ao mais justo. */
export const NEON_HALO_STROKES = [
  { width: 22, opacity: 0.03 },
  { width: 18, opacity: 0.03 },
  { width: 14, opacity: 0.04 },
  { width: 10, opacity: 0.06 },
  { width: 7, opacity: 0.08 },
  { width: 4.5, opacity: 0.12 },
  { width: 2.4, opacity: 0.25 },
  { width: 1, opacity: 0.6 },
] as const;
export const NEON_HALO_DIM_STROKES = [
  { width: 8, opacity: 0.05 },
  { width: 3, opacity: 0.12 },
  { width: 1, opacity: 0.35 },
] as const;

/**
 * Carta de neon (pedido do dono do app em 2026-10-29: o morcego encostava na margem):
 * a carta ocupa os 84% do meio da caixa e o enfeite e o brilho, a sobra em volta. Vale
 * para toda carta de neon, com ou sem enfeite, para os prêmios terem o mesmo tamanho
 * lado a lado (a Bola Murcha, sem enfeite, ficava maior que as outras).
 */
const TRIMMED_CARD = "absolute inset-[8%]";

/**
 * Sombra atrás da foto ("A · Halo escuro", aprovada pelo dono do app em 2026-10-29): escura,
 * logo atrás da cabeça e dos ombros. Em SVG (degradê `PHOTO_SHADOW_GRADIENT_ID` de
 * `PlayerCardDefs`), não em `radial-gradient` do CSS: na captura do story no iPhone, o CSS
 * virava uma camada preta por cima do fundo e do nome. Coordenadas da carta (100 × 140).
 */
function PhotoShadow() {
  const fill = `url(#${PHOTO_SHADOW_GRADIENT_ID})`;
  return (
    <svg aria-hidden viewBox="0 0 100 140" preserveAspectRatio="none" className="absolute inset-0 z-[2] size-full">
      <ellipse cx={50} cy={56} rx={46} ry={42} fill={fill} />
      <ellipse cx={50} cy={115} rx={70} ry={42} fill={fill} />
    </svg>
  );
}

/**
 * Enquadramento da foto (prévia):
 * - `atual`: inteira, presa acima do rodapé, as laterais somem nas bordas.
 * - `largura`: maior, com as laterais apagadas do recorte para fora da carta, e desce por
 *   baixo das estatísticas.
 * - `perto`: igual, mais perto (começa logo abaixo do nome).
 * - `fadeCurto`: largura toda e o peito aparece até quase as estatísticas.
 */
export type PhotoFrame = "atual" | "largura" | "perto" | "fadeCurto";
const PHOTO_FRAMES: Record<PhotoFrame, { box: string; image: string; fade: string }> = {
  atual: { box: "-inset-x-[20%] bottom-[12%] h-[85%]", image: "object-contain object-bottom", fade: "h-[20%]" },
  largura: { box: "-inset-x-[25%] top-[12%] -bottom-[5%]", image: "object-cover object-top", fade: "h-[20%]" },
  perto: { box: "-inset-x-[38%] top-[9%] -bottom-[18%]", image: "object-cover object-top", fade: "h-[20%]" },
  fadeCurto: { box: "-inset-x-[25%] top-[12%] -bottom-[5%]", image: "object-cover object-top", fade: "h-[9%]" },
};

const EMPTY_VALUE = "–";


export type CanchaCardAward = {
  kind: AwardKind;
  theme: CardThemeKey;
  round?: number;
};

type CanchaCardProps = {
  /** Design puro (vitrine da abertura de pacote): só fundo, borda, arte que vaza e itens flutuantes; sem nome, selo, faixa nem estatísticas. */
  pure?: boolean;
  player: Player;
  award?: CanchaCardAward;
  /** Largura (e outras classes) vinda do `PlayerCard`. */
  className?: string;
  /** `sizes` da foto. */
  photoSizes: string;
  /** Prévia (temporária): enquadramento da foto. */
  photoFrame?: PhotoFrame;
};

/**
 * Tudo o que a carta mostra, calculado num lugar só: a `CanchaCard` e o story em canvas
 * (`lib/story-canvas.ts`) usam a mesma conta.
 */
export function getCanchaCardLook(player: Player, award?: CanchaCardAward) {
  const roupa: Roupa = award
    ? awardRoupa(award.kind, award.theme)
    : ROUPAS[player.cardSkin ? skinRoupa(player.cardSkin) : "padrao"];
  const rank = getCardRank(player.ovr);
  const stats = getCardStats(player);
  const band = award
    ? `${AWARD_LABELS[award.kind].title}${award.round === undefined ? "" : ` · R${award.round}`}`
    : CARD_RANK_LABELS[rank];
  const subtitle = !award && typeof player.level === "number" ? `${player.position} · Nível ${player.level}` : player.position;
  const trim: NeonTrimKind | null = roupa.neon !== undefined && roupa.trim !== null ? (roupa.trim ?? "base") : null;
  return { roupa, rank, stats, band, subtitle, trim };
}

/** Medalhão com o ícone do prêmio, abaixo do selo de OVR (só nas cartas-base dos prêmios; some nas miniaturas). */
function AwardMedal({ kind, medal }: { kind: AwardKind; medal: NonNullable<Roupa["awardMedal"]> }) {
  const Icon = AWARD_ICONS[kind];
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-[27%] right-[7.5%] z-[14] grid size-[17%] place-items-center rounded-full border-2 shadow-lg @max-[150px]:hidden"
      style={{ backgroundColor: medal.bg, borderColor: medal.border, color: medal.fg }}
    >
      <Icon className="size-[58%]" strokeWidth={2.4} />
    </span>
  );
}

function FloaterPieces({ items, layer }: { items: readonly Floater[]; layer: "back" | "front" }) {
  return items
    .filter((item) => item.layer === layer)
    .map((item) => (
      <span
        key={`${item.src}-${item.x}-${item.y}`}
        aria-hidden
        className={cn("pointer-events-none absolute aspect-square -translate-1/2 @max-[150px]:hidden", layer === "back" ? "z-0" : "z-[13]")}
        style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, rotate: item.rot ? `${item.rot}deg` : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- arte decorativa pequena, sem otimizar */}
        <img
          alt=""
          src={`/cartas/fundos/${item.src}.webp`}
          className="size-full select-none motion-reduce:animate-none"
          style={{ animation: `cc-${item.anim} ${item.dur}s ${item.anim === "spin" || item.anim === "thunder-strike" ? "linear" : "ease-in-out"} ${item.delay ?? 0}s infinite` }}
        />
      </span>
    ));
}

export function CanchaCard({ player, award, className, photoSizes, photoFrame = "atual", pure = false }: CanchaCardProps) {
  const { roupa, rank, stats, band, subtitle } = getCanchaCardLook(player, award);
  const lift = roupa.statsLift ?? 0;
  const frame = PHOTO_FRAMES[roupa.photoFrame ?? photoFrame];

  const vars = {
    "--cc-m1": roupa.metal[0],
    "--cc-m2": roupa.metal[1],
    "--cc-m3": roupa.metal[2],
    "--cc-accent": roupa.accent,
    "--cc-light": roupa.light,
    "--cc-bar": roupa.bar,
    "--cc-muted": roupa.muted,
    "--cc-neon": roupa.neon,
    ...(roupa.ink ? { color: roupa.ink } : null),
  } as CSSProperties;
  const isNeon = roupa.neon !== undefined;
  const hasTrim = isNeon && roupa.trim !== null;

  const card = (
    <article
      aria-label={`${player.nickname}, ${player.position}, OVR ${player.ovr ?? "sem avaliação"}, ${band}`}
      style={vars}
      className={cn(
        "@container relative isolate aspect-[5/7] shrink-0 rounded-[9%/6.5%] text-left font-display text-white select-none",
        roupa.artFrame ? "" : isNeon ? (roupa.neonDim ? NEON_FRAME_DIM : NEON_FRAME) : METAL_FRAME,
        isNeon ? TRIMMED_CARD : className,
      )}
    >
      {roupa.artInset && (
        <div
          aria-hidden
          className="absolute overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: `url(/cartas/fundos/${roupa.background}.webp)`, left: `${roupa.artInset.x}%`, right: `${roupa.artInset.x}%`, top: `${roupa.artInset.y}%`, bottom: `${roupa.artInset.y}%`, borderRadius: `${roupa.artInset.radius}cqw` }}
        />
      )}
      <div
        className={cn("absolute overflow-hidden bg-cover bg-center", roupa.window === "inner" ? INNER_WINDOW : roupa.window === "ring" ? RING_WINDOW : isNeon ? NEON_WINDOW : METAL_WINDOW)}
        style={{ ...(roupa.artInset ? null : { backgroundImage: `url(/cartas/fundos/${roupa.background}.webp)` }), ...(roupa.window === "ring" ? { borderRadius: `${roupa.windowRadius ?? 8}cqw` } : null), ...(roupa.window === "ring" && roupa.windowInset ? { left: `${roupa.windowInset.x}%`, right: `${roupa.windowInset.x}%`, top: `${roupa.windowInset.y}%`, bottom: `${roupa.windowInset.y}%` } : null) }}
      >
        {roupa.drift && (
          // eslint-disable-next-line @next/next/no-img-element -- arte decorativa, sem otimizar
          <img aria-hidden alt="" src={`/cartas/fundos/${roupa.drift}.webp`} className="pointer-events-none absolute inset-y-0 -left-[6%] z-[2] h-full w-[112%] max-w-none animate-[cc-aurora-drift_17s_ease-in-out_infinite_alternate] opacity-40 select-none motion-reduce:animate-none" />
        )}
        {roupa.innerBolts && (
          // eslint-disable-next-line @next/next/no-img-element -- arte decorativa do tamanho da janela, sem otimizar
          <img aria-hidden alt="" src={`/cartas/fundos/${roupa.innerBolts}.webp`} className={cn("pointer-events-none absolute inset-0 z-[2] size-full select-none motion-reduce:animate-none", !roupa.still && (roupa.glow ? "animate-[cc-thunder-glow_3.6s_ease-out_infinite]" : "animate-[cc-thunder-flash_3.2s_linear_infinite]"))} />
        )}
        {/* Clarão atrás da cabeça, na cor da luz da roupa. */}
        {!roupa.matte && !pure && (
          <div aria-hidden className="absolute inset-0 z-[2] bg-[radial-gradient(34%_24%_at_50%_30%,rgb(var(--cc-light)/0.55),transparent_75%)]" />
        )}

        {!pure && (
        <div
          className={cn(
            "absolute inset-x-0 top-0 z-[3] flex h-[16%] flex-col justify-center border-b-[0.6cqw] border-(--cc-accent) pt-[2.6cqw] pr-[26cqw] pl-[8cqw] leading-none whitespace-nowrap",
            roupa.bareName ? "" : roupa.matte ? "bg-(--cc-bar)" : "bg-linear-to-b from-black/80 to-black/40",
          )}
          style={roupa.contentPad ? { height: `calc(16% + ${roupa.contentPad + (roupa.nameDrop ?? 0)}cqw)`, paddingLeft: `${8 + roupa.contentPad + (roupa.namePadX ?? 0)}cqw`, paddingTop: `${2.6 + roupa.contentPad + (roupa.nameDrop ?? 0)}cqw` } : undefined}
        >
          <span className="truncate text-[10.5cqw] font-extrabold">{player.nickname}</span>
          <span className="mt-[1cqw] truncate text-[3.8cqw] font-bold tracking-[0.2em] text-(--cc-muted) uppercase">{subtitle}</span>
        </div>
        )}


        {/* Sombra atrás da pessoa: ela se descola do fundo e parece estar na carta. */}
        {player.photo && !roupa.clean && !pure && <PhotoShadow />}

        {/* Foto grande, presa embaixo: o peito some no degradê antes do rodapé. */}
        {!pure && (
        <div className={cn("absolute z-[5]", frame.box)} style={roupa.contentPad && roupa.windowInset ? { bottom: `${22.6 - roupa.windowInset.y * 1.4 + lift - (roupa.photoDrop ?? 0)}cqw`, height: `${99 - lift}cqw` } : undefined}>
          {player.photo ? (
            <Image
              src={player.photo.url}
              alt=""
              fill
              sizes={photoSizes}
              unoptimized={player.photo.url.startsWith("blob:")}
              className={frame.image}
            />
          ) : (
            <div className="flex size-full items-end justify-center pb-[6cqw]">
              <span aria-hidden className="text-[34cqw] leading-none font-extrabold opacity-30">
                {getInitials(player.fullName)}
              </span>
            </div>
          )}
        </div>
        )}

        {/* Uma luz só: tom da roupa e vinheta por cima da foto e do fundo juntos (na fosca, só uma vinheta leve). */}
        {!roupa.clean && !pure && (
        <div
          aria-hidden
          style={roupa.contentPad ? { top: `calc(16% + ${roupa.contentPad}cqw)` } : undefined}
          className={cn(
            "absolute inset-x-0 top-[16%] bottom-0 z-[6]",
            roupa.matte
              ? "bg-[radial-gradient(95%_80%_at_50%_42%,transparent_60%,rgb(0_0_0/0.45)_100%)]"
              : "bg-[linear-gradient(180deg,rgb(var(--cc-light)/0.14),transparent_35%,transparent_60%,rgb(0_0_0/0.35)),radial-gradient(90%_75%_at_50%_42%,transparent_55%,rgb(0_0_0/0.55)_100%)]",
          )}
        />
        )}
        {/* Feixe de luz e brilhos passando na frente do jogador. */}
        {!roupa.matte && (
          <div
            aria-hidden
            className="absolute inset-0 z-[7] bg-[linear-gradient(118deg,transparent_26%,rgb(255_255_255/0.16)_33%,transparent_40%,transparent_60%,rgb(var(--cc-light)/0.14)_66%,transparent_72%)]"
          />
        )}
        {!roupa.matte && roupa.sparkles !== false && SPARKS.map((spark) => (
          <span
            key={spark.left}
            aria-hidden
            style={{ left: spark.left, top: spark.top, animationDelay: spark.delay }}
            className="absolute z-[7] size-[5cqw] animate-[cc-twinkle_2.2s_ease-in-out_infinite] bg-[radial-gradient(circle,#fff_0_18%,rgb(var(--cc-light)/0.9)_40%,transparent_70%)] [clip-path:polygon(50%_0,58%_42%,100%_50%,58%_58%,50%_100%,42%_58%,0_50%,42%_42%)] motion-reduce:animate-none"
          />
        ))}
        {!roupa.clean && !pure && (
          <div aria-hidden style={roupa.contentPad ? { bottom: `calc(12% + ${roupa.contentPad - 0.8 + lift}cqw)` } : undefined} className={cn("absolute inset-x-0 bottom-[12%] z-[7] bg-linear-to-b from-transparent to-(--cc-bar)", frame.fade)} />
        )}

        {!pure && (
        <div
          className={cn(
            "absolute top-[5cqw] right-[5.5cqw] z-[8] flex h-[24cqw] w-[19cqw] flex-col items-center pt-[2.3cqw] leading-none text-[#0b130f] [clip-path:polygon(0_0,100%_0,100%_76%,50%_100%,0_76%)]",
            roupa.matte ? RANK_FLAT_CLASSES[rank] : RANK_CREST[rank],
          )}
          style={roupa.contentPad ? { top: `${5 + roupa.contentPad}cqw`, right: `${5.5 + roupa.contentPad + (roupa.namePadX ?? 0) / 2}cqw` } : undefined}
        >
          <span className="text-[9cqw] font-extrabold tabular-nums">{player.ovr ?? EMPTY_VALUE}</span>
          <RankInsignia rank={rank} />
        </div>
        )}

        {!pure && (
          <>
        <span style={roupa.contentPad ? { bottom: `calc(13.5% + ${roupa.contentPad - 0.8 + lift}cqw)` } : undefined} className="absolute inset-x-0 bottom-[13.5%] z-[8] truncate px-[4cqw] text-center text-[3.9cqw] font-extrabold tracking-[0.35em] text-(--cc-accent) uppercase">
          {band}
        </span>

        <dl
          className="absolute inset-x-0 bottom-0 z-[8] grid h-[12%] grid-cols-3 border-t-[0.6cqw] border-(--cc-accent) bg-(--cc-bar)"
          style={roupa.contentPad ? { height: `calc(12% + ${roupa.contentPad - 0.8 + lift}cqw)`, paddingBottom: `${1 + lift}cqw`, paddingInline: `${roupa.contentPad + (roupa.statsPadX ?? 0)}cqw` } : roupa.statsInset ? { paddingBottom: `${roupa.statsInset.bottom}cqw`, paddingInline: `${roupa.statsInset.side}cqw` } : undefined}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn("flex flex-col-reverse items-center justify-center leading-none", index > 0 && "border-l-[0.4cqw] border-white/15")}
            >
              <dt className="mt-[0.6cqw] font-sans text-[2.7cqw] font-semibold tracking-[0.04em] whitespace-nowrap text-(--cc-muted) uppercase">{stat.label}</dt>
              <dd className="text-[7.6cqw] font-extrabold tabular-nums">{stat.value ?? EMPTY_VALUE}</dd>
            </div>
          ))}
        </dl>
          </>
        )}
      </div>

      {/* Por dentro da moldura: fio claro no metal (inset em % da própria carta: 2,6% da largura nos dois eixos) ou o brilho do neon. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-[9]",
          roupa.artFrame
            ? "hidden"
            : isNeon
            ? cn(NEON_WINDOW, roupa.neonDim ? NEON_INNER_GLOW_DIM : NEON_INNER_GLOW)
            : cn(METAL_WINDOW, "shadow-[inset_0_0_0_0.5cqw_var(--cc-m3),inset_0_0_0_0.9cqw_rgb(0_0_0/0.35)]"),
        )}
      />
    </article>
  );

  // Carta de neon: o enfeite e o brilho cabem dentro da própria caixa (mesmo tamanho e
  // proporção das outras), para não encostar em margem nem na carta do lado em nenhuma tela.
  return isNeon ? (
    <div style={vars} className={cn("@container relative aspect-[5/7] shrink-0", className)}>
      {roupa.floaters && <FloaterPieces items={roupa.floaters} layer="back" />}
      {card}
      {!roupa.artFrame && <NeonOverlay kind={hasTrim ? (roupa.trim ?? "base") : null} isDim={roupa.neonDim === true} />}
      {roupa.overflow && (
        // eslint-disable-next-line @next/next/no-img-element -- arte decorativa do tamanho da caixa, sem otimizar
        <img aria-hidden alt="" src={`/cartas/fundos/${roupa.overflow}.webp`} className={cn("pointer-events-none absolute top-0 left-0 z-[11] h-full select-none", roupa.overflowWidth ? "max-w-none" : "w-full")} style={roupa.overflowWidth ? { width: `${roupa.overflowWidth * 100}%`, left: `${-(roupa.overflowLeft ?? 0) * 100}%` } : undefined} />
      )}
      {award && roupa.awardMedal && !pure && <AwardMedal kind={award.kind} medal={roupa.awardMedal} />}
      {roupa.floaters && <FloaterPieces items={roupa.floaters} layer="front" />}
      {roupa.drops && <WaterDrops />}
      {roupa.overflowBolts && (
        // Os raios das decorações estalam como trovão (só `opacity`; com movimento reduzido, ficam acesos).
        // eslint-disable-next-line @next/next/no-img-element -- arte decorativa do tamanho da caixa, sem otimizar
        <img aria-hidden alt="" src={`/cartas/fundos/${roupa.overflowBolts}.webp`} className={cn("pointer-events-none absolute top-0 left-0 z-[12] h-full select-none motion-reduce:animate-none", roupa.overflowWidth ? "max-w-none" : "w-full", roupa.still ? "" : roupa.glow ? "animate-[cc-thunder-glow_3.6s_ease-out_infinite]" : roupa.innerBolts ? "animate-[cc-thunder-flash_3.2s_linear_infinite]" : "animate-[cc-thunder-strike_2.4s_linear_infinite]")} style={roupa.overflowWidth ? { width: `${roupa.overflowWidth * 100}%`, left: `${-(roupa.overflowLeft ?? 0) * 100}%` } : undefined} />
      )}
    </div>
  ) : (
    card
  );
}

/** A carta ocupa só os 84% do meio da própria caixa (carta de neon: o brilho usa a sobra). O verso da carta precisa do mesmo tamanho. */
export function isTrimmedCard(player: Player): boolean {
  return getCanchaCardLook(player).roupa.neon !== undefined;
}
