import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_TIER_LABELS, getCardTier, type CardTier } from "@/lib/card-tier";
import { getInitials } from "@/lib/get-initials";
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

const cardVariants = cva(cn("relative aspect-[5/7.4] shrink-0 select-none", SHAPE_CLIP), {
  variants: {
    tier: {
      bronze: "bg-rarity-bronze-frame",
      silver: "bg-rarity-silver-frame",
      gold: "bg-rarity-gold-frame",
      special: "bg-rarity-special-frame",
      mvp: "bg-rarity-mvp-frame",
    } satisfies Record<CardTier, string>,
    size: {
      sm: "w-28",
      md: "w-40",
      lg: "w-56",
      xl: "w-72",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const FACE_BY_TIER: Record<CardTier, string> = {
  bronze: "from-rarity-bronze-from to-rarity-bronze-to text-rarity-bronze-foreground",
  silver: "from-rarity-silver-from to-rarity-silver-to text-rarity-silver-foreground",
  gold: "from-rarity-gold-from to-rarity-gold-to text-rarity-gold-foreground",
  special: "from-rarity-special-from to-rarity-special-to text-rarity-special-foreground",
  mvp: "from-rarity-mvp-from to-rarity-mvp-to text-rarity-mvp-foreground",
};

type CardSize = NonNullable<VariantProps<typeof cardVariants>["size"]>;

/** Largura renderizada de cada tamanho, para o `sizes` da foto. */
const PHOTO_SIZES: Record<CardSize, string> = {
  sm: "112px",
  md: "160px",
  lg: "224px",
  xl: "288px",
};

const EMPTY_VALUE = "–";

type PlayerCardProps = {
  player: Player;
  size?: CardSize;
  /** Craque da Rodada: sobrepõe a faixa calculada pelo OVR. */
  isMvp?: boolean;
  className?: string;
};

/**
 * Carta do jogador. Escala pela largura (`size`): todo o conteúdo interno
 * usa unidades `cqw`, então não ajuste fontes por breakpoint.
 */
export function PlayerCard({ player, size = "md", isMvp = false, className }: PlayerCardProps) {
  const tier = getCardTier(player.ovr ?? 0, isMvp);
  const attributeKeys: readonly PlayerAttribute[] =
    player.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const attributeValues: Partial<Record<PlayerAttribute, number | null>> = player.attributes;

  return (
    <article
      aria-label={`${player.nickname}, ${player.position}, OVR ${player.ovr ?? "sem avaliação"}, carta ${CARD_TIER_LABELS[tier]}`}
      className={cn(cardVariants({ tier, size }), className)}
    >
      <div
        className={cn(
          "@container absolute inset-[1.8%] overflow-hidden bg-linear-to-br",
          FACE_BY_TIER[tier],
          SHAPE_CLIP,
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_5cqw)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(115deg,transparent_28%,rgb(255_255_255/0.22)_42%,transparent_56%)]"
        />

        <div className="absolute top-[13%] left-[10%] z-10 flex flex-col items-center font-display leading-none">
          <span className="text-[25cqw] font-extrabold tabular-nums">
            {player.ovr ?? EMPTY_VALUE}
          </span>
          <span className="text-[9cqw] font-bold">{player.position}</span>
          {tier === "mvp" && (
            <StarIcon aria-hidden className="mt-[3cqw] size-[8cqw] fill-current" />
          )}
        </div>

        <div className="absolute top-[6%] right-[5%] left-[27%] h-[53%]">
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

        <span className="absolute inset-x-0 top-[84%] text-center font-display text-[4.8cqw] font-semibold tracking-[0.3em] uppercase opacity-60">
          {CARD_TIER_LABELS[tier]}
        </span>
      </div>
    </article>
  );
}

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
    <Image
      src={player.photo.url}
      alt=""
      fill
      sizes={PHOTO_SIZES[size]}
      className={cn(
        player.photo.kind === "cutout"
          ? "object-contain object-bottom"
          : "rounded-t-[6cqw] object-cover mask-b-from-60% mask-b-to-100%",
      )}
    />
  );
}
