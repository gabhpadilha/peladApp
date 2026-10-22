import Link from "next/link";
import { GhostIcon, TrophyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CardThemeKey } from "@/lib/card-themes";
import { cn } from "@/lib/utils";
import type { WinnersAlert } from "../_data-access/get-home-data";

type WinnersBannerProps = {
  alert: WinnersAlert;
};

/** Cores do aviso no tema das cartas da rodada (classes literais para o Tailwind). */
const BANNER_THEMES: Record<CardThemeKey, { box: string; eyebrow: string; cards: [string, string, string, string] }> = {
  default: {
    box: "border-award-craque-frame/50 bg-[radial-gradient(circle_at_85%_30%,oklch(0.4_0.08_85/0.55),transparent_55%),linear-gradient(160deg,oklch(0.24_0.01_80),oklch(0.11_0.005_80))]",
    eyebrow: "text-award-craque-foreground",
    cards: [
      "from-award-time-da-semana-frame to-award-time-da-semana-to",
      "from-award-gol-frame to-award-gol-to",
      "bg-award-craque-frame",
      "from-award-craque-from to-award-craque-to text-award-craque-foreground",
    ],
  },
  halloween: {
    box: "border-award-craque-halloween-frame/55 bg-[radial-gradient(circle_at_85%_30%,oklch(0.45_0.12_55/0.55),transparent_55%),linear-gradient(160deg,oklch(0.24_0.04_300),oklch(0.11_0.02_40))]",
    eyebrow: "text-award-craque-halloween-foreground",
    cards: [
      "from-award-gol-halloween-frame to-award-gol-halloween-to",
      "from-award-time-da-semana-halloween-frame to-award-time-da-semana-halloween-to",
      "bg-award-craque-halloween-frame",
      "from-award-craque-halloween-from to-award-craque-halloween-to text-award-craque-halloween-foreground",
    ],
  },
  brasileirao: {
    box: "border-award-craque-brasileirao-from/50 bg-[radial-gradient(circle_at_85%_30%,oklch(0.45_0.12_262/0.55),transparent_55%),linear-gradient(160deg,oklch(0.26_0.09_262),oklch(0.11_0.04_262))]",
    eyebrow: "text-award-craque-brasileirao-from",
    cards: [
      "from-award-gol-brasileirao-from to-award-gol-brasileirao-to",
      "from-award-time-da-semana-brasileirao-from to-award-time-da-semana-brasileirao-to",
      "bg-award-craque-brasileirao-frame",
      "from-award-craque-brasileirao-from to-award-craque-brasileirao-to text-award-craque-brasileirao-foreground",
    ],
  },
};

const CARD_SHAPE = "[clip-path:url(#player-card-shape)]";

function describe(alert: WinnersAlert): string {
  const cards = alert.cardCount === 1 ? "1 carta especial" : `${alert.cardCount} cartas especiais`;
  if (alert.cardCount === 0) return "O Time da Semana está esperando para ser revelado.";
  return alert.hasTeam
    ? `${cards} e o Time da Semana esperando para serem revelados.`
    : `${cards} esperando para ${alert.cardCount === 1 ? "ser revelada" : "serem reveladas"}.`;
}

/** "Confira os vencedores": aparece para cada jogador até ele abrir o pacote da rodada. */
export function WinnersBanner({ alert }: WinnersBannerProps) {
  const look = BANNER_THEMES[alert.theme];

  return (
    <section
      aria-labelledby="winners-title"
      className={cn("relative overflow-hidden rounded-2xl border p-4 motion-reduce:**:animate-none!", look.box)}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-2/5 animate-[reveal-shine_3.6s_ease-in-out_infinite] bg-linear-to-r from-transparent via-white/14 to-transparent"
      />
      {alert.theme === "halloween" && (
        <GhostIcon aria-hidden className="absolute -bottom-6 -left-5 size-28 text-white/6" />
      )}
      {alert.theme === "brasileirao" && (
        <TrophyIcon aria-hidden strokeWidth={1.2} className="absolute -bottom-6 -left-5 size-28 text-white/6" />
      )}

      {/* Três cartas viradas em leque (a do meio com "?"), flutuando. */}
      <div aria-hidden className="absolute top-4 right-3 h-30 w-33">
        <span
          className={cn(
            "absolute top-4.5 left-1 w-14.5 -rotate-14 animate-[reveal-float_3s_ease-in-out_infinite] bg-linear-135 aspect-[5/7.4]",
            CARD_SHAPE,
            look.cards[0],
          )}
        />
        <span
          className={cn(
            "absolute top-4.5 right-1 w-14.5 rotate-14 animate-[reveal-float_3s_ease-in-out_0.4s_infinite] bg-linear-135 aspect-[5/7.4]",
            CARD_SHAPE,
            look.cards[1],
          )}
        />
        <span
          className={cn(
            "absolute top-0 left-8.5 w-16 animate-[reveal-float_3s_ease-in-out_0.2s_infinite] aspect-[5/7.4]",
            CARD_SHAPE,
            look.cards[2],
          )}
        >
          <span
            className={cn(
              "absolute inset-[4%] flex items-center justify-center bg-linear-135 font-display text-3xl font-extrabold",
              CARD_SHAPE,
              look.cards[3],
            )}
          >
            ?
          </span>
        </span>
      </div>

      <div className="relative flex min-h-30 flex-col gap-1.5 pr-32">
        <p className={cn("flex items-center gap-2 text-xs font-semibold tracking-widest uppercase", look.eyebrow)}>
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative size-2 rounded-full bg-primary" />
          </span>
          Rodada {alert.round} fechada
        </p>
        <h2 id="winners-title" className="font-display text-4xl leading-[0.95] font-extrabold uppercase">
          Confira os vencedores
        </h2>
        <p className="text-sm text-white/85">{describe(alert)}</p>
      </div>

      <Button asChild size="lg" className="relative mt-4 h-11 w-full text-base">
        <Link href={`/rodadas/${alert.matchId}/vencedores`}>Abrir o pacote</Link>
      </Button>
    </section>
  );
}
