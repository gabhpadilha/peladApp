import { ShowcaseCard } from "@/components/showcase-card";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftRightIcon, ArrowRightIcon, CloudLightningIcon, GiftIcon, GemIcon, TagIcon, GhostIcon, MedalIcon, SparklesIcon, StoreIcon, TrophyIcon, type LucideIcon } from "lucide-react";
import { formatCoins } from "@/components/coin-pill";
import { RankInsignia } from "@/components/cancha-card";
import { CARD_RANK_LABELS, getCardRank, RANK_FLAT_CLASSES, type CardRank } from "@/lib/card-rank";
import { CARD_TIER_MIN_OVR, getTierProgress } from "@/lib/card-tier";
import { type CardThemeKey, type CurrentCardEvent } from "@/lib/card-themes";
import { getCurrentShopEvent } from "@/lib/shop-events";
import { formatShortDate } from "@/lib/format-date";
import { getNextPlayerOfTheMonthDate } from "@/lib/player-of-the-month";
import type { AwardKind } from "@/types/award";
import { CARD_SKINS, isCardSkinOnSale, type CardSkinKey } from "@/types/card-skin";
import { getSalePrice, type ShopSale } from "@/lib/shop-sale";
import type { Player } from "@/types/player";
import { cn } from "@/lib/utils";
import { MarketGuideVisual, PacksGuideVisual, RarityGuideVisual } from "./news-guide";
import { NewsCarousel } from "./news-carousel";

type NewsSliderProps = {
  event: CurrentCardEvent;
  /** "Hoje", `AAAA-MM-DD` (horário de Brasília): quais cartas de evento estão à venda. */
  today: string;
  /** Promoção da Loja valendo hoje (ex.: Black Friday). */
  shopSale: ShopSale | null;
  player: Player;
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

/**
 * Arte da Black Friday (pedido do dono do app em 2026-10-31): etiqueta preta com o desconto
 * grande e, ao lado, as cartas em destaque com o preço de tabela riscado e o novo.
 */
function SaleBanner({ sale, skins }: { sale: ShopSale; skins: readonly { key: CardSkinKey; name: string; price: number }[] }) {
  return (
    <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-xl border border-white/15 bg-black p-3 sm:gap-5 sm:p-4">
      <div className="flex flex-col items-center rounded-lg bg-white px-2.5 py-2 text-black">
        <span className="text-[0.5625rem] font-bold tracking-[0.15em] whitespace-nowrap uppercase">{sale.label}</span>
        <span className="font-display text-4xl leading-none font-extrabold tabular-nums sm:text-5xl">-{sale.percent}%</span>
        <span className="text-[0.625rem] font-semibold tracking-widest uppercase">em tudo</span>
      </div>
      <ul className="flex min-w-0 flex-col gap-2">
        {skins.map((skin) => (
          <li key={skin.key} className="flex items-center gap-2">
            <div className="w-8 shrink-0">
              <ShowcaseCard skin={skin.key} />
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm">{skin.name}</span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground tabular-nums line-through">{formatCoins(skin.price)}</span>
                <span className="text-sm font-semibold text-amber-200 tabular-nums">{formatCoins(getSalePrice(skin.price, sale))} CC</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** As patentes em ordem, com a faixa de OVR de cada uma (mesmos cortes de `CARD_TIER_MIN_OVR`). */
const RANK_LADDER: readonly { rank: CardRank; range: string }[] = [
  { rank: "peneira", range: "sem OVR" },
  { rank: "base", range: `até ${CARD_TIER_MIN_OVR.silver - 1}` },
  { rank: "profissional", range: `${CARD_TIER_MIN_OVR.silver}–${CARD_TIER_MIN_OVR.gold - 1}` },
  { rank: "selecao", range: `${CARD_TIER_MIN_OVR.gold}–${CARD_TIER_MIN_OVR.rare - 1}` },
  { rank: "lenda", range: `${CARD_TIER_MIN_OVR.rare}+` },
];

const RANK_BY_TIER = { bronze: "base", silver: "profissional", gold: "selecao", rare: "lenda" } as const;

/** Onde o jogador está e quanto falta para a próxima patente. */
function rankStatus(ovr: number | null): string {
  if (ovr === null) return "Você está na Peneira: receba notas numa rodada fechada para ganhar o seu OVR.";
  const progress = getTierProgress(ovr);
  const current = CARD_RANK_LABELS[getCardRank(ovr)];
  if (!progress.next) return `Você é ${current}: a patente mais alta.`;
  return `Você é ${current} · faltam ${progress.next.missing} de OVR para ${CARD_RANK_LABELS[RANK_BY_TIER[progress.next.tier]]}`;
}

/** A escada das patentes: selo com a insígnia, nome e faixa de OVR; a do jogador em destaque. */
function RankLadder({ current }: { current: CardRank }) {
  return (
    <ol className="flex w-full justify-between gap-1 sm:mx-auto sm:max-w-xl">
      {RANK_LADDER.map(({ rank, range }) => {
        const isCurrent = rank === current;
        return (
          <li key={rank} className={cn("flex flex-col items-center gap-1 text-center", !isCurrent && "opacity-60")}>
            <span
              className={cn(
                "flex h-11 w-9 flex-col items-center justify-center pb-1.5 sm:h-16 sm:w-13 sm:pb-2.5 [clip-path:polygon(0_0,100%_0,100%_76%,50%_100%,0_76%)]",
                RANK_FLAT_CLASSES[rank],
              )}
            >
              <RankInsignia rank={rank} className="h-3.5 w-6 sm:h-5 sm:w-9" />
            </span>
            <span className={cn("text-[0.6875rem] leading-tight font-semibold whitespace-nowrap sm:text-sm", isCurrent && "text-primary")}>
              {CARD_RANK_LABELS[rank]}
            </span>
            <span className="text-[0.625rem] leading-none text-muted-foreground tabular-nums sm:text-xs">{range}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** As duas cartas da última quinta do mês (espelham `compute_match_awards`). */
const MONTH_CARDS: readonly { kind: AwardKind; title: string; text: string }[] = [
  { kind: "jogador_do_mes", title: "Time do Mês", text: "Top 5 do ranking do mês" },
  { kind: "campeao_do_mes", title: "Campeão do Mês", text: "1º do ranking do mês" },
];

/** Os pontos de cada rodada, em chips curtos (os mesmos valores de `POINTS_RULES`). */
const POINTS_CHIPS: readonly Chip[] = [
  { label: "Rodada", value: "OVR da rodada" },
  { label: "Melhor Jogador", value: "+40" },
  { label: "Outros prêmios", value: "+20" },
  { label: "Gol confirmado", value: "+10" },
];

/** Texto do 1º slide por tema do mês. Tema novo: entre aqui (e em `CARD_THEMES`). */
const EVENT_COPY: Record<CardThemeKey, { eyebrow: string; title: string; icon: LucideIcon }> = {
  halloween: { eyebrow: "Evento de outubro", title: "Halloween na pelada", icon: GhostIcon },
  temporal: { eyebrow: "Evento de novembro", title: "Toró na pelada", icon: CloudLightningIcon },
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
  const levels = skins.map((skin) => skin.level);
  const level = Math.min(...levels);
  const what = skins.length <= 3 ? listFormatter.format(skins.map((skin) => skin.name)) : `${skins.length} personalizações do evento`;
  const from = levels.every((value) => value === level) ? "no" : "a partir do";
  return `Chegaram ${what}, ${from} nível ${level}. Só ficam à venda durante o evento; quem comprar continua usando depois.`;
}
/**
 * Novidades do app na home: promoção, ranking por pontos (com as cartas do Time do Mês e do
 * Campeão do Mês), evento do mês, Loja (com as cartas do evento) e Patentes. XP e CanchaCoins
 * saíram em 2026-11-02 (pedido do dono do app: já aparecem na Carreira e na Loja).
 */
export function NewsSlider({ event, today, shopSale, player }: NewsSliderProps) {
  const eventCopy = EVENT_COPY[event.theme];
  // Com evento na Loja, as cartas dele vão no leque (a primeira no meio).
  const eventSkins = getEventSkins(today);
  // O evento da Loja é separado do tema dos prêmios (dezembro: Natal nos prêmios, "Destino" na Loja).
  const shopEvent = getCurrentShopEvent(today);
  // A carta de prestígio do evento (a Lenda do Trovão, a mais cara) vai no meio, maior; as outras duas dos lados (pedido do dono do app em 2026-11-02).
  const flagship = eventSkins.reduce<(typeof eventSkins)[number] | null>((best, skin) => (best === null || skin.price > best.price ? skin : best), null);
  const sideSkins = eventSkins.filter((skin) => skin !== flagship);
  const shopFan: [CardSkinKey, CardSkinKey, CardSkinKey] =
    flagship && sideSkins.length >= 2 ? [sideSkins[1].key, flagship.key, sideSkins[0].key] : SHOP_FAN;

  // Na Black Friday: as cartas do evento (ou as premium mais caras) com o preço novo.
  const saleSkins = (eventSkins.length > 0 ? eventSkins : CARD_SKINS.filter((skin) => !("event" in skin) && skin.price > 0)).slice(0, 3);

  const slides = [
    ...(shopSale
      ? [
          {
            key: "promocao",
            title: shopSale.label,
            content: (
              <Slide
                icon={TagIcon}
                eyebrow="Promoção na Loja"
                title={shopSale.label}
                meta={`-${shopSale.percent}% em tudo até ${formatShortDate(shopSale.end)}`}
                text={`Pacotes e cartas da Loja com ${shopSale.percent}% de desconto. O preço novo já aparece na Loja; o que você comprar é seu para sempre.`}
                visual={<SaleBanner sale={shopSale} skins={saleSkins} />}
                href="/loja"
                cta="Aproveitar na Loja"
              />
            ),
          },
        ]
      : []),
    {
      key: "pacotes",
      title: "Pacotes de skins",
      content: (
        <Slide
          icon={GiftIcon}
          eyebrow="Novidade · pacotes"
          title="Pacotes de skins"
          meta={shopEvent.label ? `Conjunto do mês: ${shopEvent.label}` : undefined}
          text="Cada pacote traz uma skin sorteada do conjunto do mês. Quem joga a rodada ganha um pacote ao fechar, e dá para comprar mais na Loja. O que sair é seu para sempre."
          visual={<PacksGuideVisual month={today.slice(0, 7)} />}
          href="/loja"
          cta="Ver os pacotes"
        />
      ),
    },
    {
      key: "raridade",
      title: "Raridade",
      content: (
        <Slide
          icon={GemIcon}
          eyebrow="Novidade · coleção"
          title="Skins por raridade"
          text="As skins dos pacotes têm quatro raridades: comum, rara, épica e lendária. Toque numa carta em Minhas cartas e ela vira para mostrar a raridade no verso."
          visual={<RarityGuideVisual />}
          href="/eu#minhas-cartas"
          cta="Ver minhas cartas"
        />
      ),
    },
    {
      key: "mercado",
      title: "Mercado",
      content: (
        <Slide
          icon={ArrowLeftRightIcon}
          eyebrow="Novidade · Mercado"
          title="Mercado e venda rápida"
          text="Skin repetida ou que ninguém usa? Venda para outros jogadores, de todas as peladas, ou faça uma venda rápida e receba na hora."
          visual={<MarketGuideVisual />}
          href="/loja/mercado"
          cta="Ir para o Mercado"
        />
      ),
    },
    {
      key: "ranking",
      title: "Ranking por pontos",
      content: (
        <Slide
          icon={TrophyIcon}
          eyebrow="Novidade · ranking por pontos"
          title="Ranking por pontos"
          meta={`Próximas cartas: ${formatShortDate(getNextPlayerOfTheMonthDate(today))}, ao fechar a rodada`}
          text="Cada rodada é uma etapa e quem joga mais soma mais. O ranking está logo abaixo. As duas cartas saem na última quinta do mês."
          visual={
            <div className="flex w-full flex-col gap-3">
              <div className="grid w-full grid-cols-2 gap-3 sm:mx-auto sm:max-w-lg sm:gap-6">
                {MONTH_CARDS.map((card) => (
                  <div key={card.kind} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                    <div className="w-[5.5rem] sm:w-36">
<ShowcaseCard award={{ kind: card.kind, theme: event.theme }} />
                    </div>
                    <p className="font-display text-base leading-none font-bold uppercase">{card.title}</p>
                    <p className="text-[0.6875rem] leading-snug text-muted-foreground sm:text-xs">{card.text}</p>
                  </div>
                ))}
              </div>
              <Chips items={POINTS_CHIPS} className="justify-center [&>li]:text-[0.6875rem] sm:[&>li]:text-xs" />
            </div>
          }
          href="/#ranking-title"
          cta="Ver o ranking"
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
                <ShowcaseCard key={kind} award={{ kind, theme: event.theme }} />
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
          eyebrow={eventSkins.length > 0 && shopEvent.label ? `Novidade · ${shopEvent.label}` : "Novidade"}
          title="Loja de cartas"
          meta={
            shopSale
              ? `${shopSale.label}: -${shopSale.percent}% em tudo até ${formatShortDate(shopSale.end)}`
              : eventSkins.length > 0 && shopEvent.endDate !== null && shopEvent.daysLeft !== null
                ? `Cartas de evento até ${formatShortDate(shopEvent.endDate)} · ${formatDaysLeft(shopEvent.daysLeft)}`
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
                <ShowcaseCard key={skin} skin={skin} />
              )) as [ReactNode, ReactNode, ReactNode]}
            />
          }
          href="/loja"
          cta="Ir para a Loja"
        />
      ),
    },
    {
      key: "patentes",
      title: "Patentes",
      content: (
        <Slide
          icon={MedalIcon}
          eyebrow="Novidade · sua carta"
          title="Patentes"
          meta={rankStatus(player.ovr)}
          text="A patente sobe e desce com o seu OVR, a média das 2 melhores estatísticas da carta (Ataque, Criação, Defesa), a cada rodada fechada."
          visual={<RankLadder current={getCardRank(player.ovr)} />}
          href={`/jogadores/${player.id}`}
          cta="Ver minha carreira"
        />
      ),
    },
  ];

  return <NewsCarousel label="Novidades do app" slides={slides} />;
}
