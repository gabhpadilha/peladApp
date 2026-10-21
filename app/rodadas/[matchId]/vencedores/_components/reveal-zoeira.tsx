import { FrownIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";

type RevealZoeiraProps = {
  /** Bola Murcha (empate: mais de uma carta; cartas antigas de Fominha também caem aqui). */
  awards: Award[];
  nextLabel: string;
  onNext: () => void;
};

// Atraso de cada carta caindo (classes literais para o Tailwind).
const DROP_DELAYS = ["[animation-delay:0.6s]", "[animation-delay:1.1s]", "[animation-delay:1.6s]", "[animation-delay:2.1s]"];

/**
 * A zoeira abre o pacote: a carta da Bola Murcha (a menor nota da rodada) cai e
 * amassa numa tela só (pedido do dono do app em 2026-10-21: menos animações).
 */
export function RevealZoeira({ awards, nextLabel, onNext }: RevealZoeiraProps) {
  return (
    <section
      aria-live="polite"
      aria-label="Zoeira da rodada"
      className="absolute inset-0 flex flex-col items-center gap-6 overflow-y-auto px-5 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-[reveal-fade_0.8s_ease-out_both] bg-[radial-gradient(circle_at_50%_40%,oklch(0.35_0.03_280/0.5),transparent_62%)]"
      />

      <div className="relative flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border-2 border-muted-foreground/60 text-muted-foreground">
          <FrownIcon aria-hidden className="size-6" />
        </span>
        <h2 className="font-display text-4xl leading-none font-extrabold uppercase">Zoeira da rodada</h2>
        <p className="text-sm text-muted-foreground">A menor nota da rodada leva a Bola Murcha</p>
      </div>

      <ul className={cn("relative grid w-full max-w-sm gap-4", awards.length === 1 ? "max-w-48 grid-cols-1" : "grid-cols-2")}>
        {awards.map((award, index) => (
          <li
            key={award.id}
            className={`flex min-w-0 animate-[reveal-deflate_1s_cubic-bezier(0.3,0.7,0.4,1)_both] flex-col items-center gap-2 text-center ${DROP_DELAYS[index % DROP_DELAYS.length]}`}
          >
            <PlayerCard player={award.card} award={award} size="fill" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-xl font-bold uppercase">{AWARD_LABELS[award.kind].title}</span>
              <span className="text-sm text-muted-foreground">
                {award.card.nickname} · {formatAwardResult(award)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <Button
        size="lg"
        className="relative mt-auto h-11 w-full max-w-sm shrink-0 animate-[reveal-fade_0.4s_ease-out_2.6s_both] text-base"
        onClick={onNext}
      >
        {nextLabel}
      </Button>
    </section>
  );
}
