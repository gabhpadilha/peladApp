import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { ShowcaseCard } from "@/components/showcase-card";
import { formatShortDate } from "@/lib/format-date";
import { getCardSkin, type CardSkinKey } from "@/types/card-skin";
import { cn } from "@/lib/utils";

/**
 * Lançamento de skins nos pacotes, no estilo dos eventos do FIFA (pedido do dono do app em 2026-11-12): o 1º slide da Home enquanto
 * o lançamento vale. Mês novo = entrada nova em `PACK_DROPS` (as skins precisam estar no `pack_sets` daquele mês).
 * Sem `filter` nem `mix-blend-mode` (iPhone): o brilho e a chuva são degradês.
 */
type PackDrop = {
  /** `AAAA-MM`: o slide só aparece nesse mês. */
  month: string;
  /** Último dia em que as skins saem (`AAAA-MM-DD`). */
  until: string;
  eventLabel: string;
  title: [string, string];
  subtitle: string;
  /** Carta do meio, maior. */
  hero: CardSkinKey;
  heroRarity: string;
  /** Cartas dos lados (a 1ª à esquerda, a 2ª à direita) e a fileira de baixo. */
  sides: [CardSkinKey, CardSkinKey];
  row: readonly CardSkinKey[];
  /** Tons do evento: fundo, brilho atrás da carta do meio e cor do destaque. */
  look: { from: string; to: string; glow: string; accent: string };
};

const PACK_DROPS: readonly PackDrop[] = [
  {
    month: "2026-11",
    until: "2026-11-30",
    eventLabel: "Evento Toró · Pacotes",
    title: ["Novas skins", "nos pacotes"],
    subtitle: "Lendária Maré-Rei e 3 épicas novas",
    hero: "marerei",
    heroRarity: "Lendária",
    sides: ["diluvio", "granizo"],
    row: ["ciclone", "enxurrada"],
    look: { from: "#04141a", to: "#02070c", glow: "rgba(63,224,176,.35)", accent: "#f2cf6b" },
  },
];

export function getPackDrop(today: string): PackDrop | null {
  return PACK_DROPS.find((drop) => today.startsWith(drop.month) && today <= drop.until) ?? null;
}

function Badge({ children, tone }: { children: string; tone: "new" | "legend" | "epic" }) {
  return (
    <span
      className={cn(
        "rounded-sm px-1.5 py-0.5 text-[0.625rem] leading-none font-extrabold tracking-[0.18em] uppercase",
        tone === "new" && "bg-primary text-primary-foreground",
        tone === "legend" && "bg-amber-300 text-black",
        tone === "epic" && "bg-violet-400 text-black",
      )}
    >
      {children}
    </span>
  );
}

export function PackDropSlide({ drop }: { drop: PackDrop }) {
  const { look } = drop;
  return (
    <article
      className="relative flex w-full flex-col gap-4 overflow-hidden rounded-xl border border-white/10 p-4"
      style={{ background: `linear-gradient(160deg, ${look.from}, ${look.to})` }}
    >
      {/* Chuva em diagonal e faixas do lançamento (só degradês). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(105deg,transparent_0_14px,rgb(255_255_255/0.035)_14px_15px)]" />
      <div aria-hidden className="pointer-events-none absolute -top-10 -left-16 h-40 w-[140%] -rotate-12 bg-linear-to-r from-transparent via-white/[0.06] to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[38%] h-72"
        style={{ background: `radial-gradient(45% 50% at 50% 50%, ${look.glow}, transparent 70%)` }}
      />

      <header className="relative flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge tone="new">Novo</Badge>
          <p className="text-xs font-medium tracking-wide uppercase" style={{ color: look.accent }}>{drop.eventLabel}</p>
        </div>
        <h2 className="font-display text-4xl leading-[0.9] font-extrabold uppercase">
          {drop.title[0]}
          <br />
          <span style={{ color: look.accent }}>{drop.title[1]}</span>
        </h2>
        <p className="text-sm text-white/75">{drop.subtitle}</p>
        <p className="text-xs font-semibold tracking-wide text-white/60 uppercase">Só até {formatShortDate(drop.until)}</p>
      </header>

      {/* Destaque: a lendária no meio, maior, com as vizinhas inclinadas atrás. */}
      <div className="relative mx-auto grid w-full max-w-[23rem] grid-cols-[0.8fr_1.8fr_0.8fr] items-center">
        <div className="translate-x-[30%] translate-y-[4%] -rotate-8 opacity-85">
          <ShowcaseCard skin={drop.sides[0]} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          <ShowcaseCard skin={drop.hero} />
          <div className="flex flex-col items-center gap-1">
            <Badge tone="legend">{drop.heroRarity}</Badge>
            <span className="font-display text-xl leading-none font-extrabold uppercase">{getCardSkin(drop.hero).name}</span>
          </div>
        </div>
        <div className="-translate-x-[30%] translate-y-[4%] rotate-8 opacity-85">
          <ShowcaseCard skin={drop.sides[1]} />
        </div>
      </div>

      <ul className="relative grid grid-cols-3 gap-2">
        {[drop.sides[1], ...drop.row].map((skin) => (
          <li key={skin} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-black/35 px-1.5 py-2">
            <div className="w-14"><ShowcaseCard skin={skin} /></div>
            <span className="font-display text-sm leading-none font-bold uppercase">{getCardSkin(skin).name}</span>
            <Badge tone="epic">Épica</Badge>
          </li>
        ))}
      </ul>

      <Link
        href="/loja"
        className="relative inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Abrir pacotes
        <ArrowRightIcon aria-hidden className="size-4" />
      </Link>
    </article>
  );
}
