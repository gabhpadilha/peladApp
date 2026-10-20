import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, CoinsIcon, GhostIcon, SparklesIcon, StoreIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { formatCoins } from "@/components/coin-pill";
import { PlayerCard } from "@/components/player-card";
import { withAwardBonus } from "@/lib/award-bonus";
import type { CardThemeKey, CurrentCardEvent } from "@/lib/card-themes";
import { formatShortDate } from "@/lib/format-date";
import { COIN_RULES, XP_RULES, type LevelProgress } from "@/lib/progression";
import type { AwardKind } from "@/types/award";
import type { CardSkinKey } from "@/types/card-skin";
import type { Player } from "@/types/player";
import { cn } from "@/lib/utils";
import { NewsCarousel } from "./news-carousel";

type NewsSliderProps = {
  event: CurrentCardEvent;
  player: Player;
  progress: LevelProgress;
  balance: number;
};

function formatDaysLeft(daysLeft: number): string {
  if (daysLeft === 0) return "último dia";
  return daysLeft === 1 ? "falta 1 dia" : `faltam ${daysLeft} dias`;
}

/** Moldura comum dos slides: selo, título, texto, visual e o botão no pé. */
function Slide({
  icon: Icon,
  eyebrow,
  title,
  meta,
  text,
  visual,
  href,
  cta,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  meta?: string;
  text: string;
  visual: ReactNode;
  href: string;
  cta: string;
}) {
  return (
    <article className="relative flex w-full flex-col gap-4 overflow-hidden rounded-xl border bg-card p-4">
      <Icon aria-hidden className="pointer-events-none absolute -top-4 -right-4 size-28 text-muted-foreground/10" />
      <div className="relative flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{eyebrow}</p>
        <h2 className="font-display text-2xl font-bold tracking-wide uppercase">{title}</h2>
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="relative flex flex-1 items-center justify-center">{visual}</div>
      <Link
        href={href}
        className="relative inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-muted text-base font-medium transition-colors hover:bg-muted/70"
      >
        {cta}
        <ArrowRightIcon aria-hidden className="size-4" />
      </Link>
    </article>
  );
}

/** Três cartas em leque, a do meio maior (prêmios do evento ou cartas da Loja). */
function CardFan({ cards }: { cards: [ReactNode, ReactNode, ReactNode] }) {
  return (
    <div className="grid w-full max-w-60 grid-cols-[1fr_1.25fr_1fr] items-end gap-1.5">
      <div className="translate-y-[-6%] -rotate-6">{cards[0]}</div>
      <div className="z-10">{cards[1]}</div>
      <div className="translate-y-[-6%] rotate-6">{cards[2]}</div>
    </div>
  );
}

type Chip = { label: string; value: string };

/** Regras resumidas em chips (a lista completa fica na Loja). */
function Chips({ items, isCoin = false }: { items: readonly Chip[]; isCoin?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
          <span className="text-muted-foreground">{item.label}</span>
          <span className={cn("font-semibold tabular-nums", isCoin && "text-amber-200")}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

const pickRules = (rules: readonly Chip[], labels: readonly string[]) =>
  rules.filter((rule) => labels.includes(rule.label));

const XP_CHIPS = pickRules(XP_RULES, ["Nota da rodada × 10", "Enviar as suas notas", "Melhor Jogador"]);
const COIN_CHIPS = pickRules(COIN_RULES, ["Jogar uma rodada", "Enviar as suas notas", "Melhor Jogador", "Subir de nível"]);

/** Texto do 1º slide por tema do mês. Tema novo: entre aqui (e em `CARD_THEMES`). */
const EVENT_COPY: Record<CardThemeKey, { eyebrow: string; title: string; icon: LucideIcon }> = {
  halloween: { eyebrow: "Evento de outubro", title: "Halloween na pelada", icon: GhostIcon },
  default: { eyebrow: "Coleção", title: "Cartas especiais", icon: SparklesIcon },
};

const EVENT_FAN: [AwardKind, AwardKind, AwardKind] = ["gol", "craque", "bola_murcha"];
const SHOP_FAN: [CardSkinKey, CardSkinKey, CardSkinKey] = ["safira", "esmeralda", "icone"];

/** Novidades do app na home: evento do mês, Loja, XP e PeladaCoins. */
export function NewsSlider({ event, player, progress, balance }: NewsSliderProps) {
  const eventCopy = EVENT_COPY[event.theme];
  const percent = Math.min(100, Math.round((progress.xpIntoLevel / progress.xpNeeded) * 100));

  const slides = [
    {
      key: "evento",
      title: eventCopy.title,
      content: (
        <Slide
          icon={eventCopy.icon}
          eyebrow={eventCopy.eyebrow}
          title={eventCopy.title}
          meta={
            event.endDate !== null && event.daysLeft !== null
              ? `Até ${formatShortDate(event.endDate)} · ${formatDaysLeft(event.daysLeft)}`
              : undefined
          }
          text="Vote nos prêmios na tela de notas: o mais votado leva a carta com o visual do evento, que fica na coleção para sempre."
          visual={
            <CardFan
              cards={EVENT_FAN.map((kind) => (
                <PlayerCard key={kind} player={withAwardBonus(player, kind)} award={{ kind, theme: event.theme }} size="fill" />
              )) as [ReactNode, ReactNode, ReactNode]}
            />
          }
          href={`/jogadores/${player.id}/colecao`}
          cta="Ver a coleção"
        />
      ),
    },
    {
      key: "loja",
      title: "Loja",
      content: (
        <Slide
          icon={StoreIcon}
          eyebrow="Novidade"
          title="Loja de cartas"
          text="Troque o visual da sua carta por uma premium. Novas cartas liberam por nível; a Esmeralda já está liberada."
          visual={
            <CardFan
              cards={SHOP_FAN.map((skin) => (
                <PlayerCard key={skin} player={{ ...player, cardSkin: skin }} size="fill" />
              )) as [ReactNode, ReactNode, ReactNode]}
            />
          }
          href="/loja"
          cta="Ir para a Loja"
        />
      ),
    },
    {
      key: "xp",
      title: "XP e nível",
      content: (
        <Slide
          icon={TrendingUpIcon}
          eyebrow="Pontos de experiência"
          title="XP e nível"
          text="Cada rodada fechada dá XP, e ele nunca cai. Subir de nível libera cartas na Loja."
          visual={
            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-xl font-bold uppercase">Seu nível {progress.level}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {progress.xpIntoLevel} / {progress.xpNeeded} XP
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  {/* Largura dinâmica: o Tailwind não gera classes por valor calculado. */}
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <Chips items={XP_CHIPS} />
            </div>
          }
          href={`/jogadores/${player.id}`}
          cta="Ver meu nível"
        />
      ),
    },
    {
      key: "coins",
      title: "PeladaCoins",
      content: (
        <Slide
          icon={CoinsIcon}
          eyebrow="Moeda do app"
          title="PeladaCoins"
          text="Ganhe jogando e gaste na Loja. O que você compra é seu para sempre."
          visual={
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg border border-amber-300/30 bg-amber-300/10 p-3">
                <span className="text-sm text-amber-200/80">Seu saldo</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl leading-none font-extrabold text-amber-200 tabular-nums">
                    {formatCoins(balance)}
                  </span>
                  <span className="text-sm text-amber-200/70">PC</span>
                </span>
              </div>
              <Chips items={COIN_CHIPS} isCoin />
            </div>
          }
          href="/loja"
          cta="Gastar na Loja"
        />
      ),
    },
  ];

  return <NewsCarousel label="Novidades do app" slides={slides} />;
}
