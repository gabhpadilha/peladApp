import { AWARD_ICONS } from "@/components/award-icons";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";
import { ZOEIRA_AWARDS, revealColorStyle } from "./reveal-theme";

type RevealAwardProps = {
  award: Award;
  nextLabel: string;
  onNext: () => void;
};

// Faíscas saindo da carta: direção de cada uma (classes literais para o Tailwind).
const SPARKS = [
  "[--reveal-dx:150px] [--reveal-dy:-120px] animate-[reveal-spark_0.9s_ease-out_2.6s_both]",
  "[--reveal-dx:-150px] [--reveal-dy:-110px] animate-[reveal-spark_0.9s_ease-out_2.68s_both]",
  "[--reveal-dx:170px] [--reveal-dy:40px] animate-[reveal-spark_0.9s_ease-out_2.76s_both]",
  "[--reveal-dx:-170px] [--reveal-dy:50px] animate-[reveal-spark_0.9s_ease-out_2.6s_both]",
  "[--reveal-dx:90px] [--reveal-dy:-190px] animate-[reveal-spark_0.9s_ease-out_2.68s_both]",
  "[--reveal-dx:-90px] [--reveal-dy:-190px] animate-[reveal-spark_0.9s_ease-out_2.76s_both]",
  "[--reveal-dx:120px] [--reveal-dy:150px] animate-[reveal-spark_0.9s_ease-out_2.6s_both]",
  "[--reveal-dx:-120px] [--reveal-dy:150px] animate-[reveal-spark_0.9s_ease-out_2.68s_both]",
  "[--reveal-dx:0px] [--reveal-dy:-220px] animate-[reveal-spark_0.9s_ease-out_2.76s_both]",
  "[--reveal-dx:200px] [--reveal-dy:-40px] animate-[reveal-spark_0.9s_ease-out_2.6s_both]",
  "[--reveal-dx:-200px] [--reveal-dy:-30px] animate-[reveal-spark_0.9s_ease-out_2.68s_both]",
];

/**
 * Uma carta, no estilo da entrada do jogador no FIFA: primeiro o prêmio,
 * depois a posição, o OVR "cai" na tela e a carta gira (a zoeira cai e amassa).
 * O pai troca a `key` a cada carta, para a sequência recomeçar.
 */
export function RevealAward({ award, nextLabel, onNext }: RevealAwardProps) {
  const Icon = AWARD_ICONS[award.kind];
  const isZoeira = ZOEIRA_AWARDS.includes(award.kind);
  const title = AWARD_LABELS[award.kind].title;

  return (
    <section
      aria-live="polite"
      aria-label={`${title}: ${award.card.nickname}`}
      style={revealColorStyle(award.kind, award.theme)}
      className="absolute inset-0 flex flex-col items-center px-6 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 animate-[reveal-fade_0.8s_ease-out_both]",
          isZoeira
            ? "bg-[radial-gradient(circle_at_50%_42%,oklch(0.35_0.03_280/0.5),transparent_62%)]"
            : "bg-[radial-gradient(circle_at_50%_42%,color-mix(in_oklch,var(--reveal-color)_45%,transparent),transparent_62%)]",
        )}
      />
      {!isZoeira && (
        <div
          aria-hidden
          className="absolute top-[42%] left-1/2 -mt-[28rem] -ml-[28rem] size-[56rem] animate-[reveal-fade_0.6s_ease-out_2.4s_both,reveal-spin_24s_linear_infinite] bg-[repeating-conic-gradient(from_0deg,color-mix(in_oklch,var(--reveal-color)_22%,transparent)_0deg_6deg,transparent_6deg_18deg)] opacity-50"
        />
      )}

      <div className="relative flex w-full flex-1 items-center justify-center perspective-[900px]">
        {/* Pistas antes da carta. Sem animação, a carta aparece direto. */}
        <div
          aria-hidden
          className="absolute inset-0 flex animate-[reveal-out_0.3s_ease-in_2.15s_forwards] flex-col items-center justify-center gap-6 font-display leading-none motion-reduce:hidden"
        >
          <div className="flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-4">
            <span className="flex size-16 items-center justify-center rounded-full border-2 border-(--reveal-color) text-(--reveal-color)">
              <Icon className="size-8" />
            </span>
            <span className="text-center text-5xl font-extrabold uppercase">{title}</span>
          </div>
          <div className="flex items-center gap-7">
            <span className="animate-[reveal-in_0.45s_ease-out_0.9s_both] text-6xl font-extrabold text-(--reveal-color)">
              {award.card.position}
            </span>
            <span className="animate-[reveal-slam_0.5s_ease-out_1.45s_both] text-[7.5rem] font-extrabold tabular-nums">
              {award.card.ovr ?? "–"}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "w-56",
            isZoeira
              ? "animate-[reveal-deflate_1s_cubic-bezier(0.3,0.7,0.4,1)_2.4s_both] saturate-[0.6]"
              : "animate-[reveal-flip_0.8s_cubic-bezier(0.2,0.9,0.3,1.1)_2.4s_both]",
          )}
        >
          <PlayerCard player={award.card} award={award} size="fill" />
        </div>

        {!isZoeira &&
          SPARKS.map((spark) => (
            <span
              key={spark}
              aria-hidden
              className={cn("absolute top-1/2 left-1/2 size-2 rounded-full bg-(--reveal-color) motion-reduce:hidden", spark)}
            />
          ))}
      </div>

      <div className="relative mt-4 flex animate-[reveal-fade_0.4s_ease-out_3s_both] flex-col items-center gap-1 text-center">
        <p className="font-display text-3xl font-extrabold uppercase">{title}</p>
        <p className="text-sm text-muted-foreground">
          {award.card.nickname} · {formatAwardResult(award)}
        </p>
      </div>

      <Button
        size="lg"
        className="relative mt-6 h-11 w-full max-w-sm animate-[reveal-fade_0.4s_ease-out_3.3s_both] text-base"
        onClick={onNext}
      >
        {nextLabel}
      </Button>
    </section>
  );
}
