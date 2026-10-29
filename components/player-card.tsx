import { useId, type CSSProperties } from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { GhostIcon } from "lucide-react";
import { AWARD_ICONS } from "@/components/award-icons";
import { CanchaCard } from "@/components/cancha-card";
import { cn } from "@/lib/utils";
import { CARD_TIER_LABELS, getCardTier, type CardTier } from "@/lib/card-tier";
import type { CardThemeKey } from "@/lib/card-themes";
import { getInitials } from "@/lib/get-initials";
import { photoFadeLayers } from "@/lib/photo-fades";
import {
  AWARD_ATTRIBUTES,
  AWARD_LABELS,
  awardDesignKind,
  hasSeasonalTheme,
  type AwardDesignKind,
  type AwardKind,
} from "@/types/award";
import type { CardSkinKey } from "@/types/card-skin";
import {
  ATTRIBUTE_LABELS,
  GOALKEEPER_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  type Player,
  type PlayerAttribute,
} from "@/types/player";

const CARD_SHAPE_ID = "player-card-shape";
const SHAPE_CLIP = "[clip-path:url(#player-card-shape)]";
const MONTH_SHARD_ID = "player-card-month-shard";
const MONTH_STRIPES_ID = "player-card-month-stripes";

/**
 * Formato da carta estilo Ultimate Team (cantos de cima recortados, ponta embaixo),
 * em unidades relativas para escalar com qualquer tamanho, e o degradê/listras das
 * pontas que vazam do Time do Mês. Renderizado uma única vez no layout raiz.
 */
export function PlayerCardDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <clipPath id={CARD_SHAPE_ID} clipPathUnits="objectBoundingBox">
        <path d="M0.16,0.035 Q0.5,0 0.84,0.035 Q0.88,0.09 1,0.085 L1,0.84 Q1,0.88 0.94,0.9 L0.56,0.985 Q0.5,1 0.44,0.985 L0.06,0.9 Q0,0.88 0,0.84 L0,0.085 Q0.12,0.09 0.16,0.035 Z" />
      </clipPath>
      <linearGradient id={MONTH_SHARD_ID} x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stopColor="#5a1fb8" />
        <stop offset="0.55" stopColor="#a63ee6" />
        <stop offset="1" stopColor="#e070ff" />
      </linearGradient>
      <pattern id={MONTH_STRIPES_ID} width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
        <rect width="2.2" height="0.7" fill="#d9c8ff" fillOpacity={0.55} />
      </pattern>
    </svg>
  );
}

/**
 * Visual da carta: faixa da carta base ou um dos 4 visuais de prêmio (com tema
 * sazonal; o Time do Mês não veste tema). Ver `awardDesignKind`.
 */
type ThemedAwardKind = Exclude<AwardDesignKind, "jogador_do_mes">;
type AwardDesign = AwardDesignKind | `${ThemedAwardKind}-halloween`;
type CardDesign = CardTier | AwardDesign;

type Design = {
  frame: string;
  face: string;
  /** Face com arte em imagem: sem o degradê, a textura e o brilho padrão. */
  hasArt?: boolean;
  /** Cor da sombra atrás da foto; sem ela, o token da moldura (mesmo nome da classe). */
  shadow?: string;
};

/** Classes literais (o Tailwind precisa enxergá-las inteiras). */
const DESIGNS: Record<CardDesign, Design> = {
  bronze: {
    frame: "bg-rarity-bronze-frame",
    face: "from-rarity-bronze-from to-rarity-bronze-to text-rarity-bronze-foreground",
  },
  silver: {
    frame: "bg-rarity-silver-frame",
    face: "from-rarity-silver-from to-rarity-silver-to text-rarity-silver-foreground",
  },
  gold: {
    frame: "bg-rarity-gold-frame",
    face: "from-rarity-gold-from to-rarity-gold-to text-rarity-gold-foreground",
  },
  rare: {
    frame: "bg-rarity-rare-frame",
    face: "from-rarity-rare-from to-rarity-rare-to text-rarity-rare-foreground",
  },
  craque: {
    frame: "bg-award-craque-frame",
    face: "from-award-craque-from to-award-craque-to text-award-craque-foreground",
  },
  gol: {
    frame: "bg-award-gol-frame",
    face: "from-award-gol-from to-award-gol-to text-award-gol-foreground",
  },
  bola_murcha: {
    frame: "bg-award-bola-murcha-frame",
    face: "from-award-bola-murcha-from to-award-bola-murcha-to text-award-bola-murcha-foreground",
  },
  time_da_semana: {
    frame: "bg-award-time-da-semana-frame",
    face: "from-award-time-da-semana-from to-award-time-da-semana-to text-award-time-da-semana-foreground",
  },
  "craque-halloween": {
    frame: "bg-award-craque-halloween-frame",
    face: "from-award-craque-halloween-from to-award-craque-halloween-to text-award-craque-halloween-foreground",
  },
  "gol-halloween": {
    frame: "bg-award-gol-halloween-frame",
    face: "from-award-gol-halloween-from to-award-gol-halloween-to text-award-gol-halloween-foreground",
  },
  "bola_murcha-halloween": {
    frame: "bg-award-bola-murcha-halloween-frame",
    face: "from-award-bola-murcha-halloween-from to-award-bola-murcha-halloween-to text-award-bola-murcha-halloween-foreground",
  },
  "time_da_semana-halloween": {
    frame: "bg-award-time-da-semana-halloween-frame",
    face: "from-award-time-da-semana-halloween-from to-award-time-da-semana-halloween-to text-award-time-da-semana-halloween-foreground",
  },
  // Arte do dono do app (aprovada em 2026-10-21), alinhada à direita: os raios
  // de dentro encostam na borda de onde saem os de fora (`MonthCardOverflow`).
  jogador_do_mes: {
    frame:
      "bg-linear-to-br from-award-jogador-do-mes-frame-light via-award-jogador-do-mes-frame to-award-jogador-do-mes-frame-dark",
    face: "bg-[url(/cartas/jogador-do-mes-fundo.webp)] bg-cover bg-right text-award-jogador-do-mes-foreground",
    hasArt: true,
    shadow: "var(--award-jogador-do-mes-to)",
  },
};

/** Textura da face: a padrão (linhas finas) ou a do visual do prêmio. */
const DEFAULT_TEXTURE = "bg-[repeating-linear-gradient(115deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_5cqw)]";
const AWARD_TEXTURES: Partial<Record<AwardDesignKind, string>> = {
  // Céu estrelado.
  time_da_semana:
    "[background:radial-gradient(circle,rgb(255_255_255/0.4)_0_0.6cqw,transparent_0.9cqw)_0_0/9cqw_9cqw,radial-gradient(circle,rgb(255_255_255/0.22)_0_0.4cqw,transparent_0.7cqw)_4.5cqw_4.5cqw/9cqw_9cqw]",
};

/** Rótulo curto no rodapé da carta especial. */
const AWARD_FOOTER: Record<AwardKind, string> = {
  craque: "Melhor jogador",
  gol: "Gol da rodada",
  drible: "Drible",
  foguete: "Foguete",
  garcom: "Garçom",
  motor: "Motor",
  atacante: "Melhor atacante",
  criativo: "Mais criativo",
  defensor: "Melhor defensor",
  goleiro: "Melhor goleiro",
  fair_play: "Fair play",
  fominha: "Fominha",
  bola_murcha: "Bola murcha",
  time_da_semana: "Time da semana",
  jogador_do_mes: "Time do mês",
};

/** Tamanho da carta (sem o recorte), usado também pela carta da Loja, que tem enfeites por fora. */
const cardSizeVariants = cva("relative aspect-[5/7.4] shrink-0 select-none", {
  variants: {
    size: {
      sm: "w-28",
      md: "w-40",
      lg: "w-56",
      xl: "w-72",
      /** Ocupa a largura do pai (ex.: grade de 3 cartas que precisa caber no celular). */
      fill: "w-full",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type CardSize = NonNullable<VariantProps<typeof cardSizeVariants>["size"]>;

function cardVariants({ size }: { size: CardSize }) {
  return cn(cardSizeVariants({ size }), SHAPE_CLIP);
}

/** Largura renderizada de cada tamanho, para o `sizes` da foto. */
const PHOTO_SIZES: Record<CardSize, string> = {
  sm: "112px",
  md: "160px",
  lg: "224px",
  xl: "288px",
  fill: "(min-width: 1024px) 160px, 33vw",
};

const EMPTY_VALUE = "–";

export type PlayerCardAward = {
  kind: AwardKind;
  theme: CardThemeKey;
  /** Sem rodada = prévia (ex.: apresentação do evento do mês). */
  round?: number;
};

type PlayerCardProps = {
  player: Player;
  size?: CardSize;
  /** Carta especial: visual do prêmio e do tema; os números vêm de `player` (já congelados). */
  award?: PlayerCardAward;
  className?: string;
};

/** Opacidade da sombra atrás da foto (intensidade "B · média", aprovada pelo dono do app). */
const PHOTO_SHADOW_OPACITY = 0.4;

/**
 * Sombra atrás da pessoa, num tom escuro da carta, para foto e carta parecerem
 * uma coisa só. Só degradês radiais (sem `filter`, `mix-blend-mode` nem máscara
 * com a foto, que quebram no iPhone), terminando transparentes antes das bordas
 * da área da foto.
 */
function PhotoShadow({ color }: { color: string }) {
  const tone = (alpha: number) =>
    `color-mix(in oklab, color-mix(in oklab, ${color} 30%, black) ${Math.round(alpha * PHOTO_SHADOW_OPACITY * 100)}%, transparent)`;
  const style: CSSProperties = {
    backgroundImage: [
      // Halo justo atrás da cabeça e dos ombros: descola a pessoa da face.
      `radial-gradient(ellipse 40% 38% at 52% 46%, ${tone(1)} 0%, ${tone(0.55)} 45%, transparent 100%)`,
      // Reflexo largo e baixo na face, como a sombra da pessoa caindo na carta.
      `radial-gradient(ellipse 46% 26% at 54% 78%, ${tone(0.7)} 0%, ${tone(0.3)} 50%, transparent 100%)`,
    ].join(", "),
  };
  return <div aria-hidden className="absolute inset-0" style={style} />;
}

function getDesign(player: Player, award: PlayerCardAward | undefined): CardDesign {
  if (!award) return getCardTier(player.ovr ?? 0);
  // Destaques (Gol e prêmios das estatísticas) dividem o visual do Gol; só o ícone muda.
  const kind = awardDesignKind(award.kind);
  if (kind === "jogador_do_mes" || award.theme === "default") return kind;
  return `${kind}-${award.theme}`;
}

/** Pontas roxas do Time do Mês: a grande nasce na face e fura o canto; a menor, mais baixa. */
const MONTH_SHARDS = [
  { points: "80,17 104,-7 98,10 91,21", edge: "80,17 104,-7 98,10", edgeWidth: 0.45 },
  { points: "90,27 109,19 100,30", edge: "90,27 109,19 100,30", edgeWidth: 0.4 },
] as const;

/** Raio: brilho largo e fraco + brilho médio + miolo claro (sem `filter`). */
function OverflowBolt({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#fff1a8" strokeOpacity={0.18} strokeWidth={2.6} />
      <path d={d} stroke="#fff1a8" strokeOpacity={0.45} strokeWidth={1.1} />
      <path d={d} stroke="#fffbe8" strokeWidth={0.4} />
    </g>
  );
}

/**
 * A arte que vaza da carta do Time do Mês (aprovada pelo dono do app, como
 * no desenho dele): duas pontas roxas listradas furando o canto de cima à
 * direita e raios saindo pela lateral. Fica por cima da carta, fora do recorte
 * do escudo. Coordenadas no espaço da carta (100 × 148); degradê e listras
 * ficam em `PlayerCardDefs`.
 */
function MonthCardOverflow() {
  return (
    <svg aria-hidden viewBox="0 0 100 148" className="pointer-events-none absolute inset-0 size-full overflow-visible">
      {MONTH_SHARDS.map((shard) => (
        <g key={shard.points}>
          <polygon points={shard.points} fill={`url(#${MONTH_SHARD_ID})`} />
          <polygon points={shard.points} fill={`url(#${MONTH_STRIPES_ID})`} />
          <polyline points={shard.edge} fill="none" stroke="#f3dfa0" strokeWidth={shard.edgeWidth} />
        </g>
      ))}
      <OverflowBolt d="M95 33 L99 31 L98 35 L103 35.5 L101 39 L107 41" />
      <OverflowBolt d="M101 35.3 L104 32 L103.5 29.5 L106.5 27" />
      <OverflowBolt d="M96 47 L100.5 48 L99 51.5 L104 53 L102 56.5 L105.5 59" />
      <OverflowBolt d="M102 56.5 L99.5 60.5 L101 63" />
      <OverflowBolt d="M96 22 L100 21.5 L102.5 18" />
    </svg>
  );
}

/** Largura de cada tamanho na carta nova (a altura sai da proporção 5:7 dela). */
const CANCHA_WIDTHS: Record<CardSize, string> = { sm: "w-28", md: "w-40", lg: "w-56", xl: "w-72", fill: "w-full" };

/**
 * Carta do jogador. Na branch de testes `feat/card-identity-redesign`, todas as
 * cartas (base, Loja e prêmios) usam a carta com identidade própria (`CanchaCard`).
 * O desenho anterior continua em `LegacyPlayerCard`, para comparar.
 */
export function PlayerCard({ player, size = "md", award, className }: PlayerCardProps) {
  return <CanchaCard player={player} award={award} photoSizes={PHOTO_SIZES[size]} className={cn(CANCHA_WIDTHS[size], className)} />;
}

/**
 * Carta do jogador (desenho anterior, estilo FUT). Sem `award`, é a carta base
 * (faixa pelo OVR); com `award`, é a carta especial colecionável. Escala pela
 * largura (`size`): todo o conteúdo interno usa unidades `cqw`.
 */
export function LegacyPlayerCard({ player, size = "md", award, className }: PlayerCardProps) {
  // Carta comprada na Loja substitui a carta padrão; as cartas de prêmio mantêm o visual delas.
  if (!award && player.cardSkin) {
    return <PremiumPlayerCard player={player} skin={player.cardSkin} size={size} className={className} />;
  }

  const design = getDesign(player, award);
  const { frame, face, hasArt, shadow } = DESIGNS[design];
  // A arte que vaza precisa ficar fora do recorte do escudo: a carta vai num invólucro.
  const hasOverflow = design === "jogador_do_mes";
  const tier = getCardTier(player.ovr ?? 0);
  const attributeKeys: readonly PlayerAttribute[] =
    player.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const attributeValues: Partial<Record<PlayerAttribute, number | null>> = player.attributes;
  const AwardIcon = award ? AWARD_ICONS[award.kind] : null;
  const label = award
    ? `${AWARD_LABELS[award.kind].title}, ${award.round === undefined ? "prévia" : `rodada ${award.round}`}`
    : `carta ${CARD_TIER_LABELS[tier]}`;

  const card = (
    <article
      aria-label={`${player.nickname}, ${player.position}, OVR ${player.ovr ?? "sem avaliação"}, ${label}`}
      className={cn(hasOverflow ? ["relative size-full", SHAPE_CLIP] : [cardVariants({ size }), className], frame)}
    >
      <div
        className={cn(
          "@container absolute inset-[1.8%] overflow-hidden",
          !hasArt && "bg-linear-to-br",
          face,
          SHAPE_CLIP,
        )}
      >
        {!hasArt && (
          <>
            <div
              aria-hidden
              className={cn("absolute inset-0", (award && AWARD_TEXTURES[awardDesignKind(award.kind)]) ?? DEFAULT_TEXTURE)}
            />
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 bg-[linear-gradient(115deg,transparent_28%,rgb(255_255_255/0.22)_42%,transparent_56%)]",
                // Ouro raro: brilho mais largo e intenso.
                design === "rare" &&
                  "bg-[linear-gradient(115deg,transparent_18%,rgb(255_255_255/0.45)_38%,transparent_50%,rgb(255_255_255/0.2)_62%,transparent_72%)]",
              )}
            />
          </>
        )}
        {award && hasSeasonalTheme(award.kind) && award.theme === "halloween" && (
          <GhostIcon
            aria-hidden
            className="absolute top-[18%] right-[-6%] size-[62cqw] rotate-12 opacity-[0.12]"
          />
        )}

        <div className="absolute top-[13%] left-[10%] z-10 flex flex-col items-center font-display leading-none">
          {/* 21cqw: ~85% do tamanho anterior (pedido do dono do app). */}
          <span className="text-[21cqw] font-extrabold tabular-nums">
            {player.ovr ?? EMPTY_VALUE}
          </span>
          <span className="text-[9cqw] font-bold">{player.position}</span>
          {AwardIcon && <AwardIcon aria-hidden className="mt-[3cqw] size-[9cqw]" />}
        </div>

        {/* z-0: a foto fica sempre atrás do OVR/posição (z-10). */}
        {/* Área da foto (estilo EA FC): centralizada, passa um pouco das laterais da face */}
        {/* (as bordas ficam fora do corte) e vai até o apelido. Proporção ~1,18, a mesma de lib/photo-cutout.ts. */}
        <div className="absolute top-[2%] -right-[4%] -left-[4%] z-0 h-[62%]">
          {/* Sombra no tom da moldura: o token tem o mesmo nome da classe da moldura. */}
          {player.photo && <PhotoShadow color={shadow ?? `var(${frame.replace("bg-", "--")})`} />}
          <PlayerCardPhoto player={player} size={size} />
        </div>

        <div className="absolute inset-x-[7%] top-[60%] flex flex-col items-center gap-[3cqw] font-display leading-none">
          <span className="w-full truncate text-center text-[12cqw] font-bold">
            {player.nickname}
          </span>
          <dl className="grid w-full grid-cols-6 text-center">
            {attributeKeys.map((key) => (
              <div
                key={key}
                className={cn(
                  "flex flex-col items-center gap-[1cqw]",
                  award && AWARD_ATTRIBUTES[award.kind] && "rounded-[2cqw] py-[0.8cqw]",
                  // O atributo que deu o prêmio ganha um fundo (a identidade de cada destaque).
                  award && AWARD_ATTRIBUTES[award.kind] === key &&
                    "[background:color-mix(in_oklab,currentColor_20%,transparent)]",
                )}
              >
                <dt className="text-[6.2cqw] font-semibold opacity-75">
                  <abbr title={ATTRIBUTE_LABELS[key].name} className="no-underline">
                    {ATTRIBUTE_LABELS[key].abbreviation}
                  </abbr>
                </dt>
                <dd className="text-[9.5cqw] font-extrabold tabular-nums">
                  {attributeValues[key] ?? EMPTY_VALUE}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <span
          className={cn(
            "absolute inset-x-0 top-[84%] text-center font-display text-[4.8cqw] font-semibold uppercase opacity-60",
            award ? "tracking-[0.15em]" : "tracking-[0.3em]",
          )}
        >
          {award
            ? `${AWARD_FOOTER[award.kind]}${award.round === undefined ? "" : ` · R${award.round}`}`
            : CARD_TIER_LABELS[tier]}
        </span>
        {!award && typeof player.level === "number" && (
          <LevelSeal level={player.level} rimClass={frame} innerClass="bg-black/75 text-white" />
        )}
      </div>
    </article>
  );

  if (!hasOverflow) return card;
  return (
    <div className={cn(cardSizeVariants({ size }), className)}>
      {card}
      <MonthCardOverflow />
    </div>
  );
}

const HEXAGON = "[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]";

/** Selo hexagonal com o nível (XP) na ponta de baixo, por dentro da carta. */
function LevelSeal({ level, rimClass, innerClass }: { level: number; rimClass: string; innerClass: string }) {
  return (
    <span
      aria-label={`Nível ${level}`}
      className={cn("absolute bottom-[1.2%] left-1/2 z-10 aspect-[1/1.15] w-[10.5%] -translate-x-1/2", HEXAGON, rimClass)}
    >
      <span
        className={cn(
          "absolute inset-[0.5cqw] flex items-center justify-center font-display leading-none font-bold tabular-nums",
          level >= 100 ? "text-[3.6cqw]" : "text-[4.6cqw]",
          HEXAGON,
          innerClass,
        )}
      >
        {level}
      </span>
    </span>
  );
}

/**
 * Nível do jogador no cabeçalho ("Carta com XP", aprovada pelo dono do app em
 * 2026-10-24, no estilo da marca): o contorno da carta em lima, que enche de
 * lima conforme o XP do nível atual, com o número no meio. Igual para todos,
 * qualquer que seja a carta em uso.
 */
export function LevelBadge({ player, className }: { player: Player; className?: string }) {
  const level = player.level ?? 0;
  const progress = Math.min(Math.max(player.levelProgress ?? 0, 0), 1);
  // O id do React traz caracteres que quebram o `url(#...)`.
  const clipId = `level-badge-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <span
      title={`Nível ${level} · ${Math.round(progress * 100)}% para o próximo`}
      className={cn("relative inline-flex h-8 w-[22px] shrink-0 items-center justify-center text-primary", className)}
    >
      <svg viewBox="-4 -4 108 156" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <path d={SHIELD_PATH} />
          </clipPath>
        </defs>
        <rect
          y={148 * (1 - progress)}
          width="100"
          height="148"
          fill="currentColor"
          opacity="0.35"
          clipPath={`url(#${clipId})`}
        />
        <path d={SHIELD_PATH} fill="none" stroke="currentColor" strokeWidth="9" />
      </svg>
      <span className="relative font-display text-sm leading-none font-extrabold text-foreground tabular-nums">
        {level}
      </span>
    </span>
  );
}

/** Classe de cores de cada carta da Loja (tokens em `app/globals.css`); literais para o Tailwind. */
const SKIN_CLASSES: Record<CardSkinKey, string> = {
  esmeralda: "card-skin-esmeralda",
  safira: "card-skin-safira",
  ametista: "card-skin-ametista",
  rubi: "card-skin-rubi",
  icone: "card-skin-icone",
  lobisomem: "card-skin-lobisomem",
  vampiro: "card-skin-vampiro",
};

const GOLD_FILL = "[background:var(--card-gold)]";

/** Paradas do metal da moldura (as mesmas do `--card-gold` de cada carta, para os SVGs). */
const METAL_STOPS: Partial<Record<CardSkinKey, readonly (readonly [string, string])[]>> = {
  lobisomem: [
    ["0%", "#ffffff"],
    ["16%", "#b4bfcc"],
    ["30%", "#eef3f8"],
    ["48%", "#5f6b78"],
    ["64%", "#d3dbe4"],
    ["82%", "#434c56"],
    ["100%", "#e2e8ef"],
  ],
  vampiro: [
    ["0%", "#f1d9db"],
    ["16%", "#8a1626"],
    ["30%", "#d68791"],
    ["48%", "#2c0309"],
    ["64%", "#a42a3c"],
    ["82%", "#1d0206"],
    ["100%", "#dba3aa"],
  ],
};

/** Ouro champanhe (o mesmo do `--card-gold`); as cartas de evento têm metal próprio. */
const GOLD_STOPS: readonly (readonly [string, string])[] = [
  ["0%", "#fbf1d2"],
  ["16%", "#d2af66"],
  ["30%", "#f4e4b4"],
  ["48%", "#94692d"],
  ["64%", "#ddbb76"],
  ["82%", "#735020"],
  ["100%", "#e8cf95"],
];

/**
 * Metal da faixa do jogador (Bronze/Prata/Ouro/Ouro Raro) na borda de fora das
 * cartas da Loja: a skin veste a face, a borda mostra o elo. Pedido do dono do app.
 */
const TIER_STOPS: Record<CardTier, readonly (readonly [string, string])[]> = {
  bronze: [
    ["0%", "#ffe0c2"],
    ["16%", "#b06a3a"],
    ["30%", "#f0b98a"],
    ["48%", "#6b3417"],
    ["64%", "#d18d5c"],
    ["82%", "#4d230e"],
    ["100%", "#e8a878"],
  ],
  silver: [
    ["0%", "#ffffff"],
    ["16%", "#b8bcc2"],
    ["30%", "#f3f4f6"],
    ["48%", "#5c6066"],
    ["64%", "#d6d9dd"],
    ["82%", "#3f4247"],
    ["100%", "#e5e7ea"],
  ],
  gold: [
    ["0%", "#fff8c9"],
    ["16%", "#e2b52c"],
    ["30%", "#fff0a0"],
    ["48%", "#9a6a07"],
    ["64%", "#f1cc4b"],
    ["82%", "#7a5104"],
    ["100%", "#ffe27a"],
  ],
  rare: [
    ["0%", "#ffffff"],
    ["14%", "#ffd23f"],
    ["28%", "#fff6b8"],
    ["46%", "#b17800"],
    ["62%", "#ffe066"],
    ["80%", "#8a5a00"],
    ["100%", "#fff1a1"],
  ],
};

/** Mesmo metal da faixa como fundo CSS (literais, para o Tailwind gerar as classes). */
const TIER_FRAME_FILL: Record<CardTier, string> = {
  bronze:
    "[background:linear-gradient(155deg,#ffe0c2_0%,#b06a3a_16%,#f0b98a_30%,#6b3417_48%,#d18d5c_64%,#4d230e_82%,#e8a878_100%)]",
  silver:
    "[background:linear-gradient(155deg,#ffffff_0%,#b8bcc2_16%,#f3f4f6_30%,#5c6066_48%,#d6d9dd_64%,#3f4247_82%,#e5e7ea_100%)]",
  gold: "[background:linear-gradient(155deg,#fff8c9_0%,#e2b52c_16%,#fff0a0_30%,#9a6a07_48%,#f1cc4b_64%,#7a5104_82%,#ffe27a_100%)]",
  rare: "[background:linear-gradient(155deg,#ffffff_0%,#ffd23f_14%,#fff6b8_28%,#b17800_46%,#ffe066_62%,#8a5a00_80%,#fff1a1_100%)]",
};

/** Id do degradê do metal dentro dos SVGs (um por carta, para não misturar metais). */
const metalId = (skin: CardSkinKey) => (METAL_STOPS[skin] ? `card-metal-${skin}` : "card-gold");

/** Metal da moldura para dentro dos SVGs. */
function MetalGradient({ skin }: { skin: CardSkinKey }) {
  const stops = METAL_STOPS[skin] ?? GOLD_STOPS;
  return (
    <linearGradient id={metalId(skin)} x1="0" y1="0" x2="0.55" y2="1">
      {stops.map(([offset, color]) => (
        <stop key={offset} offset={offset} stopColor={color} />
      ))}
    </linearGradient>
  );
}

/** Formato da carta em unidades (100 x 148), o mesmo do `clipPath`. */
const SHIELD_PATH =
  "M16,5.18 Q50,0 84,5.18 Q88,13.32 100,12.58 L100,124.32 Q100,130.24 94,133.2 L56,145.78 Q50,148 44,145.78 L6,133.2 Q0,130.24 0,124.32 L0,12.58 Q12,13.32 16,5.18 Z";
const MIRROR = "translate(100 0) scale(-1 1)";
const BLADES = [
  "M2.5,16 L-2,21 L-2,99 L0,102 L2.5,99 Z",
  "M0.5,42 L-4.6,47 L-4.6,93 L-8,106 L-3,104 L0.5,96 Z",
  "M5,131.5 L0.5,133.5 L44,150 L50,152 L46,148 Z",
];

/** Asa de morcego no canto de cima, por fora da moldura (só o Vampiro). */
const BAT_WING =
  "M11,7.2 Q4,2.6 -7,5.6 Q-4.6,7 -5.4,9.2 Q-2.6,8.2 -1.8,10.6 Q0.6,9.4 1.8,11.8 Q3.6,9.4 6,10 Q7.6,8.2 11,7.2 Z";

/**
 * Lâminas finas de metal por fora das laterais e da ponta, com fio de luz. Com
 * `tier`, no metal da faixa do jogador (fazem parte da borda); sem OVR, no da skin.
 */
function PremiumBlades({ skin, tier }: { skin: CardSkinKey; tier: CardTier | null }) {
  const blades = skin === "vampiro" ? [...BLADES, BAT_WING] : BLADES;
  const fillId = tier ? `card-tier-${tier}` : metalId(skin);
  return (
    <svg
      aria-hidden
      viewBox="-36 -26 172 200"
      className="pointer-events-none absolute top-[-17.57%] left-[-36%] h-[135.1%] w-[172%] overflow-visible"
    >
      <defs>
        {tier ? (
          <linearGradient id={fillId} x1="0" y1="0" x2="0.55" y2="1">
            {TIER_STOPS[tier].map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
        ) : (
          <MetalGradient skin={skin} />
        )}
      </defs>
      {[undefined, MIRROR].map((transform) => (
        <g key={transform ?? "left"} transform={transform}>
          {blades.map((d) => (
            <g key={d}>
              <path d={d} fill={`url(#${fillId})`} />
              <path d={d} fill="none" stroke="#fff7de" strokeOpacity={0.55} strokeWidth={0.18} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

/**
 * Cabeça de lobo rosnando, desenhada pelo dono do app e vetorizada (~38 x 40
 * unidades, virada para a esquerda, olhando para a lua); olho e pelo são recortes.
 */
const WEREWOLF_HEAD =
  "M23.7,0.0 L22.2,9.1 L12.3,12.6 L9.1,16.3 L0.0,18.4 L0.0,18.5 L2.9,23.3 L7.6,25.9 L5.1,23.0 L5.3,23.0 L7.8,24.2 L6.4,22.3 L7.7,22.8 L7.7,22.6 L7.0,21.9 L7.1,21.7 L10.8,20.4 L15.4,21.0 L14.4,27.1 L12.7,29.2 L10.2,28.2 L10.7,29.6 L10.6,29.8 L9.2,28.6 L9.9,30.2 L9.9,30.4 L7.8,28.6 L9.1,31.3 L11.8,33.1 L15.3,32.3 L15.6,31.8 L16.5,28.1 L20.6,25.6 L21.5,29.1 L21.9,33.3 L24.2,30.4 L24.4,30.4 L24.1,38.8 L28.4,32.8 L28.7,40.0 L33.9,32.6 L33.8,38.2 L35.6,32.9 L35.6,32.3 L33.3,25.9 L33.4,25.6 L37.0,32.3 L35.2,21.7 L30.1,19.0 L36.0,20.0 L36.1,20.2 L37.9,25.3 L37.9,24.9 L36.7,16.3 L28.4,11.3 L28.2,7.7 Z M14.7,13.9 L13.0,16.6 L10.8,17.0 L9.7,17.5 L9.5,17.5 L12.0,15.3 Z";

/**
 * Detalhes do Lobisomem: lua cheia atrás da cabeça, cabeça de lobo em marca
 * d'água por cima dela e três arranhões rasgando o fio interno da lateral direita.
 */
function WerewolfArt({ metal }: { metal: string }) {
  return (
    <>
      <defs>
        <radialGradient id="werewolf-moon" cx="0.42" cy="0.38" r="0.62">
          <stop offset="0%" stopColor="#f4f8ff" stopOpacity={0.55} />
          <stop offset="85%" stopColor="#c9dcf5" stopOpacity={0.34} />
          <stop offset="100%" stopColor="#c9dcf5" stopOpacity={0.08} />
        </radialGradient>
        <radialGradient id="werewolf-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="55%" stopColor="#cfe2ff" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#cfe2ff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={60} cy={36} r={40} fill="url(#werewolf-halo)" />
      <circle cx={60} cy={36} r={25} fill="url(#werewolf-moon)" />
      <circle cx={51} cy={30} r={3.2} fill="#6f86a6" fillOpacity={0.22} />
      <circle cx={67} cy={42} r={4.4} fill="#6f86a6" fillOpacity={0.18} />
      <circle cx={64} cy={25} r={2} fill="#6f86a6" fillOpacity={0.22} />
      <circle cx={56} cy={47} r={1.6} fill="#6f86a6" fillOpacity={0.2} />
      {/* Arranhões: cortes escuros com borda de metal, atravessando o fio interno. */}
      {[0, 3.6, 7.2].map((offset) => (
        <g key={offset} transform={`translate(${offset * 0.35} ${offset})`}>
          <path d="M99,88 Q93,96 88.5,106" fill="none" stroke="#000000" strokeOpacity={0.9} strokeWidth={2} strokeLinecap="round" />
          <path d="M99,88 Q93,96 88.5,106" fill="none" stroke={`url(#${metal})`} strokeOpacity={0.85} strokeWidth={0.5} strokeLinecap="round" />
        </g>
      ))}
      {/* Lobo em cinza translúcido, como marca d'água por cima da lua; some embaixo, atrás do ombro. */}
      <defs>
        <linearGradient id="werewolf-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbe7f7" stopOpacity={0.5} />
          <stop offset="62%" stopColor="#dbe7f7" stopOpacity={0.42} />
          <stop offset="100%" stopColor="#dbe7f7" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={WEREWOLF_HEAD} transform="translate(68 10) scale(0.74)" fill="url(#werewolf-fill)" fillRule="evenodd" />
    </>
  );
}

/**
 * Detalhes do Vampiro: lua de sangue atrás do ombro com morcegos contra ela,
 * presas no lugar do selo de cima e duas gotas escorrendo do fio interno.
 */
function VampireArt({ metal }: { metal: string }) {
  const bat = "M0,0 Q1.2,-1.4 2.6,-0.6 Q3.4,-1.8 4.2,-0.4 L4.6,-1.2 L5,-0.4 Q5.8,-1.8 6.6,-0.6 Q8,-1.4 9.2,0 Q7.6,0 6.8,1.2 Q5.8,0.6 4.6,1.6 Q3.4,0.6 2.4,1.2 Q1.6,0 0,0 Z";
  return (
    <>
      <defs>
        <radialGradient id="vampire-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ff6b7c" stopOpacity={0.5} />
          <stop offset="60%" stopColor="#c41a32" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#c41a32" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* Lua de sangue atrás do ombro: os morcegos aparecem contra ela. */}
      <circle cx={80} cy={34} r={19} fill="url(#vampire-moon)" />
      <circle cx={80} cy={34} r={10} fill="#ff8090" fillOpacity={0.2} />
      <g fill="#050001" fillOpacity={0.9} stroke="#ff6b7c" strokeOpacity={0.45} strokeWidth={0.12} strokeLinejoin="round">
        <path d={bat} transform="translate(73 33) scale(1.45)" />
        <path d={bat} transform="translate(84 24) scale(0.95)" />
        <path d={bat} transform="translate(87 43) scale(0.7)" />
        <path d={bat} transform="translate(68 15) scale(0.55)" />
      </g>
      {/* Gotas escorrendo do fio interno, longe do OVR e do rosto. */}
      <g fill={`url(#${metal})`}>
        <path d="M20,7.4 L22.2,7.1 L22,13 Q23,16 21.1,16.6 Q19.2,16 20.2,13 Z" />
        <path d="M25.6,6.7 L27.2,6.5 L27.1,10.4 Q27.8,12.6 26.4,13 Q25,12.6 25.7,10.4 Z" />
      </g>
      {/* Presas no topo, no lugar do selo. */}
      <g fill={`url(#${metal})`} transform="translate(50 8) scale(1.5) translate(-50 -8)">
        <path d="M46.5,7.2 L53.5,7.2 Q50,9 46.5,7.2 Z" />
        <path d="M47.4,7.6 L48.4,12 L49.2,7.9 Z M52.6,7.6 L51.6,12 L50.8,7.9 Z" />
      </g>
    </>
  );
}

/** Face da carta da Loja: luz difusa, lâminas de vidro com fio dourado, aro de luz, vinheta e fio interno. */
function PremiumFaceArt({ skin }: { skin: CardSkinKey }) {
  const isIcon = skin === "icone";
  const metal = metalId(skin);
  return (
    <svg aria-hidden viewBox="0 0 100 148" preserveAspectRatio="none" className="absolute inset-0 size-full">
      <defs>
        <MetalGradient skin={skin} />
        <linearGradient id={`skin-glass-${skin}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopOpacity={isIcon ? 0.35 : 0.28} className="[stop-color:var(--skin-light)]" />
          <stop offset="60%" stopOpacity={0.04} className="[stop-color:var(--skin-light)]" />
          <stop offset="100%" stopOpacity={0} className="[stop-color:var(--skin-light)]" />
        </linearGradient>
        <radialGradient id={`skin-leak-${skin}`} cx="0.78" cy="0.12" r="0.6">
          <stop offset="0%" stopOpacity={isIcon ? 0.25 : 0.32} className="[stop-color:var(--skin-light)]" />
          <stop offset="100%" stopOpacity={0} className="[stop-color:var(--skin-light)]" />
        </radialGradient>
        <radialGradient id={`skin-vignette-${skin}`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="60%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000000" stopOpacity={isIcon ? 0.12 : 0.45} />
        </radialGradient>
      </defs>
      <rect width="100" height="148" fill={`url(#skin-leak-${skin})`} />
      <path d="M60,4 L94,0 L100,52 L80,46 Z" fill={`url(#skin-glass-${skin})`} />
      <path d="M60,4 L94,0 L100,52" fill="none" stroke={`url(#${metal})`} strokeOpacity={0.55} strokeWidth={0.22} />
      <path d="M82,14 L100,18 L100,70 Z" fill={`url(#skin-glass-${skin})`} />
      <path d="M82,14 L100,70" fill="none" stroke={`url(#${metal})`} strokeOpacity={0.7} strokeWidth={0.25} />
      <path d="M0,24 L14,16 L6,58 Z" fill={`url(#skin-glass-${skin})`} opacity={0.8} />
      <path d="M14,16 L6,58" fill="none" stroke={`url(#${metal})`} strokeOpacity={0.45} strokeWidth={0.2} />
      <circle cx={62} cy={42} r={33} fill="none" strokeOpacity={0.1} strokeWidth={0.3} className="stroke-[var(--skin-text)]" />
      <rect width="100" height="148" fill={`url(#skin-vignette-${skin})`} />
      <path
        d={SHIELD_PATH}
        transform="translate(50 74) scale(0.945) translate(-50 -74)"
        fill="none"
        stroke={`url(#${metal})`}
        strokeWidth={0.4}
      />
      {skin === "lobisomem" && <WerewolfArt metal={metal} />}
      {skin === "vampiro" && <VampireArt metal={metal} />}
      {skin !== "vampiro" && (
        <path d="M47,7 L53,7 L53,10.6 Q50,13.6 47,10.6 Z" fill="none" stroke={`url(#${metal})`} strokeWidth={0.3} />
      )}
    </svg>
  );
}

/**
 * Carta comprada na Loja (inspirada na Team of the Year do EA FC): moldura de
 * ouro champanhe com lâminas finas por fora, face escura na cor da carta e
 * atributos numa linha, como a carta padrão. Mesma foto, OVR e atributos da carta padrão.
 * Sem `mix-blend-mode` nem máscara com a URL da foto (viram faixas no iPhone).
 */
function PremiumPlayerCard({
  player,
  skin,
  size,
  className,
}: {
  player: Player;
  skin: CardSkinKey;
  size: CardSize;
  className?: string;
}) {
  const attributeKeys: readonly PlayerAttribute[] =
    player.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const attributeValues: Partial<Record<PlayerAttribute, number | null>> = player.attributes;
  // Borda no metal da faixa (elo) do jogador; sem OVR ainda, fica o metal da skin.
  const tier = player.ovr === null ? null : getCardTier(player.ovr);

  return (
    <div
      className={cn(
        cardSizeVariants({ size }),
        SKIN_CLASSES[skin],
        className,
      )}
    >
      {/* Sombra e brilho em degradê, sem `filter`: drop-shadow nesta carta (com as
          lâminas passando das bordas) quebrava em blocos no Safari do iPhone. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-[12%] -top-[4%] -bottom-[8%] [background:radial-gradient(closest-side,color-mix(in_oklab,var(--skin-light)_16%,transparent),rgb(0_0_0/0.35)_70%,transparent)]"
      />
      <PremiumBlades skin={skin} tier={tier} />
      <article
        aria-label={`${player.nickname}, ${player.position}, OVR ${player.ovr ?? "sem avaliação"}, carta ${skin}${tier ? `, borda ${CARD_TIER_LABELS[tier]}` : ""}`}
        className={cn("relative size-full text-[var(--skin-text)]", SHAPE_CLIP, tier ? TIER_FRAME_FILL[tier] : GOLD_FILL)}
      >
        <div
          className={cn(
            "@container absolute inset-[1.6%] overflow-hidden",
            "[background:radial-gradient(140%_105%_at_68%_10%,var(--skin-mid),var(--skin-deep)_58%,var(--skin-end))]",
            SHAPE_CLIP,
          )}
        >
          <PremiumFaceArt skin={skin} />

          <div className="absolute top-[12%] left-[10%] z-10 flex flex-col items-center font-display leading-none">
            <span className="text-[20cqw] font-semibold tabular-nums">{player.ovr ?? EMPTY_VALUE}</span>
            <span className="text-[8.5cqw] font-medium tracking-wide">{player.position}</span>
            <span className={cn("mt-[2.5cqw] h-px w-[12cqw]", GOLD_FILL)} />
          </div>

          <div className="absolute top-[2%] -right-[4%] -left-[4%] z-0 h-[62%]">
            {/* Na carta da Loja, o tom vem da face (a moldura é sempre o metal). */}
            {player.photo && <PhotoShadow color="var(--skin-deep)" />}
            <PlayerCardPhoto player={player} size={size} />
          </div>

          <div className="absolute inset-x-[10%] top-[58.5%] flex flex-col items-center gap-[2.2cqw] font-display leading-none">
            <span className="w-full truncate text-center text-[12cqw] font-semibold tracking-wide">
              {player.nickname}
            </span>
            <span className={cn("h-px w-full opacity-50", GOLD_FILL)} />
            {/* 6 atributos numa linha, sigla em cima e valor embaixo, como a carta base e as
                especiais (pedido do dono do app em 2026-10-21; antes eram 2 colunas de 3). */}
            <dl className="grid w-[112%] grid-cols-6 text-center">
              {attributeKeys.map((key) => (
                <div key={key} className="flex flex-col items-center gap-[1cqw]">
                  <dt className="text-[6.2cqw] font-medium opacity-80">
                    <abbr title={ATTRIBUTE_LABELS[key].name} className="no-underline">
                      {ATTRIBUTE_LABELS[key].abbreviation}
                    </abbr>
                  </dt>
                  <dd className="text-[9.5cqw] font-semibold tabular-nums">{attributeValues[key] ?? EMPTY_VALUE}</dd>
                </div>
              ))}
            </dl>
          </div>

          {typeof player.level === "number" && (
            <LevelSeal
              level={player.level}
              rimClass={GOLD_FILL}
              innerClass="[background:radial-gradient(circle_at_50%_30%,var(--skin-mid),var(--skin-deep))] text-[var(--skin-text)]"
            />
          )}
        </div>
      </article>
    </div>
  );
}

/** Monta a máscara: camadas intersectadas, cada uma cobrindo a área da foto. */
function maskStyle(layers: readonly string[]): CSSProperties {
  const image = layers.join(", ");
  const sizes = layers.map(() => "100% 100%").join(", ");
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: sizes,
    WebkitMaskSize: sizes,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  };
}

/*
 * Sem filtro de cor na foto: a camada na cor da moldura, mascarada pela
 * própria foto (`mask-image: url(...)`), aparecia no iPhone como um retângulo
 * com faixas nas laterais (o Safari não aplicava a máscara da foto). Não volte
 * a usar máscara com a URL da foto nem `mix-blend-mode` sobre ela.
 */
function PlayerCardPhoto({ player, size }: { player: Player; size: CardSize }) {
  if (!player.photo) {
    return (
      <div className="flex size-full items-end justify-center">
        <span
          aria-hidden
          className="mb-[2cqw] font-display text-[34cqw] leading-none font-extrabold opacity-25"
        >
          {getInitials(player.fullName)}
        </span>
      </div>
    );
  }

  return (
    <>
      <Image
        src={player.photo.url}
        alt=""
        fill
        sizes={PHOTO_SIZES[size]}
        // Prévia do upload (blob:) ainda não está no Storage: sem otimizador.
        unoptimized={player.photo.url.startsWith("blob:")}
        // Sempre cobrindo a largura toda da área (recorte novo já vem na proporção
        // dela): imagem mais estreita deixava a própria borda visível no iPhone,
        // como uma faixa vertical, mesmo com o fundo 100% transparente.
        className="object-cover object-top"
        // Degradês explícitos (os utilitários mask-b-* do Tailwind escondiam a foto inteira).
        style={maskStyle(photoFadeLayers(player.photo.kind))}
        // O story acha a foto por aqui para aplicar os degradês nos pixels (`bakePhotoFades`).
        data-photo-kind={player.photo.kind}
      />
    </>
  );
}
