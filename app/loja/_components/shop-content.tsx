"use client";

import { useState, useTransition } from "react";
import { CoinsIcon, GhostIcon, SparklesIcon, type LucideIcon } from "lucide-react";
import { CardSkinTile } from "@/components/card-skin-tile";
import type { CardThemeKey } from "@/lib/card-themes";
import { PlayerCard } from "@/components/player-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";
import { buyCardSkin, type ShopActionResult } from "../_actions/buy-card-skin";
import type { ShopSale } from "@/lib/shop-sale";
import type { ShopItem, ShopSection } from "../_data-access/get-shop";
import { formatShortDate } from "@/lib/format-date";
import { formatCoins } from "@/components/coin-pill";

type ShopContentProps = {
  sections: ShopSection[];
  balance: number;
  /** Promoção valendo hoje (faixa no topo e preços riscados). */
  sale: ShopSale | null;
};

/** Ícone da vitrine de evento, pelo tema (tema novo: entre aqui). */
const EVENT_ICONS: Record<CardThemeKey, LucideIcon> = {
  default: SparklesIcon,
  halloween: GhostIcon,
};

/** Preço com o de tabela riscado ao lado quando há promoção. */
function Price({ item }: { item: ShopItem }) {
  if (item.price === 0) return <span className="font-semibold">Grátis</span>;
  return (
    <>
      {item.originalPrice !== null && <span className="text-sm line-through opacity-60">{formatCoins(item.originalPrice)}</span>}
      <span className="font-semibold">{formatCoins(item.price)}</span>
    </>
  );
}

/** Faixa da promoção (ex.: Black Friday), no topo da Loja. */
function SaleBanner({ sale }: { sale: ShopSale }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-black px-4 py-3 ring-1 ring-amber-300/40">
      <div className="min-w-0">
        <p className="font-display text-2xl leading-none font-extrabold tracking-wide text-white uppercase">{sale.label}</p>
        <p className="text-xs text-amber-200/80">Só até {formatShortDate(sale.end)} · em todas as personalizações</p>
      </div>
      <span className="shrink-0 rounded-md bg-amber-300 px-2.5 py-1 font-display text-2xl font-extrabold text-black">
        -{sale.percent}%
      </span>
    </div>
  );
}

function formatDaysLeft(daysLeft: number): string {
  if (daysLeft === 0) return "último dia";
  return daysLeft === 1 ? "falta 1 dia" : `faltam ${daysLeft} dias`;
}

/** Título de cada vitrine, com ícone e uma linha de apoio. */
function SectionHeader({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide uppercase">
        <Icon aria-hidden className="size-5 text-primary" />
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/**
 * A carta de exemplo com a personalização do item: o que está à venda ainda não é
 * do jogador, então a vitrine não usa o rosto nem os dados dele (`SAMPLE_PLAYER`).
 */
function withSkin(item: ShopItem): Player {
  return { ...SAMPLE_PLAYER, cardSkin: item.skin };
}

/** Grade de cartas da Loja; tocar numa à venda abre a confirmação de compra. */
export function ShopContent({ sections, balance, sale }: ShopContentProps) {
  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "saved"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ShopActionResult>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        setMessage({ kind: result.success ? "saved" : "error", text: result.message });
        if (result.success) setSelected(null);
      } catch (error) {
        console.error("Falha na Loja", error);
        setMessage({ kind: "error", text: "Não foi possível falar com o servidor. Confira a conexão." });
      }
    });
  }

  function renderGrid(items: ShopItem[]) {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const isLocked = item.state === "locked";
          // Só o que o jogador ainda não tem aparece aqui; as dele ficam em Eu → Minhas cartas.
          return (
            <CardSkinTile key={item.skin ?? "padrao"} player={withSkin(item)} name={item.name} isLocked={isLocked}>
              {item.state === "available" && (
                <Button type="button" className="h-10 w-full gap-1.5" disabled={isPending} onClick={() => setSelected(item)}>
                  <CoinsIcon aria-hidden className="size-4" />
                  <Price item={item} />
                </Button>
              )}
              {isLocked && (
                <span className="flex h-10 w-full items-center justify-center rounded-md bg-muted/50 px-1 text-center text-xs text-muted-foreground">
                  Nível {item.level} · {formatCoins(item.price)} CC{item.originalPrice !== null && ` (era ${formatCoins(item.originalPrice)})`}
                </span>
              )}
            </CardSkinTile>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      {message && (
        <p role="status" className={cn("text-sm", message.kind === "saved" ? "text-success" : "text-destructive")}>
          {message.text}
        </p>
      )}

      {sale && <SaleBanner sale={sale} />}

      {sections.map((section) => (
        <section key={section.key} aria-label={section.title} className="flex flex-col gap-3">
          <SectionHeader
            icon={section.event ? EVENT_ICONS[section.event.theme] : SparklesIcon}
            title={section.title}
            text={
              section.event?.endDate && section.event.daysLeft !== null
                ? `Só até ${formatShortDate(section.event.endDate)} · ${formatDaysLeft(section.event.daysLeft)}. Depois saem da Loja; quem comprou continua usando.`
                : "Novas cartas liberam conforme você sobe de nível."
            }
          />
          {renderGrid(section.items)}
        </section>
      ))}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-y-auto rounded-t-2xl">
          {selected?.skin && (
            <>
              <SheetHeader className="items-center gap-1 pt-8 text-center">
                <div className="mb-4 w-40">
                  <PlayerCard player={withSkin(selected)} size="fill" />
                </div>
                <SheetTitle className="font-display text-3xl font-extrabold uppercase">{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.price === 0 ? "Prêmio de primeiro login" : `Liberada no nível ${selected.level}`} · sua para sempre
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {selected.price > 0 && (
                  <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Seu saldo</span>
                    <span className="flex items-center gap-1.5 font-display text-base font-bold tabular-nums">
                      <CoinsIcon aria-hidden className="size-4 text-amber-300" />
                      {formatCoins(balance)} → {formatCoins(balance - selected.price)}
                    </span>
                  </div>
                )}
                {balance < selected.price ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Faltam {formatCoins(selected.price - balance)} CanchaCoins. Jogue, avalie e ganhe prêmios para juntar.
                  </p>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    className="h-11 gap-2 text-base"
                    disabled={isPending}
                    onClick={() => {
                      const skin = selected.skin;
                      if (skin) run(() => buyCardSkin({ skin, equip: true }));
                    }}
                  >
                    <CoinsIcon aria-hidden className="size-5" />
                    {isPending
                      ? "Comprando…"
                      : selected.price === 0
                      ? "Pegar de graça e usar"
                      : `Comprar e usar · ${formatCoins(selected.price)}${selected.originalPrice !== null ? ` (era ${formatCoins(selected.originalPrice)})` : ""}`}
                  </Button>
                )}
                <Button type="button" variant="ghost" size="lg" className="h-11 text-base" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
                {message?.kind === "error" && (
                  <p role="alert" className="text-center text-sm text-destructive">
                    {message.text}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
