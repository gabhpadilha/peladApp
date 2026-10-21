import type { Ref } from "react";
import { AWARD_ICONS } from "@/components/award-icons";
import { PlayerCard, PlayerCardDefs } from "@/components/player-card";
import { PACK_THEMES, revealColorStyle } from "@/app/rodadas/[matchId]/vencedores/_components/reveal-theme";
import { CARD_THEME_LABELS } from "@/lib/card-themes";
import { formatMonth, formatWeekdayDate } from "@/lib/format-date";
import { AWARD_LABELS, formatRoundScore, hasSeasonalTheme, type Award } from "@/types/award";
import { cn } from "@/lib/utils";

/** Tamanho do story na tela; a imagem sai em 3x (1080 × 1920, o formato do Instagram). */
export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;

type AwardStoryProps = {
  award: Award;
  groupName: string;
  ref?: Ref<HTMLDivElement>;
};

function storySubtitle(award: Award): string {
  if (award.kind === "time_da_semana") {
    const ratings = award.votes === 1 ? "1 avaliação" : `${award.votes} avaliações`;
    return award.score === null ? ratings : `Nota ${formatRoundScore(award.score)} na rodada · ${ratings}`;
  }
  if (award.kind === "jogador_do_mes") {
    const ratings = award.votes === 1 ? "1 avaliação" : `${award.votes} avaliações`;
    return award.score === null ? ratings : `Média ${formatRoundScore(award.score)} no mês · ${ratings}`;
  }
  return award.votes === 1 ? "1 voto da galera" : `${award.votes} votos da galera`;
}

/**
 * Arte do story do Instagram com a carta especial (vira imagem no aparelho).
 * Sem `filter` nem `mix-blend-mode`: o Safari do iPhone desenha errado.
 */
export function AwardStory({ award, groupName, ref }: AwardStoryProps) {
  const Icon = AWARD_ICONS[award.kind];
  const year = award.date.slice(0, 4);

  return (
    <div
      ref={ref}
      style={revealColorStyle(award.kind, award.theme)}
      className={cn(
        "relative flex h-[640px] w-[360px] flex-col items-center overflow-hidden px-6 pt-12 pb-8 text-center",
        PACK_THEMES[award.theme].screen,
      )}
    >
      {/* O clipPath da carta precisa estar dentro do que vira imagem. */}
      <PlayerCardDefs />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--reveal-color)_45%,transparent),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 bg-[repeating-conic-gradient(from_0deg,color-mix(in_oklch,var(--reveal-color)_14%,transparent)_0deg_6deg,transparent_6deg_18deg)] mask-[radial-gradient(circle,black_20%,transparent_62%)]"
      />

      <p className="relative font-display text-xl font-extrabold tracking-wide text-primary">PELADAPP</p>
      <p className="relative mt-1 max-w-full truncate text-xs tracking-[0.14em] text-white/60 uppercase">
        {groupName} · {hasSeasonalTheme(award.kind) ? CARD_THEME_LABELS[award.theme] : formatMonth(award.date)} {year}
      </p>

      <div className="relative mt-7 flex items-center gap-2 text-(--reveal-color)">
        <Icon aria-hidden className="size-6 shrink-0" />
        <p className="font-display text-4xl leading-none font-extrabold uppercase">{AWARD_LABELS[award.kind].title}</p>
      </div>
      <p className="relative mt-2 text-sm text-white/70">
        Rodada {award.round} · {formatWeekdayDate(award.date)}
      </p>

      <div className="relative mt-6 w-48">
        <PlayerCard player={award.card} award={award} size="fill" />
      </div>

      <p className="relative mt-5 font-display text-3xl font-bold text-white">{award.card.nickname}</p>
      <p className="relative text-sm text-white/70">{storySubtitle(award)}</p>

      <p className="relative mt-auto text-[11px] tracking-[0.25em] text-white/40 uppercase">Carta especial · PeladApp</p>
    </div>
  );
}
