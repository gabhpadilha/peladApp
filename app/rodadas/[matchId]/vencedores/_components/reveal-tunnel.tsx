import type { CSSProperties } from "react";
import { AWARD_ICONS } from "@/components/award-icons";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";
import { revealColorStyle } from "./reveal-theme";

type RevealTunnelProps = {
  award: Award;
  nextLabel: string;
  onNext: () => void;
};

/** Os anéis do túnel: um novo a cada 0,3 s. */
const RINGS = [0, 0.3, 0.6, 0.9, 1.2] as const;
/** Flashes da torcida nas bordas: posição e atraso. */
const CAMERAS: readonly { left: string; top: string; d: string }[] = [
  { left: "8%", top: "20%", d: "0.1s" }, { left: "90%", top: "28%", d: "0.5s" }, { left: "14%", top: "62%", d: "0.9s" },
  { left: "84%", top: "70%", d: "0.3s" }, { left: "5%", top: "44%", d: "1.4s" }, { left: "94%", top: "50%", d: "0.8s" },
  { left: "22%", top: "12%", d: "1.7s" }, { left: "76%", top: "14%", d: "1.2s" },
];
/** Faíscas na chegada da carta: direção de cada uma. */
const SPARKS: readonly [number, number][] = [
  [150, -120], [-150, -110], [170, 40], [-170, 50], [90, -190], [-90, -190], [120, 150], [-120, 150],
];

/**
 * O Melhor Jogador entra pelo túnel do estádio (pedido do dono do app em 2026-11-10): o túnel escuro corre, uma
 * silhueta caminha até a luz do fundo, a torcida pisca as câmeras, o clarão e a carta chega. Só `transform` e `opacity`;
 * sem animação, a carta aparece direto. O pai troca a `key` a cada carta.
 */
export function RevealTunnel({ award, nextLabel, onNext }: RevealTunnelProps) {
  const Icon = AWARD_ICONS[award.kind];
  const title = AWARD_LABELS[award.kind].title;

  return (
    <section
      aria-live="polite"
      aria-label={`${title}: ${award.card.nickname}`}
      style={revealColorStyle(award.kind, award.theme)}
      className="absolute inset-0 flex flex-col items-center px-6 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      {/* O túnel (some quando a carta chega). */}
      <div aria-hidden className="tunnel-layer pointer-events-none absolute inset-0 overflow-hidden bg-black motion-reduce:hidden">
        <span className="tunnel-light absolute top-[42%] left-1/2 size-72 -translate-1/2 rounded-full bg-[radial-gradient(circle,white,color-mix(in_oklch,var(--reveal-color)_70%,white)_25%,transparent_68%)]" />
        {RINGS.map((delay) => (
          <span
            key={delay}
            className="tunnel-ring absolute top-[42%] left-1/2 h-[30%] w-[44%] -translate-1/2 rounded-[18%] border-[3px] border-(--reveal-color)"
            style={{ "--d": `${delay}s` } as CSSProperties}
          />
        ))}
        <span className="tunnel-walker absolute top-[42%] left-1/2 aspect-5/7 w-52 -translate-1/2 rounded-[9%/6.5%] bg-black shadow-[0_0_30px_6px_color-mix(in_oklch,var(--reveal-color)_55%,transparent)] ring-2 ring-(--reveal-color)" />
        {CAMERAS.map((camera) => (
          <span
            key={`${camera.left}-${camera.top}`}
            className="tunnel-cam absolute size-1.5 rounded-full bg-white shadow-[0_0_10px_4px_white]"
            style={{ left: camera.left, top: camera.top, "--d": camera.d } as CSSProperties}
          />
        ))}
        <span className="absolute inset-x-0 bottom-[26%] flex animate-[reveal-in_0.5s_ease-out_0.3s_both] flex-col items-center gap-1 font-display">
          <span className="text-sm font-bold tracking-[0.3em] text-(--reveal-color) uppercase">Ele vem aí</span>
          <span className="text-4xl leading-none font-extrabold uppercase">{title}</span>
        </span>
      </div>
      <span aria-hidden className="tunnel-flash pointer-events-none absolute inset-0 z-10 bg-white motion-reduce:hidden" />

      {/* O fundo de holofotes da chegada. */}
      <div
        aria-hidden
        className="absolute inset-0 animate-[reveal-fade_0.8s_ease-out_2.4s_both] bg-[radial-gradient(circle_at_50%_42%,color-mix(in_oklch,var(--reveal-color)_45%,transparent),transparent_62%)]"
      />
      <div
        aria-hidden
        className="absolute top-[42%] left-1/2 -mt-[28rem] -ml-[28rem] size-[56rem] animate-[reveal-fade_0.6s_ease-out_2.6s_both,reveal-spin_24s_linear_infinite] bg-[repeating-conic-gradient(from_0deg,color-mix(in_oklch,var(--reveal-color)_22%,transparent)_0deg_6deg,transparent_6deg_18deg)] opacity-50"
      />

      <div className="relative flex w-full flex-1 items-center justify-center">
        <div className="tunnel-card w-56 motion-reduce:opacity-100">
          <PlayerCard player={award.card} award={award} size="fill" />
        </div>
        {SPARKS.map(([dx, dy], index) => (
          <span
            key={index}
            aria-hidden
            className="absolute top-1/2 left-1/2 size-2 animate-[reveal-spark_0.9s_ease-out_both] rounded-full bg-(--reveal-color) motion-reduce:hidden"
            style={{ "--reveal-dx": `${dx}px`, "--reveal-dy": `${dy}px`, animationDelay: `${2.6 + (index % 3) * 0.08}s` } as CSSProperties}
          />
        ))}
      </div>

      <div className="relative mt-4 flex animate-[reveal-fade_0.4s_ease-out_3.3s_both] flex-col items-center gap-1 text-center">
        <span className="flex items-center gap-2 font-display text-3xl font-extrabold uppercase">
          <Icon aria-hidden className="size-6 text-(--reveal-color)" />
          {title}
        </span>
        <p className="text-sm text-muted-foreground">
          {award.card.nickname} · {formatAwardResult(award)}
        </p>
      </div>

      <Button
        size="lg"
        className="relative mt-6 h-11 w-full max-w-sm animate-[reveal-fade_0.4s_ease-out_3.6s_both] text-base"
        onClick={onNext}
      >
        {nextLabel}
      </Button>
    </section>
  );
}
