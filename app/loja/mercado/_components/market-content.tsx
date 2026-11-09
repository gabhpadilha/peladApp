"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRightIcon, ClockIcon, CoinsIcon, SearchIcon, SlidersHorizontalIcon, TagIcon } from "lucide-react";
import { buyListing } from "@/app/_actions/market";
import { RarityLabel } from "@/components/rarity-label";
import { ShowcaseCard } from "@/components/showcase-card";
import { EmptyState } from "@/components/state-panels";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MARKET_COLOR_OPTIONS, SKIN_COLORS } from "@/lib/market";
import type { MarketListing } from "@/lib/market-listings";
import { PACK_RARITY_NAMES, PACK_RARITY_ORDER, getSkinRarity, type PackRarity } from "@/lib/packs";
import { SHOP_EVENTS } from "@/lib/shop-events";
import { cn } from "@/lib/utils";
import { CARD_SKINS, type CardSkinKey } from "@/types/card-skin";

type MarketContentProps = {
  listings: MarketListing[];
  balance: number;
  owned: CardSkinKey[];
  /** Quantos anúncios ativos o jogador tem (botão "Meus anúncios"). */
  myActiveCount: number;
};

const RARITY_TEXT: Record<PackRarity, string> = {
  comum: "text-zinc-300",
  rara: "text-sky-300",
  epica: "text-violet-300",
  lendaria: "text-amber-300",
};

const SORTS = { recent: "mais recentes", cheap: "menor preço" } as const;
type Sort = keyof typeof SORTS;

/** Evento da Loja de cada skin ("" = sem evento). */
function eventOf(skin: CardSkinKey): string {
  const item = CARD_SKINS.find((candidate) => candidate.key === skin);
  return item && "event" in item ? item.event.theme : "";
}

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const selectClass = "h-11 w-full rounded-lg border bg-background px-2 text-base text-foreground";

/** O Mercado: busca, filtros que abrem e fecham, lista de anúncios e a folha de compra. */
export function MarketContent({ listings, balance, owned, myActiveCount }: MarketContentProps) {
  const [query, setQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [rarity, setRarity] = useState("");
  const [event, setEvent] = useState("all");
  const [color, setColor] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [buying, setBuying] = useState<MarketListing | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "saved"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const activeFilters = [rarity !== "", event !== "all", color !== ""].filter(Boolean).length;

  const visible = useMemo(() => {
    const wanted = normalize(query.trim());
    const filtered = listings.filter(
      (item) =>
        (wanted === "" || normalize(item.name).includes(wanted)) &&
        (rarity === "" || getSkinRarity(item.skin) === rarity) &&
        (event === "all" || eventOf(item.skin) === event) &&
        (color === "" || SKIN_COLORS[item.skin] === color),
    );
    return sort === "cheap" ? [...filtered].sort((a, b) => a.price - b.price) : filtered;
  }, [listings, query, rarity, event, color, sort]);

  function handleBuy(listing: MarketListing) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await buyListing({ listingId: listing.id });
        if (result.success) {
          setBuying(null);
          setMessage({ kind: "saved", text: result.message });
        } else {
          setError(result.message);
        }
      } catch (caught) {
        console.error("Falha ao comprar no Mercado", caught);
        setError("Não foi possível falar com o servidor. Confira a conexão.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Skins à venda por jogadores de todas as peladas. Comprou, é sua na hora.</p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
            <SearchIcon aria-hidden className="size-4 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(inputEvent) => setQuery(inputEvent.target.value)}
              placeholder="Buscar skin"
              aria-label="Buscar skin"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="button"
            aria-expanded={isFilterOpen}
            aria-controls="market-filters"
            aria-label={activeFilters > 0 ? `Filtros (${activeFilters} ligados)` : "Filtros"}
            onClick={() => setIsFilterOpen((open) => !open)}
            className={cn(
              "relative flex size-11 shrink-0 items-center justify-center rounded-lg border",
              (isFilterOpen || activeFilters > 0) && "border-primary text-primary",
            )}
          >
            <SlidersHorizontalIcon aria-hidden className="size-5" />
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {isFilterOpen && (
          <div id="market-filters" className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-3">
            <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
              Raridade
              <select value={rarity} onChange={(selectEvent) => setRarity(selectEvent.target.value)} className={selectClass}>
                <option value="">Todas</option>
                {PACK_RARITY_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {PACK_RARITY_NAMES[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
              Evento
              <select value={event} onChange={(selectEvent) => setEvent(selectEvent.target.value)} className={selectClass}>
                <option value="all">Todos</option>
                {SHOP_EVENTS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
                <option value="">Sem evento</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
              Cor
              <select value={color} onChange={(selectEvent) => setColor(selectEvent.target.value)} className={selectClass}>
                <option value="">Todas</option>
                {MARKET_COLOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setSort((current) => (current === "recent" ? "cheap" : "recent"))}
          className="-my-2 py-2 text-left text-sm text-muted-foreground"
        >
          {visible.length} {visible.length === 1 ? "anúncio" : "anúncios"} ·{" "}
          <span className="font-medium text-foreground underline underline-offset-2">{SORTS[sort]}</span>
        </button>
        <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
          <Link href="/loja/mercado/anuncios">
            <TagIcon aria-hidden className="size-4" />
            Meus anúncios{myActiveCount > 0 ? ` · ${myActiveCount}` : ""}
          </Link>
        </Button>
      </div>

      {message && (
        <p role="status" className={cn("text-sm", message.kind === "saved" ? "text-success" : "text-destructive")}>
          {message.text}
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={listings.length === 0 ? "Nenhuma skin à venda agora" : "Nenhum anúncio com esses filtros"}
          action={
            listings.length === 0 ? (
              <Button asChild variant="outline">
                <Link href="/eu#minhas-cartas">Ir para Minhas cartas</Link>
              </Button>
            ) : undefined
          }
        >
          {listings.length === 0
            ? "Quando alguém anunciar, aparece aqui. Você também pode vender as suas em Eu → Minhas cartas."
            : "Tente outra busca ou limpe os filtros."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
          {visible.map((item) => {
            const itemRarity = getSkinRarity(item.skin);
            const hasSkin = ownedSet.has(item.skin);
            const missing = item.price - balance;
            const note = item.isMine ? "Seu anúncio" : hasSkin ? "Você já tem" : missing > 0 ? `Faltam ${missing} CC` : null;
            return (
              <li key={item.id} className="flex items-center gap-3 px-3 py-3">
                <div className="w-16 shrink-0">
                  <ShowcaseCard skin={item.skin} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate font-display text-lg leading-none font-bold uppercase">{item.name}</p>
                  {itemRarity && (
                    <span className={cn("font-display text-xs font-bold tracking-[0.18em] uppercase", RARITY_TEXT[itemRarity])}>
                      {PACK_RARITY_NAMES[itemRarity]}
                    </span>
                  )}
                  <p className="truncate text-xs text-muted-foreground">
                    {item.seller} · {item.group}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon aria-hidden className="size-3.5" />
                    {item.remainingLabel}
                  </p>
                </div>
                <div className="flex w-28 shrink-0 flex-col items-center gap-1">
                  <Button
                    type="button"
                    variant={note ? "secondary" : "default"}
                    className="h-10 w-full gap-1.5 px-2"
                    disabled={note !== null}
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      setBuying(item);
                    }}
                  >
                    <CoinsIcon aria-hidden className="size-4" />
                    <span className="font-semibold tabular-nums">{item.price.toLocaleString("pt-BR")}</span>
                  </Button>
                  {note && <span className="text-center text-xs text-muted-foreground">{note}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={buying !== null} onOpenChange={(isOpen) => !isOpen && !isPending && setBuying(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-y-auto rounded-t-2xl">
          {buying && (
            <>
              <SheetHeader className="items-center pb-2 text-center">
                <div className="w-40 py-2">
                  <ShowcaseCard skin={buying.skin} />
                </div>
                <SheetTitle className="font-display text-3xl font-extrabold uppercase">{buying.name}</SheetTitle>
                {getSkinRarity(buying.skin) && <RarityLabel rarity={getSkinRarity(buying.skin) ?? "comum"} />}
                <SheetDescription>
                  Vendida por <span className="font-medium text-foreground">{buying.seller}</span> · {buying.group}
                </SheetDescription>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon aria-hidden className="size-3.5" />
                  Anúncio: {buying.remainingLabel.toLowerCase()}
                </p>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-6">
                <div className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3">
                  <span className="text-sm text-muted-foreground">Seu saldo</span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold tabular-nums">
                    {balance.toLocaleString("pt-BR")}
                    <ArrowRightIcon aria-hidden className="size-4 text-muted-foreground" />
                    <span className="text-amber-300">{(balance - buying.price).toLocaleString("pt-BR")}</span>
                    <span className="text-sm font-normal text-muted-foreground">CC</span>
                  </span>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  A skin vai para Eu → Minhas cartas na hora. Compra no Mercado não tem devolução.
                </p>
                {error && (
                  <p role="alert" className="text-center text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="button" className="h-12 w-full gap-2 text-base" disabled={isPending} onClick={() => handleBuy(buying)}>
                  <CoinsIcon aria-hidden className="size-5" />
                  {isPending ? "Comprando…" : `Comprar por ${buying.price.toLocaleString("pt-BR")} CC`}
                </Button>
                <Button type="button" variant="ghost" className="h-11 w-full" disabled={isPending} onClick={() => setBuying(null)}>
                  Agora não
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
