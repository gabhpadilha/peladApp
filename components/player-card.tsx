import type { CSSProperties } from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { GhostIcon } from "lucide-react";
import { AWARD_ICONS } from "@/components/award-icons";
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
      </div>
    </article>
  );
}

/**
 * Degradês que fazem a foto sumir na carta.
 * Recorte enquadrado pelos ombros (`lib/photo-cutout.ts`): eles vão de borda a
 * borda da carta e só somem rente ao corte da face; o peito some embaixo, atrás
 * do apelido. A original (só fotos antigas) some também do lado do OVR. Regra: as quatro bordas da área terminam
 * transparentes (borda com opacidade vira fio no Safari do iPhone); as laterais
 * ainda ficam fora do corte da face.
 */
const PHOTO_FADES: Record<NonNullable<Player["photo"]>["kind"], readonly string[]> = {
  cutout: [
    // Topo limpo: apaga a linha que o segmentador deixa na borda; embaixo, o
    // peito some aos poucos atrás do apelido (que começa em ~94% da área).
    "linear-gradient(to bottom, transparent 0%, black 3%, black 70%, transparent 100%)",
    // Laterais: a face vai de ~4% a ~96% da área; o ombro some só no fim, rente à moldura.
    "linear-gradient(to right, transparent 1%, black 11%, black 89%, transparent 99%)",
  ],
  original: [
    "linear-gradient(to bottom, transparent 0%, black 4%, black 62%, transparent 100%)",
    // Com fundo, o lado do OVR some mais (senão o número se perde na foto).
    "linear-gradient(to right, transparent 4%, black 40%, black 92%, transparent 100%)",
  ],
};

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
        style={maskStyle(PHOTO_FADES[player.photo.kind])}
      />
    </>
  );
}
