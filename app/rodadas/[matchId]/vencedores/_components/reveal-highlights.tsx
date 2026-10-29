import { SparklesIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, formatAwardResult, type Award, type AwardKind } from "@/types/award";
import { revealColorStyle } from "./reveal-theme";

type RevealHighlightsProps = {
  /** Um prêmio por atributo da linha, o Melhor Goleiro e o Gol da Rodada. */
  awards: Award[];
  nextLabel: string;
  onNext: () => void;
};

/**
 * Onde cada prêmio fica no quadro: ataque e gol em cima, criação no meio, defesa e goleiro
 * embaixo. A última fileira guarda os prêmios por atributo das rodadas antigas (até 2026-10-29).
 */
const ROWS: readonly (readonly AwardKind[])[] = [
  ["atacante", "gol"],
  ["criativo"],
  ["defensor", "goleiro"],
  ["foguete", "garcom", "drible", "motor"],
];

// Atraso de entrada de cada carta, na ordem do quadro (classes literais para o Tailwind).
const POP_DELAYS = [
  "[animation-delay:0.5s]",
  "[animation-delay:0.75s]",
  "[animation-delay:1s]",
  "[animation-delay:1.25s]",
  "[animation-delay:1.5s]",
  "[animation-delay:1.75s]",
  "[animation-delay:2s]",
  "[animation-delay:2.25s]",
];

function HighlightCard({ award, order }: { award: Award; order: number }) {
  return (
    <div
      style={revealColorStyle(award.kind, award.theme)}
      className={cn(
        "flex w-[5.4rem] animate-[reveal-pop_0.45s_cubic-bezier(0.2,0.9,0.3,1.3)_both] flex-col items-center gap-1",
        POP_DELAYS[order % POP_DELAYS.length],
      )}
    >
      <PlayerCard player={award.card} award={award} size="fill" />
      <span className="max-w-full truncate rounded-full bg-(--reveal-color) px-2 text-[0.6875rem] font-semibold text-black tabular-nums">
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
export function RevealHighlights({ awards, nextLabel, onNext }: RevealHighlightsProps) {
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

      <div className="relative flex w-full max-w-sm shrink-0 animate-[reveal-fade_0.5s_ease-out_0.3s_both] flex-col gap-4 overflow-hidden rounded-2xl border border-white/8 bg-[repeating-linear-gradient(0deg,rgb(255_255_255/0.015)_0_40px,transparent_40px_80px)] bg-card px-2 py-4">
        <span aria-hidden className="absolute top-1/2 inset-x-0 h-px bg-white/8" />
        <span aria-hidden className="absolute top-1/2 left-1/2 size-28 -translate-1/2 rounded-full border border-white/8" />
        {ROWS.map((row) => (
          <div key={row.join("-")} className="relative flex justify-center gap-3">
            {row.map((kind) => {
              const award = byKind.get(kind)?.[0];
              if (!award) return null;
              return (
                <div key={kind} className="flex flex-col items-center gap-1">
                  <HighlightCard award={award} order={order++} />
                  <span className="text-[0.6875rem] leading-tight text-muted-foreground">{AWARD_LABELS[kind].title}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {extras.length > 0 && (
        <div className="relative flex animate-[reveal-fade_0.4s_ease-out_2.6s_both] flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground uppercase">Empates e outros destaques</p>
          <div className="flex flex-wrap justify-center gap-3">
            {extras.map((award) => (
              <div key={award.id} className="flex flex-col items-center gap-1">
                <HighlightCard award={award} order={0} />
                <span className="text-[0.6875rem] leading-tight text-muted-foreground">{AWARD_LABELS[award.kind].title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="relative h-11 w-full max-w-sm shrink-0 animate-[reveal-fade_0.4s_ease-out_2.8s_both] text-base"
        onClick={onNext}
      >
        {nextLabel}
      </Button>
    </section>
  );
}
