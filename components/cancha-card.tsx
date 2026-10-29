import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
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

type Roupa = {
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
};

const GOLD = ["#7a5512", "#e9c86a", "#fff4c8"] as const;
const SILVER = ["#3b4450", "#c9d1d6", "#ffffff"] as const;

const ROUPAS = {
  // Grafite fosco (aprovado pelo dono do app em 2026-10-29): menos premium que as skins, de propósito.
  padrao: { background: "fosco-grafite", metal: ["#2a312d", "#2a312d", "rgb(255 255 255 / 0.1)"], accent: "#8fa197", light: "255 255 255", bar: "#121714", muted: "#9fb0a4", matte: true },
  // Skins premium (aprovadas pelo dono do app em 2026-10-29): fundo lapidado na cor da pedra,
  // moldura em tubo de neon com o enfeite da base (`neon`) e sem estrelinhas. Fundos gerados por `prototipos/gemas.cjs` (docs).
  esmeralda: { background: "gema-esmeralda", metal: ["#0f6b45", "#0f6b45", "#5fd39a"], accent: "#5fd39a", light: "160 255 200", bar: "#03140c", muted: "#9fffc8", sparkles: false, neon: "#2dffa0" },
  safira: { background: "gema-safira", metal: ["#1d4fa8", "#1d4fa8", "#7fb0ff"], accent: "#7fb0ff", light: "170 200 255", bar: "#040a1c", muted: "#a9c8ff", sparkles: false, neon: "#36a6ff" },
  ametista: { background: "gema-ametista", metal: ["#5b2fa0", "#5b2fa0", "#b99bff"], accent: "#b99bff", light: "220 190 255", bar: "#0e0620", muted: "#d2bcff", sparkles: false, neon: "#c46bff" },
  rubi: { background: "gema-rubi", metal: ["#9b1530", "#9b1530", "#ff8fa3"], accent: "#ff8fa3", light: "255 190 200", bar: "#1a0309", muted: "#ffb3c0", sparkles: false, neon: "#ff2f66" },
  // Ícone: branco creme com moldura de ouro claro, lembrando a carta Icon do FIFA (2026-10-29).
  icone: { background: "gema-icone", metal: ["#c9a24e", "#c9a24e", "#fff4d6"], accent: "#e2c06e", light: "255 240 200", bar: "#1a140a", muted: "#f0dfb5", sparkles: false, neon: "#ffcf4d" },
  // Halloween 2026 (aprovadas pelo dono do app em 2026-10-29): fundo que conta o evento, sem estrelinhas,
  // e o tubo de neon das premium com enfeite do bicho (azul-luar com garras e presas; vermelho-sangue com morcego e asa).
  lobisomem: { background: "skin-lobisomem", metal: ["#5f6b78", "#5f6b78", "#e2e8ef"], accent: "#e2e8ef", light: "207 226 255", bar: "#03070d", muted: "#cfe2ff", sparkles: false, neon: "#8fd0ff", trim: "lobisomem" },
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
 * no metal de cada tema. Destaques (Atacante, Criativo, Defensor, Goleiro, Gol): o ícone
 * do prêmio no mesmo lugar. O tema do mês veste cor e marca d'água (fantasma, taça), como
 * antes (hoje só o Halloween). Moldura em tubo de neon na cor do prêmio, com um traço curto na base (no Halloween, mais uma abóbora acesa no topo) (pedido
 * do dono do app em 2026-10-29). Fundos `premio-<prêmio>-<tema>.webp`, gerados por `prototipos/premios.cjs` (docs).
 */
const CRAQUE_COLORS: Record<CardThemeKey, AwardColors> = {
  default: { frame: "#b8902f", hairline: "#fff1c2", accent: "#e9c86a", light: "255 225 150", bar: "#070605", muted: "#e9c86a", neon: "#ffc83d" },
  halloween: { frame: "#c2560f", hairline: "#ffd29a", accent: "#ffb04a", light: "255 176 74", bar: "#0a0410", muted: "#ffc98a", neon: "#ff8a1f" },
};
const HIGHLIGHT_COLORS: Record<CardThemeKey, AwardColors> = {
  default: { frame: "#2f6fd6", hairline: "#cfe2ff", accent: "#8fc2ff", light: "190 220 255", bar: "#040c22", muted: "#a9cbff", neon: "#36a6ff" },
  halloween: { frame: "#6a2bb0", hairline: "#c9ff8a", accent: "#b6ff5c", light: "210 180 255", bar: "#0d0418", muted: "#c9ff8a", neon: "#9dff3a" },
};
/** Prêmios com arte própria do ícone ao lado (cartas antigas de Fair Play vestem o Gol). */
const HIGHLIGHT_ART = new Set<AwardKind>(["atacante", "criativo", "defensor", "goleiro", "gol", "foguete", "garcom", "drible", "motor"]);

/**
 * Time do Mês (aprovado pelo dono do app em 2026-10-29): o cristal lapidado que ele mandou,
 * em roxo, com a coroa dourada ao lado do jogador e o tubo de neon das premium em roxo.
 * Não veste o tema do mês (`hasSeasonalTheme`). Fundo `premio-time-do-mes.webp`, gerado
 * por `prototipos/mes-cristal.cjs` (docs).
 */
const MONTH_ROUPA: Roupa = {
  background: "premio-time-do-mes",
  metal: ["#b8902f", "#b8902f", "#fff1c2"],
  accent: "#f3d27a",
  light: "220 180 255",
  bar: "#0b0318",
  muted: "#f3d27a",
  sparkles: false,
  neon: "#b46bff",
};

/**
 * Bola Murcha (aprovada pelo dono do app em 2026-10-29): bronze oxidado, "mofado", fosco e
 * sem brilho, com a bola murcha ao lado do jogador. Moldura em neon apagado, sem enfeite
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

/** Fora do jogo (só cartas antigas): roupas provisórias. */
const PROVISIONAL_AWARD_ROUPAS: Partial<Record<AwardDesignKind, Roupa>> = {
  // Time da Semana (saiu do jogo em 2026-10-29): neon dourado, como os outros prêmios.
  time_da_semana: { ...ROUPAS.estilhacos, neon: "#ffd24d", trim: null },
};

function awardRoupa(kind: AwardKind, theme: CardThemeKey): Roupa {
  const design = awardDesignKind(kind);
  if (design === "jogador_do_mes") return MONTH_ROUPA;
  if (design === "bola_murcha") return FLOP_ROUPA;
  const provisional = PROVISIONAL_AWARD_ROUPAS[design];
  if (provisional) return { ...provisional, trim: theme === "halloween" ? "abobora" : "destaque" };
  const isCraque = design === "craque";
  const colors = (isCraque ? CRAQUE_COLORS : HIGHLIGHT_COLORS)[theme];
  const art = isCraque ? "craque" : HIGHLIGHT_ART.has(kind) ? kind : "gol";
  return {
    background: `premio-${art}-${theme}`,
    metal: [colors.frame, colors.frame, colors.hairline],
    accent: colors.accent,
    light: colors.light,
    bar: colors.bar,
    muted: colors.muted,
    sparkles: false,
    neon: colors.neon,
    trim: isCraque ? "craque" : theme === "halloween" ? "abobora" : "destaque",
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
    case "lobisomem": return "lobisomem";
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

function RankInsignia({ rank }: { rank: CardRank }) {
  return (
    <svg aria-hidden viewBox="0 0 30 18" className="mt-[0.6cqw] h-[5.6cqw] w-[9.5cqw]">
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
const NEON_HALO =
  "shadow-[0_0_0.8cqw_var(--cc-neon),0_0_3.5cqw_color-mix(in_oklab,var(--cc-neon),transparent_30%),0_0_10cqw_color-mix(in_oklab,var(--cc-neon),transparent_65%)]";
const NEON_INNER_GLOW =
  "shadow-[inset_0_0_0.8cqw_var(--cc-neon),inset_0_0_3.5cqw_color-mix(in_oklab,var(--cc-neon),transparent_40%)]";
/** Neon apagado (Bola Murcha): o tubo sem o centro branco e um brilho fraco em volta. */
const NEON_FRAME_DIM =
  "bg-[linear-gradient(160deg,color-mix(in_oklab,var(--cc-neon),white_30%),var(--cc-neon)_30%,color-mix(in_oklab,var(--cc-neon),black_30%)_55%,var(--cc-neon)_80%,color-mix(in_oklab,var(--cc-neon),white_20%))]";
const NEON_HALO_DIM =
  "shadow-[0_0_0.6cqw_color-mix(in_oklab,var(--cc-neon),transparent_50%),0_0_3cqw_color-mix(in_oklab,var(--cc-neon),transparent_80%)]";
const NEON_INNER_GLOW_DIM = "shadow-[inset_0_0_1.6cqw_color-mix(in_oklab,var(--cc-neon),transparent_70%)]";
/** Janela das cartas de neon: a moldura é mais fina (1,7% da largura). */
const NEON_WINDOW = "inset-x-[1.7%] inset-y-[1.21%] rounded-[7.3cqw]";
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

type NeonTrimShape = { side: { d: string; width: number }[]; center?: string; subtle?: boolean };

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

type NeonTrimKind = keyof typeof NEON_TRIMS;

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

function NeonTrim({ kind }: { kind: NeonTrimKind }) {
  const trim: NeonTrimShape = NEON_TRIMS[kind];
  const side = trim.side.map((line) => <NeonLine key={line.d} {...line} subtle={trim.subtle} />);
  return (
    <svg
      aria-hidden
      viewBox="-8 -8 116 156"
      preserveAspectRatio="none"
      fill="none"
      stroke="var(--cc-neon)"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute top-[-5.714%] left-[-8%] z-[10] h-[111.43%] w-[116%] overflow-visible"
    >
      <g>{side}</g>
      <g transform="translate(100 0) scale(-1 1)">{side}</g>
      {trim.center && (
        <>
          <path d={trim.center} strokeWidth={4} opacity={0.2} />
          <path d={trim.center} strokeWidth={1.8} opacity={0.45} />
          <path d={trim.center} fill={NEON_CORE} fillRule="evenodd" strokeWidth={0.5} />
        </>
      )}
    </svg>
  );
}

/**
 * Carta de neon (pedido do dono do app em 2026-10-29: o morcego encostava na margem):
 * a carta ocupa os 84% do meio da caixa e o enfeite e o brilho, a sobra em volta. Vale
 * para toda carta de neon, com ou sem enfeite, para os prêmios terem o mesmo tamanho
 * lado a lado (a Bola Murcha, sem enfeite, ficava maior que as outras).
 */
const TRIMMED_CARD = "absolute inset-[8%]";

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
};

export function CanchaCard({ player, award, className, photoSizes }: CanchaCardProps) {
  const roupa: Roupa = award
    ? awardRoupa(award.kind, award.theme)
    : ROUPAS[player.cardSkin ? skinRoupa(player.cardSkin) : "padrao"];
  const rank = getCardRank(player.ovr);
  const stats = getCardStats(player);
  const band = award
    ? `${AWARD_LABELS[award.kind].title}${award.round === undefined ? "" : ` · R${award.round}`}`
    : CARD_RANK_LABELS[rank];
  const subtitle = !award && typeof player.level === "number" ? `${player.position} · Nível ${player.level}` : player.position;

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
        "@container relative isolate aspect-[5/7] shrink-0 rounded-[9%/6.5%] font-display text-white select-none",
        isNeon ? (roupa.neonDim ? NEON_FRAME_DIM : NEON_FRAME) : METAL_FRAME,
        isNeon ? TRIMMED_CARD : className,
      )}
    >
      <div
        className={cn("absolute overflow-hidden bg-cover bg-center", isNeon ? NEON_WINDOW : METAL_WINDOW)}
        style={{ backgroundImage: `url(/cartas/fundos/${roupa.background}.webp)` }}
      >
        {/* Clarão atrás da cabeça, na cor da luz da roupa. */}
        {!roupa.matte && (
          <div aria-hidden className="absolute inset-0 z-[2] bg-[radial-gradient(34%_24%_at_50%_30%,rgb(var(--cc-light)/0.55),transparent_75%)]" />
        )}

        <div
          className={cn(
            "absolute inset-x-0 top-0 z-[3] flex h-[16%] flex-col justify-center border-b-[0.6cqw] border-(--cc-accent) pt-[2.6cqw] pr-[26cqw] pl-[8cqw] leading-none whitespace-nowrap",
            roupa.matte ? "bg-(--cc-bar)" : "bg-linear-to-b from-black/80 to-black/40",
          )}
        >
          <span className="truncate text-[10.5cqw] font-extrabold">{player.nickname}</span>
          <span className="mt-[1cqw] truncate text-[3.8cqw] font-bold tracking-[0.2em] text-(--cc-muted) uppercase">{subtitle}</span>
        </div>

        {/* Foto grande, presa embaixo: o peito some no degradê antes do rodapé. */}
        <div className="absolute -inset-x-[20%] bottom-[12%] z-[5] h-[85%]">
          {player.photo ? (
            <Image
              src={player.photo.url}
              alt=""
              fill
              sizes={photoSizes}
              unoptimized={player.photo.url.startsWith("blob:")}
              className="object-contain object-bottom"
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
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-[16%] bottom-0 z-[6]",
            roupa.matte
              ? "bg-[radial-gradient(95%_80%_at_50%_42%,transparent_60%,rgb(0_0_0/0.45)_100%)]"
              : "bg-[linear-gradient(180deg,rgb(var(--cc-light)/0.14),transparent_35%,transparent_60%,rgb(0_0_0/0.35)),radial-gradient(90%_75%_at_50%_42%,transparent_55%,rgb(0_0_0/0.55)_100%)]",
          )}
        />
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
        <div aria-hidden className="absolute inset-x-0 bottom-[12%] z-[7] h-[20%] bg-linear-to-b from-transparent to-(--cc-bar)" />

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

        <dl className="absolute inset-x-0 bottom-0 z-[8] grid h-[12%] grid-cols-3 border-t-[0.6cqw] border-(--cc-accent) bg-(--cc-bar)">
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
          isNeon
            ? cn(NEON_WINDOW, roupa.neonDim ? NEON_INNER_GLOW_DIM : NEON_INNER_GLOW)
            : cn(METAL_WINDOW, "shadow-[inset_0_0_0_0.5cqw_var(--cc-m3),inset_0_0_0_0.9cqw_rgb(0_0_0/0.35)]"),
        )}
      />
      {isNeon && (
        <>
          <div aria-hidden className={cn("pointer-events-none absolute inset-0 z-[10] rounded-[9%/6.5%]", roupa.neonDim ? NEON_HALO_DIM : NEON_HALO)} />
          {hasTrim && <NeonTrim kind={roupa.trim ?? "base"} />}
        </>
      )}
    </article>
  );

  // Carta de neon: o enfeite e o brilho cabem dentro da própria caixa (mesmo tamanho e
  // proporção das outras), para não encostar em margem nem na carta do lado em nenhuma tela.
  return isNeon ? <div className={cn("relative aspect-[5/7] shrink-0", className)}>{card}</div> : card;
}
