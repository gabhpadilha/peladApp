import type { CSSProperties } from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { FrownIcon, GhostIcon, GoalIcon, TrophyIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_TIER_LABELS, getCardTier, type CardTier } from "@/lib/card-tier";
import type { CardThemeKey } from "@/lib/card-themes";
import { getInitials } from "@/lib/get-initials";
import { AWARD_LABELS, type AwardKind } from "@/types/award";
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
};

const AWARD_ICONS: Record<AwardKind, LucideIcon> = {
  craque: TrophyIcon,
  gol: GoalIcon,
  bola_murcha: FrownIcon,
};

/** Rótulo curto no rodapé da carta especial. */
const AWARD_FOOTER: Record<AwardKind, string> = {
  craque: "Craque",
  gol: "Gol da semana",
  bola_murcha: "Bola murcha",
};

const cardVariants = cva(cn("relative aspect-[5/7.4] shrink-0 select-none", SHAPE_CLIP), {
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

type CardSize = NonNullable<VariantProps<typeof cardVariants>["size"]>;

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
          className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_5cqw)]"
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
          <span className="text-[25cqw] font-extrabold tabular-nums">
            {player.ovr ?? EMPTY_VALUE}
          </span>
          <span className="text-[9cqw] font-bold">{player.position}</span>
          {AwardIcon && <AwardIcon aria-hidden className="mt-[3cqw] size-[9cqw]" />}
        </div>

        {/* z-0: a foto fica sempre atrás do OVR/posição (z-10). */}
        {/* Área da foto: proporção 0,87 (a mesma do enquadramento em lib/photo-cutout.ts). */}
        <div className="absolute top-[4%] right-[3%] left-[22%] z-0 h-[58%]">
          <PlayerCardPhoto player={player} size={size} tintClass={DESIGNS[design].frame} />
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
      </div>
    </article>
  );
}

/**
 * Degradês que fazem a foto sumir na carta (os mesmos na foto e no filtro de cor).
 * Recorte: topo limpo (apaga a linha que o segmentador deixa na borda), do pescoço
 * para baixo some devagar até a base e as laterais somem (ombro cortado pela foto
 * original não vira uma borda reta). Original: some embaixo e no lado do OVR.
 */
const PHOTO_FADES: Record<NonNullable<Player["photo"]>["kind"], readonly string[]> = {
  cutout: [
    "linear-gradient(to bottom, transparent 0%, black 4%)",
    // Vinheta oval em volta do rosto (enquadrado no centro, topo ~9% e queixo
    // ~57%): ombros e peito somem juntos em todas as direções, então um detalhe
    // claro no ombro (ex.: listra de camisa) não fica solto como um risco.
    "radial-gradient(ellipse 62% 66% at 50% 30%, black 58%, transparent 100%)",
  ],
  original: [
    "linear-gradient(to bottom, black 55%, transparent)",
    "linear-gradient(to right, transparent, black 30%)",
  ],
};

/** Monta a máscara: camadas intersectadas, cada uma cobrindo a área da foto. */
function maskStyle(layers: readonly string[], firstLayer?: { size: string; position: string }): CSSProperties {
  const image = layers.join(", ");
  const sizes = layers.map((_, index) => (index === 0 && firstLayer ? firstLayer.size : "100% 100%")).join(", ");
  const positions = layers.map((_, index) => (index === 0 && firstLayer ? firstLayer.position : "center")).join(", ");
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: sizes,
    WebkitMaskSize: sizes,
    maskPosition: positions,
    WebkitMaskPosition: positions,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  };
}

/**
 * Filtro de cor suave: a cor da moldura da carta, em `soft-light`, só sobre a
 * pessoa (a própria foto é a máscara). Deixa a foto homogênea com a carta.
 * O Storage responde com CORS aberto, o que o `mask-image` exige.
 */
function PhotoTint({ photo, tintClass }: { photo: NonNullable<Player["photo"]>; tintClass: string }) {
  const isCutout = photo.kind === "cutout";
  const style = maskStyle([`url("${photo.url}")`, ...PHOTO_FADES[photo.kind]], {
    size: isCutout ? "contain" : "cover",
    position: isCutout ? "bottom" : "top",
  });

  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 opacity-55 mix-blend-soft-light", tintClass)}
      // A máscara depende da URL da foto: estilo inline.
      style={style}
    />
  );
}

function PlayerCardPhoto({ player, size, tintClass }: { player: Player; size: CardSize; tintClass: string }) {
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
        // Recorte apoiado embaixo; original cobrindo a área a partir do topo.
        className={player.photo.kind === "cutout" ? "object-contain object-bottom" : "object-cover object-top"}
        // Degradês explícitos (os utilitários mask-b-* do Tailwind escondiam a foto inteira).
        style={maskStyle(PHOTO_FADES[player.photo.kind])}
      />
      <PhotoTint photo={player.photo} tintClass={tintClass} />
    </>
  );
}
