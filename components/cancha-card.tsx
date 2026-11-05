import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { PHOTO_SHADOW_GRADIENT_ID } from "@/lib/card-svg-ids";
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
   * A arte do fundo cobre a caixa toda menos esta faixa fina (em % da carta), por baixo de uma moldura fina: o conteúdo continua na janela
   * padrão (`window`), mas a arte chega até a moldura (a janela fica sem fundo).
   */
  artInset?: { x: number; y: number; radius: number };
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
  // Voltagem (2026-11-05, pedido do dono do app: o estilo da borda da referência dele no nosso retângulo): fio duplo de ouro pálido por dentro e
  // linhas de neon por fora, com o degrau onde se dividem (`prototipos/voltagem.cjs`). Janela `ring` recuada até o fio de dentro.
  voltagem: { background: "premium-voltagem", overflow: "premium-voltagem-vaza", overflowWidth: 1.25, innerBolts: "premium-voltagem-dentro", still: true, window: "ring", windowInset: { x: 7.68, y: 5.48 }, windowRadius: 4.94, artFrame: true, clean: true, trim: null, metal: ["#c9b84e", "#c9b84e", "#fff7b0"], accent: "#f5ee9c", light: "150 230 255", bar: "#03121c", muted: "#bfeeff", sparkles: false, neon: "#36d6ff" },
  // Maré (2026-11-05, teste do kit em camadas: fundo e borda feitos no Gemini com o gabarito 5:7, montados por `prototipos/montar-carta.cjs`):
  // tromba-d'água num mar de enchente e moldura de ouro com a "capa" de lâminas nos cantos de baixo. Janela padrão (`ring`, 64,5 px da caixa).
  mare: { background: "premium-mare", overflow: "premium-mare-vaza", artInset: { x: 3.93, y: 2.81, radius: 4.8 }, window: "ring", windowInset: { x: 7.68, y: 5.48 }, windowRadius: 4.94, artFrame: true, clean: true, trim: null, metal: ["#b8902f", "#b8902f", "#fff1c2"], accent: "#f3d27a", light: "120 230 255", bar: "#031018", muted: "#bfeeff", sparkles: false, neon: "#f3d27a" },
  icone: { background: "premium-icone", clean: true, overflow: "premium-icone-vaza", overflowWidth: 774 / 714, artFrame: true, trim: null, metal: ["#c9a24e", "#c9a24e", "#fff4d6"], accent: "#e2c06e", light: "255 240 200", bar: "#1a140a", muted: "#f0dfb5", sparkles: false, neon: "#ffcf4d" },
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

function awardRoupa(kind: AwardKind, theme: CardThemeKey): Roupa {
  const design = awardDesignKind(kind);
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
    case "mare": return "mare";
    case "voltagem": return "voltagem";
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

export function CanchaCard({ player, award, className, photoSizes, photoFrame = "atual" }: CanchaCardProps) {
  const { roupa, rank, stats, band, subtitle } = getCanchaCardLook(player, award);
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
        {!roupa.matte && (
          <div aria-hidden className="absolute inset-0 z-[2] bg-[radial-gradient(34%_24%_at_50%_30%,rgb(var(--cc-light)/0.55),transparent_75%)]" />
        )}

        <div
          className={cn(
            "absolute inset-x-0 top-0 z-[3] flex h-[16%] flex-col justify-center border-b-[0.6cqw] border-(--cc-accent) pt-[2.6cqw] pr-[26cqw] pl-[8cqw] leading-none whitespace-nowrap",
            roupa.bareName ? "" : roupa.matte ? "bg-(--cc-bar)" : "bg-linear-to-b from-black/80 to-black/40",
          )}
        >
          <span className="truncate text-[10.5cqw] font-extrabold">{player.nickname}</span>
          <span className="mt-[1cqw] truncate text-[3.8cqw] font-bold tracking-[0.2em] text-(--cc-muted) uppercase">{subtitle}</span>
        </div>


        {/* Sombra atrás da pessoa: ela se descola do fundo e parece estar na carta. */}
        {player.photo && !roupa.clean && <PhotoShadow />}

        {/* Foto grande, presa embaixo: o peito some no degradê antes do rodapé. */}
        <div className={cn("absolute z-[5]", frame.box)}>
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

        {/* Uma luz só: tom da roupa e vinheta por cima da foto e do fundo juntos (na fosca, só uma vinheta leve). */}
        {!roupa.clean && (
        <div
          aria-hidden
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
        {!roupa.clean && (
          <div aria-hidden className={cn("absolute inset-x-0 bottom-[12%] z-[7] bg-linear-to-b from-transparent to-(--cc-bar)", frame.fade)} />
        )}

        <div
          className={cn(
            "absolute top-[5cqw] right-[5.5cqw] z-[8] flex h-[24cqw] w-[19cqw] flex-col items-center pt-[2.3cqw] leading-none text-[#0b130f] [clip-path:polygon(0_0,100%_0,100%_76%,50%_100%,0_76%)]",
            roupa.matte ? RANK_FLAT_CLASSES[rank] : RANK_CREST[rank],
          )}
        >
          <span className="text-[9cqw] font-extrabold tabular-nums">{player.ovr ?? EMPTY_VALUE}</span>
          <RankInsignia rank={rank} />
        </div>

        <span className="absolute inset-x-0 bottom-[13.5%] z-[8] truncate px-[4cqw] text-center text-[3.9cqw] font-extrabold tracking-[0.35em] text-(--cc-accent) uppercase">
          {band}
        </span>

        <dl
          className="absolute inset-x-0 bottom-0 z-[8] grid h-[12%] grid-cols-3 border-t-[0.6cqw] border-(--cc-accent) bg-(--cc-bar)"
          style={roupa.statsInset ? { paddingBottom: `${roupa.statsInset.bottom}cqw`, paddingInline: `${roupa.statsInset.side}cqw` } : undefined}
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
    <div style={vars} className={cn("relative aspect-[5/7] shrink-0", className)}>
      {card}
      {!roupa.artFrame && <NeonOverlay kind={hasTrim ? (roupa.trim ?? "base") : null} isDim={roupa.neonDim === true} />}
      {roupa.overflow && (
        // eslint-disable-next-line @next/next/no-img-element -- arte decorativa do tamanho da caixa, sem otimizar
        <img aria-hidden alt="" src={`/cartas/fundos/${roupa.overflow}.webp`} className={cn("pointer-events-none absolute top-0 left-0 z-[11] h-full select-none", roupa.overflowWidth ? "max-w-none" : "w-full")} style={roupa.overflowWidth ? { width: `${roupa.overflowWidth * 100}%`, left: `${-(roupa.overflowLeft ?? 0) * 100}%` } : undefined} />
      )}
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
