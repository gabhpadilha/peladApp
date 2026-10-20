import type { CSSProperties } from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { GhostIcon } from "lucide-react";
import { AWARD_ICONS } from "@/components/award-icons";
import { cn } from "@/lib/utils";
import { CARD_TIER_LABELS, getCardTier, type CardTier } from "@/lib/card-tier";
import type { CardThemeKey } from "@/lib/card-themes";
import { getInitials } from "@/lib/get-initials";
import { photoFadeLayers } from "@/lib/photo-fades";
import { AWARD_LABELS, type AwardKind } from "@/types/award";
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

/**
 * Formato da carta estilo Ultimate Team (cantos de cima recortados, ponta embaixo),
 * em unidades relativas para escalar com qualquer tamanho.
 * Renderizado uma única vez no layout raiz.
 */
export function PlayerCardDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <clipPath id={CARD_SHAPE_ID} clipPathUnits="objectBoundingBox">
        <path d="M0.16,0.035 Q0.5,0 0.84,0.035 Q0.88,0.09 1,0.085 L1,0.84 Q1,0.88 0.94,0.9 L0.56,0.985 Q0.5,1 0.44,0.985 L0.06,0.9 Q0,0.88 0,0.84 L0,0.085 Q0.12,0.09 0.16,0.035 Z" />
      </clipPath>
    </svg>
  );
}

/** Visual da carta: faixa da carta base ou prêmio (com tema sazonal). */
type AwardDesign = AwardKind | `${AwardKind}-halloween`;
type CardDesign = CardTier | AwardDesign;

/** Classes literais (o Tailwind precisa enxergá-las inteiras). */
const DESIGNS: Record<CardDesign, { frame: string; face: string }> = {
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
  drible: {
    frame: "bg-award-drible-frame",
    face: "from-award-drible-from to-award-drible-to text-award-drible-foreground",
  },
  atacante: {
    frame: "bg-award-atacante-frame",
    face: "from-award-atacante-from to-award-atacante-to text-award-atacante-foreground",
  },
  defensor: {
    frame: "bg-award-defensor-frame",
    face: "from-award-defensor-from to-award-defensor-to text-award-defensor-foreground",
  },
  goleiro: {
    frame: "bg-award-goleiro-frame",
    face: "from-award-goleiro-from to-award-goleiro-to text-award-goleiro-foreground",
  },
  fair_play: {
    frame: "bg-award-fair-play-frame",
    face: "from-award-fair-play-from to-award-fair-play-to text-award-fair-play-foreground",
  },
  fominha: {
    frame: "bg-award-fominha-frame",
    face: "from-award-fominha-from to-award-fominha-to text-award-fominha-foreground",
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
  "drible-halloween": {
    frame: "bg-award-drible-halloween-frame",
    face: "from-award-drible-halloween-from to-award-drible-halloween-to text-award-drible-halloween-foreground",
  },
  "atacante-halloween": {
    frame: "bg-award-atacante-halloween-frame",
    face: "from-award-atacante-halloween-from to-award-atacante-halloween-to text-award-atacante-halloween-foreground",
  },
  "defensor-halloween": {
    frame: "bg-award-defensor-halloween-frame",
    face: "from-award-defensor-halloween-from to-award-defensor-halloween-to text-award-defensor-halloween-foreground",
  },
  "goleiro-halloween": {
    frame: "bg-award-goleiro-halloween-frame",
    face: "from-award-goleiro-halloween-from to-award-goleiro-halloween-to text-award-goleiro-halloween-foreground",
  },
  "fair_play-halloween": {
    frame: "bg-award-fair-play-halloween-frame",
    face: "from-award-fair-play-halloween-from to-award-fair-play-halloween-to text-award-fair-play-halloween-foreground",
  },
  "fominha-halloween": {
    frame: "bg-award-fominha-halloween-frame",
    face: "from-award-fominha-halloween-from to-award-fominha-halloween-to text-award-fominha-halloween-foreground",
  },
  "time_da_semana-halloween": {
    frame: "bg-award-time-da-semana-halloween-frame",
    face: "from-award-time-da-semana-halloween-from to-award-time-da-semana-halloween-to text-award-time-da-semana-halloween-foreground",
  },
};

/** Textura da face: a padrão (linhas finas) ou a do prêmio, para cada carta ter a sua. */
const DEFAULT_TEXTURE = "bg-[repeating-linear-gradient(115deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_5cqw)]";
const AWARD_TEXTURES: Partial<Record<AwardKind, string>> = {
  // Losangos: o zigue-zague do drible.
  drible:
    "bg-[repeating-linear-gradient(60deg,rgb(255_255_255/0.08)_0_1px,transparent_1px_6cqw),repeating-linear-gradient(-60deg,rgb(255_255_255/0.08)_0_1px,transparent_1px_6cqw)]",
  // Linhas de velocidade.
  atacante: "bg-[repeating-linear-gradient(100deg,rgb(255_255_255/0.1)_0_1px,transparent_1px_3cqw)]",
  // Muro.
  defensor:
    "bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_7cqw),repeating-linear-gradient(90deg,rgb(255_255_255/0.05)_0_1px,transparent_1px_14cqw)]",
  // Rede do gol.
  goleiro:
    "bg-[repeating-linear-gradient(45deg,rgb(255_255_255/0.08)_0_1px,transparent_1px_5cqw),repeating-linear-gradient(-45deg,rgb(255_255_255/0.08)_0_1px,transparent_1px_5cqw)]",
  // Listras de bala.
  fair_play: "bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.08)_0_3cqw,transparent_3cqw_6cqw)]",
  // Céu estrelado.
  time_da_semana:
    "[background:radial-gradient(circle,rgb(255_255_255/0.4)_0_0.6cqw,transparent_0.9cqw)_0_0/9cqw_9cqw,radial-gradient(circle,rgb(255_255_255/0.22)_0_0.4cqw,transparent_0.7cqw)_4.5cqw_4.5cqw/9cqw_9cqw]",
};

/** Rótulo curto no rodapé da carta especial. */
const AWARD_FOOTER: Record<AwardKind, string> = {
  craque: "Melhor jogador",
  gol: "Gol da rodada",
  drible: "Drible",
  atacante: "Melhor atacante",
  defensor: "Melhor defensor",
  goleiro: "Melhor goleiro",
  fair_play: "Fair play",
  fominha: "Fominha",
  bola_murcha: "Bola murcha",
  time_da_semana: "Time da semana",
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

function getDesign(player: Player, award: PlayerCardAward | undefined): CardDesign {
  if (!award) return getCardTier(player.ovr ?? 0);
  return award.theme === "default" ? award.kind : `${award.kind}-${award.theme}`;
}

/**
 * Carta do jogador. Sem `award`, é a carta base (faixa pelo OVR); com `award`,
 * é a carta especial colecionável. Escala pela largura (`size`): todo o conteúdo
 * interno usa unidades `cqw`, então não ajuste fontes por breakpoint.
 */
export function PlayerCard({ player, size = "md", award, className }: PlayerCardProps) {
  // Carta comprada na Loja substitui a carta padrão; as cartas de prêmio mantêm o visual delas.
  if (!award && player.cardSkin) {
    return <PremiumPlayerCard player={player} skin={player.cardSkin} size={size} className={className} />;
  }

  const design = getDesign(player, award);
  const tier = getCardTier(player.ovr ?? 0);
  const attributeKeys: readonly PlayerAttribute[] =
    player.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const attributeValues: Partial<Record<PlayerAttribute, number | null>> = player.attributes;
  const AwardIcon = award ? AWARD_ICONS[award.kind] : null;
  const label = award
    ? `${AWARD_LABELS[award.kind].title}, ${award.round === undefined ? "prévia" : `rodada ${award.round}`}`
    : `carta ${CARD_TIER_LABELS[tier]}`;

  return (
    <article
      aria-label={`${player.nickname}, ${player.position}, OVR ${player.ovr ?? "sem avaliação"}, ${label}`}
      className={cn(cardVariants({ size }), DESIGNS[design].frame, className)}
    >
      <div
        className={cn(
          "@container absolute inset-[1.8%] overflow-hidden bg-linear-to-br",
          DESIGNS[design].face,
          SHAPE_CLIP,
        )}
      >
        <div
          aria-hidden
          className={cn("absolute inset-0", (award && AWARD_TEXTURES[award.kind]) ?? DEFAULT_TEXTURE)}
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
        {award?.theme === "halloween" && (
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
          <PlayerCardPhoto player={player} size={size} />
        </div>

        <div className="absolute inset-x-[7%] top-[60%] flex flex-col items-center gap-[3cqw] font-display leading-none">
          <span className="w-full truncate text-center text-[12cqw] font-bold">
            {player.nickname}
          </span>
          <dl className="grid w-full grid-cols-6 text-center">
            {attributeKeys.map((key) => (
              <div key={key} className="flex flex-col items-center gap-[1cqw]">
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
          <LevelSeal level={player.level} rimClass={DESIGNS[design].frame} innerClass="bg-black/75 text-white" />
        )}
      </div>
    </article>
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

/** Classe de cores de cada carta da Loja (tokens em `app/globals.css`); literais para o Tailwind. */
const SKIN_CLASSES: Record<CardSkinKey, string> = {
  esmeralda: "card-skin-esmeralda",
  safira: "card-skin-safira",
  ametista: "card-skin-ametista",
  rubi: "card-skin-rubi",
  turquesa: "card-skin-turquesa",
  onix: "card-skin-onix",
  icone: "card-skin-icone",
};

const GOLD_FILL = "[background:var(--card-gold)]";
const CARD_GOLD_ID = "card-gold";

/** Ouro champanhe para dentro dos SVGs (o mesmo do `--card-gold`). */
function GoldGradient() {
  const stops: [string, string][] = [
    ["0%", "#fbf1d2"],
    ["16%", "#d2af66"],
    ["30%", "#f4e4b4"],
    ["48%", "#94692d"],
    ["64%", "#ddbb76"],
    ["82%", "#735020"],
    ["100%", "#e8cf95"],
  ];
  return (
    <linearGradient id={CARD_GOLD_ID} x1="0" y1="0" x2="0.55" y2="1">
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

/** Lâminas douradas finas por fora das laterais e da ponta, com fio de luz. */
function PremiumBlades() {
  return (
    <svg
      aria-hidden
      viewBox="-36 -26 172 200"
      className="pointer-events-none absolute top-[-17.57%] left-[-36%] h-[135.1%] w-[172%] overflow-visible"
    >
      <defs>
        <GoldGradient />
      </defs>
      {[undefined, MIRROR].map((transform) => (
        <g key={transform ?? "left"} transform={transform}>
          {BLADES.map((d) => (
            <g key={d}>
              <path d={d} fill={`url(#${CARD_GOLD_ID})`} />
              <path d={d} fill="none" stroke="#fff7de" strokeOpacity={0.55} strokeWidth={0.18} />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Face da carta da Loja: luz difusa, lâminas de vidro com fio dourado, aro de luz, vinheta e fio interno. */
function PremiumFaceArt({ skin }: { skin: CardSkinKey }) {
  const isIcon = skin === "icone";
  return (
    <svg aria-hidden viewBox="0 0 100 148" preserveAspectRatio="none" className="absolute inset-0 size-full">
      <defs>
        <GoldGradient />
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
      <path d="M60,4 L94,0 L100,52" fill="none" stroke={`url(#${CARD_GOLD_ID})`} strokeOpacity={0.55} strokeWidth={0.22} />
      <path d="M82,14 L100,18 L100,70 Z" fill={`url(#skin-glass-${skin})`} />
      <path d="M82,14 L100,70" fill="none" stroke={`url(#${CARD_GOLD_ID})`} strokeOpacity={0.7} strokeWidth={0.25} />
      <path d="M0,24 L14,16 L6,58 Z" fill={`url(#skin-glass-${skin})`} opacity={0.8} />
      <path d="M14,16 L6,58" fill="none" stroke={`url(#${CARD_GOLD_ID})`} strokeOpacity={0.45} strokeWidth={0.2} />
      <circle cx={62} cy={42} r={33} fill="none" strokeOpacity={0.1} strokeWidth={0.3} className="stroke-[var(--skin-text)]" />
      <rect width="100" height="148" fill={`url(#skin-vignette-${skin})`} />
      <path
        d={SHIELD_PATH}
        transform="translate(50 74) scale(0.945) translate(-50 -74)"
        fill="none"
        stroke={`url(#${CARD_GOLD_ID})`}
        strokeWidth={0.4}
      />
      <path d="M47,7 L53,7 L53,10.6 Q50,13.6 47,10.6 Z" fill="none" stroke={`url(#${CARD_GOLD_ID})`} strokeWidth={0.3} />
    </svg>
  );
}

/**
 * Carta comprada na Loja (inspirada na Team of the Year do EA FC): moldura de
 * ouro champanhe com lâminas finas por fora, face escura na cor da carta e
 * atributos em duas colunas. Mesma foto, OVR e atributos da carta padrão.
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
  const columns = [attributeKeys.slice(0, 3), attributeKeys.slice(3)];

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
      <PremiumBlades />
      <article
        aria-label={`${player.nickname}, ${player.position}, OVR ${player.ovr ?? "sem avaliação"}, carta ${skin}`}
        className={cn("relative size-full text-[var(--skin-text)]", SHAPE_CLIP, GOLD_FILL)}
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
            <PlayerCardPhoto player={player} size={size} />
          </div>

          <div className="absolute inset-x-[10%] top-[58.5%] flex flex-col items-center gap-[2.2cqw] font-display leading-none">
            <span className="w-full truncate text-center text-[12cqw] font-semibold tracking-wide">
              {player.nickname}
            </span>
            <span className={cn("h-px w-full opacity-50", GOLD_FILL)} />
            <div className="grid w-[86%] grid-cols-[1fr_1px_1fr] gap-x-[5cqw]">
              {columns.map((column, index) => (
                <dl key={column.join("-")} className={cn("flex flex-col gap-[1.6cqw]", index === 1 && "col-start-3")}>
                  {column.map((key) => (
                    <div key={key} className="flex items-baseline gap-[2.2cqw]">
                      <dd className="w-[11cqw] text-right text-[9cqw] font-semibold tabular-nums">
                        {attributeValues[key] ?? EMPTY_VALUE}
                      </dd>
                      <dt className="text-[8cqw] font-normal opacity-90">
                        <abbr title={ATTRIBUTE_LABELS[key].name} className="no-underline">
                          {ATTRIBUTE_LABELS[key].abbreviation}
                        </abbr>
                      </dt>
                    </div>
                  ))}
                </dl>
              ))}
              <span className={cn("col-start-2 row-start-1 h-full w-px opacity-45", GOLD_FILL)} />
            </div>
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
