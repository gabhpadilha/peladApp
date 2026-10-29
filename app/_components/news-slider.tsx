import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, CoinsIcon, CrownIcon, GhostIcon, SparklesIcon, StoreIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { formatCoins } from "@/components/coin-pill";
import { PlayerCard } from "@/components/player-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import { withAwardBonus } from "@/lib/award-bonus";
import { CARD_THEME_LABELS, type CardThemeKey, type CurrentCardEvent } from "@/lib/card-themes";
import { formatShortDate } from "@/lib/format-date";
import { COIN_RULES, XP_RULES, type LevelProgress } from "@/lib/progression";
import { getNextPlayerOfTheMonthDate } from "@/lib/player-of-the-month";
import { PLAYER_OF_THE_MONTH_MIN_RATINGS, type AwardKind } from "@/types/award";
import { CARD_SKINS, isCardSkinOnSale, type CardSkinKey } from "@/types/card-skin";
import type { ShopSale } from "@/lib/shop-sale";
import type { Player } from "@/types/player";
import { cn } from "@/lib/utils";
import { NewsCarousel } from "./news-carousel";

type NewsSliderProps = {
  event: CurrentCardEvent;
  /** "Hoje", `AAAA-MM-DD` (horário de Brasília): quais cartas de evento estão à venda. */
  today: string;
  /** Promoção da Loja valendo hoje (ex.: Black Friday). */
  shopSale: ShopSale | null;
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
    <div className="grid w-full max-w-64 grid-cols-[1fr_1.25fr_1fr] items-end gap-1.5 sm:max-w-96">
      <div className="translate-y-[-6%] -rotate-6">{cards[0]}</div>
      <div className="z-10">{cards[1]}</div>
      <div className="translate-y-[-6%] rotate-6">{cards[2]}</div>
    </div>
  );
}

type Chip = { label: string; value: string };

/** Regras resumidas em chips (a lista completa fica na Loja). */
function Chips({ items, isCoin = false, className }: { items: readonly Chip[]; isCoin?: boolean; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        // Cada chip numa linha só: quebra a fileira, nunca o texto do chip.
        <li key={item.label} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap">
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
/** Como ganhar o Time do Mês (espelha `compute_match_awards`). */
const PLAYER_OF_THE_MONTH_CHIPS: readonly Chip[] = [
  { label: "Linha", value: "4 maiores médias" },
  { label: "Gol", value: "maior média" },
  { label: "Mínimo", value: `${PLAYER_OF_THE_MONTH_MIN_RATINGS} notas no mês` },
  { label: "Quando", value: "última quinta" },
  { label: "Bônus", value: "+1 em tudo" },
];

const COIN_CHIPS = pickRules(COIN_RULES, ["Jogar uma rodada", "Enviar as suas notas", "Melhor Jogador", "Subir de nível"]);

/** Texto do 1º slide por tema do mês. Tema novo: entre aqui (e em `CARD_THEMES`). */
const EVENT_COPY: Record<CardThemeKey, { eyebrow: string; title: string; icon: LucideIcon }> = {
  halloween: { eyebrow: "Evento de outubro", title: "Halloween na pelada", icon: GhostIcon },
  default: { eyebrow: "Coleção", title: "Cartas especiais", icon: SparklesIcon },
};

const EVENT_FAN: [AwardKind, AwardKind, AwardKind] = ["gol", "craque", "bola_murcha"];
const SHOP_FAN: [CardSkinKey, CardSkinKey, CardSkinKey] = ["safira", "esmeralda", "icone"];

const listFormatter = new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" });

/** Cartas de evento à venda em `today`. */
function getEventSkins(today: string) {
  return CARD_SKINS.filter((skin) => "event" in skin && isCardSkinOnSale(skin, today));
}

/** Texto do slide da Loja: com poucas cartas de evento, os nomes; com muitas, a quantidade. */
function describeEventSkins(skins: ReturnType<typeof getEventSkins>): string {
  const level = Math.min(...skins.map((skin) => skin.level));
  const what = skins.length <= 3 ? listFormatter.format(skins.map((skin) => skin.name)) : `${skins.length} personalizações do evento`;
  return `Chegaram ${what}, no nível ${level}. Só ficam à venda durante o evento; quem comprar continua usando depois.`;
}
/**
 * Novidades do app na home: Time do Mês (a mais nova), evento do mês, Time da
 * Semana, Loja (com as cartas do evento), XP e CanchaCoins.
 */
export function NewsSlider({ event, today, shopSale, player, progress, balance }: NewsSliderProps) {
  const eventCopy = EVENT_COPY[event.theme];
  const percent = Math.min(100, Math.round((progress.xpIntoLevel / progress.xpNeeded) * 100));
  // Com evento na Loja, as cartas dele vão no leque (a primeira no meio).
  const eventSkins = getEventSkins(today);
  const shopFan: [CardSkinKey, CardSkinKey, CardSkinKey] =
    eventSkins.length >= 2 ? [eventSkins[1].key, eventSkins[0].key, "esmeralda"] : SHOP_FAN;

  const slides = [
    {
      key: "jogador-do-mes",
      title: "Time do Mês",
      content: (
        <Slide
          icon={CrownIcon}
          eyebrow="Novidade · sem votação"
          title="Time do Mês"
          meta={`Próxima carta: ${formatShortDate(getNextPlayerOfTheMonthDate(today))}, ao fechar a rodada`}
          text="Na última quinta do mês, as 4 maiores médias de notas do mês na linha e a maior do gol levam a carta mais rara da pelada."
          visual={
            // Carta e chips lado a lado; no celular, carta menor e chips um por linha, para o
            // slide caber na tela sem rolar (pedido do dono do app em 2026-10-29).
            <div className="flex w-full items-center gap-3 sm:gap-5 sm:pr-3">
              <div className="w-24 shrink-0 sm:w-48">
                <PlayerCard
                  player={withAwardBonus(SAMPLE_PLAYER, "jogador_do_mes")}
                  award={{ kind: "jogador_do_mes", theme: "default" }}
                  size="fill"
                />
              </div>
              <Chips items={PLAYER_OF_THE_MONTH_CHIPS} className="min-w-0 flex-col items-start sm:flex-row [&>li]:text-[0.6875rem] sm:[&>li]:text-xs" />
            </div>
          }
          href={`/jogadores/${player.id}/colecao`}
          cta="Ver a coleção"
        />
      ),
    },
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
          text="As notas da rodada decidem Melhor Jogador, Melhor Atacante, Mais Criativo, Melhor Defensor, Goleiro e a Bola Murcha; só o Gol é no voto. A carta vem com o visual do evento e fica na coleção para sempre."
          visual={
            <CardFan
              cards={EVENT_FAN.map((kind) => (
                <PlayerCard key={kind} player={withAwardBonus(SAMPLE_PLAYER, kind)} award={{ kind, theme: event.theme }} size="fill" />
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
          eyebrow={eventSkins.length > 0 ? `Novidade · ${CARD_THEME_LABELS[event.theme]}` : "Novidade"}
          title="Loja de cartas"
          meta={
            shopSale
              ? `${shopSale.label}: -${shopSale.percent}% em tudo até ${formatShortDate(shopSale.end)}`
              : eventSkins.length > 0 && event.endDate !== null && event.daysLeft !== null
                ? `Cartas de evento até ${formatShortDate(event.endDate)} · ${formatDaysLeft(event.daysLeft)}`
                : undefined
          }
          text={
            eventSkins.length > 0
              ? describeEventSkins(eventSkins)
              : "Troque o visual da sua carta por uma premium. Novas cartas liberam por nível; a Esmeralda é grátis para todo mundo."
          }
          visual={
            <CardFan
              cards={shopFan.map((skin) => (
                <PlayerCard key={skin} player={{ ...SAMPLE_PLAYER, cardSkin: skin }} size="fill" />
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
      title: "CanchaCoins",
      content: (
        <Slide
          icon={CoinsIcon}
          eyebrow="Moeda do app"
          title="CanchaCoins"
          text="Ganhe jogando e gaste na Loja. O que você compra é seu para sempre."
          visual={
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg border border-amber-300/30 bg-amber-300/10 p-3">
                <span className="text-sm text-amber-200/80">Seu saldo</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl leading-none font-extrabold text-amber-200 tabular-nums">
                    {formatCoins(balance)}
                  </span>
                  <span className="text-sm text-amber-200/70">CC</span>
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
