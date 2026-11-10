import type { CSSProperties } from "react";
import { SparklesIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, formatAwardResult, type Award, type AwardKind } from "@/types/award";
import type { CardThemeKey } from "@/lib/card-themes";
import { AwardEnvelope } from "./award-envelope";
import { PACK_THEMES, revealColorStyle } from "./reveal-theme";

type RevealHighlightsProps = {
  /** Um prêmio por atributo da linha, o Melhor Goleiro e o Gol da Rodada. */
  awards: Award[];
  /** Tema da rodada: o campinho veste o cenário do evento. */
  fieldTheme: CardThemeKey;
  nextLabel: string;
  onNext: () => void;
};

/**
 * Onde cada prêmio fica no quadro: o Goleador na frente, ataque e gol em seguida, criação no meio, defesa e goleiro
 * embaixo. As duas últimas fileiras guardam os prêmios por atributo das rodadas antigas (até
 * 2026-10-29), dois por fileira para as cartas não ficarem espremidas no celular.
 */
const ROWS: readonly (readonly AwardKind[])[] = [
  // Goleador da Rodada (2026-11-01): sozinho na primeira fileira, à frente do ataque.
  ["goleador"],
  ["atacante", "gol"],
  ["criativo"],
  ["defensor", "goleiro"],
  ["foguete", "garcom"],
  ["drible", "motor"],
];

function HighlightCard({ award, order }: { award: Award; order: number }) {
  return (
    <div style={revealColorStyle(award.kind, award.theme)} className="flex w-[clamp(5rem,26vw,6.5rem)] flex-col items-center gap-1">
      <AwardEnvelope order={order} label={AWARD_LABELS[award.kind].title}>
        <PlayerCard player={award.card} award={award} size="fill" />
      </AwardEnvelope>
      <span
        className="env-card max-w-full truncate rounded-full bg-(--reveal-color) px-2 text-[0.6875rem] font-semibold text-black tabular-nums"
        style={{ "--d": `${0.5 + order * 0.45}s` } as CSSProperties}
      >
        {formatAwardResult(award)}
      </span>
    </div>
  );
}

/**
 * "Destaques da rodada": as cartas dos atributos (VEL, CHU, PAS, DRI, DEF, FIS),
 * do Melhor Goleiro e do Gol da Rodada entrando juntas num quadro tático, no
 * lugar de uma animação por carta (pedido do dono do app em 2026-10-21).
 */
export function RevealHighlights({ awards, fieldTheme, nextLabel, onNext }: RevealHighlightsProps) {
  const byKind = new Map<AwardKind, Award[]>();
  for (const award of awards) byKind.set(award.kind, [...(byKind.get(award.kind) ?? []), award]);
  const placedKinds = new Set(ROWS.flat());
  // Empate (a mesma carta para mais de um) ou prêmio fora do quadro: aparece embaixo.
  const extras = awards.filter(
    (award) => !placedKinds.has(award.kind) || byKind.get(award.kind)?.[0]?.id !== award.id,
  );
  let order = 0;

  return (
    <section
      aria-live="polite"
      aria-label="Destaques da rodada"
      className="absolute inset-0 flex flex-col items-center gap-5 overflow-y-auto px-4 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-[reveal-fade_0.8s_ease-out_both] bg-[radial-gradient(circle_at_50%_15%,oklch(0.6_0.12_200/0.35),transparent_60%)]"
      />

      <div className="relative flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border-2 border-primary text-primary">
          <SparklesIcon aria-hidden className="size-6" />
        </span>
        <h2 className="font-display text-4xl leading-none font-extrabold uppercase">Destaques da rodada</h2>
        <p className="text-sm text-muted-foreground">O melhor no ataque, na criação e na defesa, o goleiro e o gol mais bonito</p>
      </div>

      <div className={cn("relative flex w-full max-w-sm shrink-0 animate-[reveal-fade_0.5s_ease-out_0.3s_both] flex-col gap-5 overflow-hidden rounded-2xl border border-white/8 px-3 py-5", PACK_THEMES[fieldTheme].field)}>
        <span aria-hidden className="absolute top-1/2 inset-x-0 h-px bg-white/8" />
        <span aria-hidden className="absolute top-1/2 left-1/2 size-28 -translate-1/2 rounded-full border border-white/8" />
        {ROWS.map((row) => (
          <div key={row.join("-")} className="relative flex justify-center gap-[clamp(1rem,6vw,2rem)]">
            {row.map((kind) => {
              const award = byKind.get(kind)?.[0];
              if (!award) return null;
              return (
                <div key={kind} className="flex w-[clamp(5rem,26vw,6.5rem)] flex-col items-center gap-1">
                  <HighlightCard award={award} order={order++} />
                  <span className="text-center text-[0.6875rem] leading-tight text-balance text-muted-foreground">{AWARD_LABELS[kind].title}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {extras.length > 0 && (
        <div className="relative flex animate-[reveal-fade_0.4s_ease-out_4.6s_both] flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground uppercase">Empates e outros destaques</p>
          <div className="flex flex-wrap justify-center gap-[clamp(1rem,6vw,2rem)]">
            {extras.map((award) => (
              <div key={award.id} className="flex w-[clamp(5rem,26vw,6.5rem)] flex-col items-center gap-1">
                <HighlightCard award={award} order={0} />
                <span className="text-center text-[0.6875rem] leading-tight text-balance text-muted-foreground">{AWARD_LABELS[award.kind].title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="relative h-11 w-full max-w-sm shrink-0 animate-[reveal-fade_0.4s_ease-out_4.8s_both] text-base"
        onClick={onNext}
      >
        {nextLabel}
      </Button>
    </section>
  );
}
