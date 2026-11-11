import type { CSSProperties } from "react";
import { FrownIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";

type RevealZoeiraProps = {
  /** Bola Murcha (empate: mais de uma carta; cartas antigas de Fominha também caem aqui). */
  awards: Award[];
  nextLabel: string;
  onNext: () => void;
};

/**
 * A zoeira fecha a noite, depois do Melhor Jogador (2026-11-11): de propósito simples, sem o palco dos destaques
 * (pedido do dono do app). Fundo cinza apagado e a carta da Bola Murcha (a menor nota da rodada) cai e murcha. Só CSS.
 */
export function RevealZoeira({ awards, nextLabel, onNext }: RevealZoeiraProps) {
  const shown = awards.slice(0, 2);
  return (
    <section aria-live="polite" aria-label="Zoeira da rodada" className="absolute inset-0 overflow-hidden">
      <div aria-hidden className="absolute inset-0 animate-[reveal-fade_0.6s_ease-out_both] bg-[radial-gradient(ellipse_at_50%_45%,oklch(0.3_0.005_260),oklch(0.1_0.005_260)_70%)]" />

      <ul className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center gap-[4%] px-4">
        {shown.map((award, index) => (
          <li key={award.id} style={{ "--d": `${0.5 + index * 0.4}s` } as CSSProperties} className="w-[min(56%,15rem)]">
            <div className="stage-flop motion-reduce:opacity-100">
              <PlayerCard player={award.card} award={award} size="fill" />
            </div>
          </li>
        ))}
      </ul>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-linear-to-b from-black/80 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-black/90 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-1 px-4 pt-16 text-center">
        <span className="flex items-center gap-2 font-display text-3xl leading-none font-extrabold uppercase">
          <FrownIcon aria-hidden className="size-5 text-muted-foreground" />
          Zoeira da rodada
        </span>
        <p className="text-xs text-white/75">A menor nota da rodada leva a Bola Murcha</p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex animate-[reveal-fade_0.4s_ease-out_1.6s_both] flex-col items-center text-center leading-tight">
          <span className="font-display text-2xl font-bold uppercase">{AWARD_LABELS[shown[0]?.kind ?? "bola_murcha"].title}</span>
          <span className="text-sm text-white/75">
            {shown.map((award) => `${award.card.nickname} · ${formatAwardResult(award)}`).join("  ·  ")}
          </span>
        </div>
        <Button
          size="lg"
          className="h-11 w-full max-w-sm animate-[reveal-fade_0.4s_ease-out_2.1s_both] text-base"
          onClick={onNext}
        >
          {nextLabel}
        </Button>
      </div>
    </section>
  );
}
