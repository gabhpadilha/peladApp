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
  /** Metal da moldura: escuro, médio e brilho. */
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
  /** Moldura lisa, numa cor só (`metal[0]`), com o fio interno em `metal[2]`. */
  flatFrame?: boolean;
  /** Estrelinhas piscando na frente do jogador (padrão: sim, menos na fosca). */
  sparkles?: boolean;
};

const GOLD = ["#7a5512", "#e9c86a", "#fff4c8"] as const;
const SILVER = ["#3b4450", "#c9d1d6", "#ffffff"] as const;

const ROUPAS = {
  // Grafite fosco (aprovado pelo dono do app em 2026-10-29): menos premium que as skins, de propósito.
  padrao: { background: "fosco-grafite", metal: ["#2a312d", "#2a312d", "rgb(255 255 255 / 0.1)"], accent: "#8fa197", light: "255 255 255", bar: "#121714", muted: "#9fb0a4", matte: true },
  // Skins premium (aprovadas pelo dono do app em 2026-10-29): fundo lapidado na cor da pedra,
  // moldura lisa e sem estrelinhas. Fundos gerados por `prototipos/gemas.cjs` (docs).
  esmeralda: { background: "gema-esmeralda", metal: ["#0f6b45", "#0f6b45", "#5fd39a"], accent: "#5fd39a", light: "160 255 200", bar: "#03140c", muted: "#9fffc8", flatFrame: true, sparkles: false },
  safira: { background: "gema-safira", metal: ["#1d4fa8", "#1d4fa8", "#7fb0ff"], accent: "#7fb0ff", light: "170 200 255", bar: "#040a1c", muted: "#a9c8ff", flatFrame: true, sparkles: false },
  ametista: { background: "gema-ametista", metal: ["#5b2fa0", "#5b2fa0", "#b99bff"], accent: "#b99bff", light: "220 190 255", bar: "#0e0620", muted: "#d2bcff", flatFrame: true, sparkles: false },
  rubi: { background: "gema-rubi", metal: ["#9b1530", "#9b1530", "#ff8fa3"], accent: "#ff8fa3", light: "255 190 200", bar: "#1a0309", muted: "#ffb3c0", flatFrame: true, sparkles: false },
  turquesa: { background: "gema-turquesa", metal: ["#0e7d84", "#0e7d84", "#6ff0e8"], accent: "#6ff0e8", light: "170 255 245", bar: "#03161a", muted: "#9ff7f1", flatFrame: true, sparkles: false },
  onix: { background: "gema-onix", metal: ["#1a1a1d", "#1a1a1d", "#8a8f99"], accent: "#b8bdc7", light: "220 225 235", bar: "#050506", muted: "#c3c8d1", flatFrame: true, sparkles: false },
  icone: { background: "gema-icone", metal: ["#d9dde3", "#d9dde3", "#ffffff"], accent: "#ffffff", light: "255 255 255", bar: "#14171c", muted: "#e6eaf0", flatFrame: true, sparkles: false },
  // Halloween 2026 (aprovadas pelo dono do app em 2026-10-29): fundo que conta o evento, moldura lisa, sem estrelinhas.
  lobisomem: { background: "skin-lobisomem", metal: ["#5f6b78", "#5f6b78", "#e2e8ef"], accent: "#e2e8ef", light: "207 226 255", bar: "#03070d", muted: "#cfe2ff", flatFrame: true, sparkles: false },
  vampiro: { background: "skin-vampiro", metal: ["#6e0f20", "#6e0f20", "#e3384e"], accent: "#e3384e", light: "255 120 140", bar: "#0d0105", muted: "#ffb3bd", flatFrame: true, sparkles: false },
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
type AwardColors = Omit<Roupa, "background" | "metal" | "matte" | "flatFrame" | "sparkles"> & { frame: string; hairline: string };

/**
 * Melhor Jogador (aprovado pelo dono do app em 2026-10-29): a taça ao lado do jogador,
 * no metal de cada tema. Destaques (Atacante, Criativo, Defensor, Goleiro, Gol): o ícone
 * do prêmio no mesmo lugar. O tema do mês veste cor e marca d'água (fantasma, taça), como
 * antes (hoje só o Halloween). Fundos `premio-<prêmio>-<tema>.webp`, gerados por `prototipos/premios.cjs` (docs).
 */
const CRAQUE_COLORS: Record<CardThemeKey, AwardColors> = {
  default: { frame: "#b8902f", hairline: "#fff1c2", accent: "#e9c86a", light: "255 225 150", bar: "#070605", muted: "#e9c86a" },
  halloween: { frame: "#c2560f", hairline: "#ffd29a", accent: "#ffb04a", light: "255 176 74", bar: "#0a0410", muted: "#ffc98a" },
};
const HIGHLIGHT_COLORS: Record<CardThemeKey, AwardColors> = {
  default: { frame: "#2f6fd6", hairline: "#cfe2ff", accent: "#8fc2ff", light: "190 220 255", bar: "#040c22", muted: "#a9cbff" },
  halloween: { frame: "#6a2bb0", hairline: "#c9ff8a", accent: "#b6ff5c", light: "210 180 255", bar: "#0d0418", muted: "#c9ff8a" },
};
/** Prêmios com arte própria do ícone ao lado (cartas antigas de Fair Play vestem o Gol). */
const HIGHLIGHT_ART = new Set<AwardKind>(["atacante", "criativo", "defensor", "goleiro", "gol", "foguete", "garcom", "drible", "motor"]);

/**
 * Time do Mês (aprovado pelo dono do app em 2026-10-29): roxo real, a coroa dourada ao lado
 * do jogador e moldura de ouro lisa. Não veste o tema do mês (`hasSeasonalTheme`).
 * Fundo `premio-time-do-mes.webp`, gerado por `prototipos/mes.cjs` (docs).
 */
const MONTH_ROUPA: Roupa = {
  background: "premio-time-do-mes",
  metal: ["#b8902f", "#b8902f", "#fff1c2"],
  accent: "#f3d27a",
  light: "255 225 150",
  bar: "#0b0318",
  muted: "#f3d27a",
  flatFrame: true,
  sparkles: false,
};

/**
 * Bola Murcha (aprovada pelo dono do app em 2026-10-29): bronze oxidado, "mofado", fosco e
 * sem brilho, com a bola murcha ao lado do jogador. Igual o ano todo (não veste o tema).
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
};

/** Fora do jogo (só cartas antigas): roupas provisórias. */
const PROVISIONAL_AWARD_ROUPAS: Partial<Record<AwardDesignKind, RoupaKey>> = {
  time_da_semana: "estilhacos",
};

function awardRoupa(kind: AwardKind, theme: CardThemeKey): Roupa {
  const design = awardDesignKind(kind);
  if (design === "jogador_do_mes") return MONTH_ROUPA;
  if (design === "bola_murcha") return FLOP_ROUPA;
  const provisional = PROVISIONAL_AWARD_ROUPAS[design];
  if (provisional) return ROUPAS[provisional];
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
    flatFrame: true,
    sparkles: false,
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
    case "turquesa": return "turquesa";
    case "onix": return "onix";
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

const CHAMFER =
  "[clip-path:polygon(4cqw_0,calc(100%_-_4cqw)_0,100%_4cqw,100%_calc(100%_-_4cqw),calc(100%_-_4cqw)_100%,4cqw_100%,0_calc(100%_-_4cqw),0_4cqw)]";

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
  } as CSSProperties;

  return (
    <article
      aria-label={`${player.nickname}, ${player.position}, OVR ${player.ovr ?? "sem avaliação"}, ${band}`}
      style={vars}
      className={cn(
        "@container relative isolate aspect-[5/7] shrink-0 rounded-[9%/6.5%] font-display text-white select-none",
        roupa.matte || roupa.flatFrame
          ? "bg-(--cc-m1)"
          : "bg-[linear-gradient(145deg,var(--cc-m1),var(--cc-m2)_30%,var(--cc-m3)_52%,var(--cc-m2)_74%,var(--cc-m1))]",
        className,
      )}
    >
      <div
        className={cn("absolute inset-x-[3.6%] inset-y-[2.57%] overflow-hidden bg-cover bg-center", CHAMFER)}
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

      {/* Fio de metal claro por dentro da moldura (inset em % da própria carta: 3,6% da largura nos dois eixos). */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-[3.6%] inset-y-[2.57%] z-[9] shadow-[inset_0_0_0_0.7cqw_var(--cc-m3),inset_0_0_0_1.2cqw_rgb(0_0_0/0.35)]",
          CHAMFER,
        )}
      />
    </article>
  );
}
