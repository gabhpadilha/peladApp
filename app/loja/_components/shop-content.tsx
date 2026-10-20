"use client";

import { useState, useTransition } from "react";
import { CoinsIcon, GhostIcon, LockIcon, SparklesIcon, WalletCardsIcon, type LucideIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";
import { buyCardSkin, type ShopActionResult } from "../_actions/buy-card-skin";
import { equipCardSkin } from "../_actions/equip-card-skin";
import type { ShopItem, ShopSection } from "../_data-access/get-shop";
import { formatShortDate } from "@/lib/format-date";
import { formatCoins } from "@/components/coin-pill";

type ShopContentProps = {
  me: Player;
  /** Padrão + compradas. */
  mine: ShopItem[];
  sections: ShopSection[];
  balance: number;
};

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

/** A própria carta do jogador com a personalização do item. */
function withSkin(me: Player, item: ShopItem): Player {
  return { ...me, cardSkin: item.skin };
}

/** Grade de cartas da Loja; tocar numa à venda abre a confirmação de compra. */
export function ShopContent({ me, mine, sections, balance }: ShopContentProps) {
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
          return (
            <li
              key={item.skin ?? "padrao"}
              className={cn(
                "flex flex-col items-center gap-4 rounded-xl border bg-card px-2 pt-6 pb-3",
                item.state === "equipped" && "border-primary/60 bg-primary/5",
              )}
            >
              <div className="relative w-[70%]">
                {/* Só opacidade: `saturate` (filtro) sobre as cartas desmontava a prévia no iPhone. */}
                <div className={cn(isLocked && "opacity-40")}>
                  <PlayerCard player={withSkin(me, item)} size="fill" />
                </div>
                {isLocked && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-background/85 ring-1 ring-border">
                      <LockIcon aria-hidden className="size-5 text-muted-foreground" />
                    </span>
                  </span>
                )}
              </div>
              <div className="flex w-full flex-col items-center gap-2">
                <p className="font-display text-lg leading-none font-bold uppercase">{item.name}</p>
                {item.state === "equipped" && (
                  <span className="flex h-10 w-full items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary">
                    Em uso
                  </span>
                )}
                {item.state === "owned" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full"
                    disabled={isPending}
                    onClick={() => run(() => equipCardSkin(item.skin))}
                  >
                    Usar
                  </Button>
                )}
                {item.state === "available" && (
                  <Button type="button" className="h-10 w-full gap-1.5" disabled={isPending} onClick={() => setSelected(item)}>
                    <CoinsIcon aria-hidden className="size-4" />
                    {formatCoins(item.price)}
                  </Button>
                )}
                {isLocked && (
                  <span className="flex h-10 w-full items-center justify-center rounded-md bg-muted/50 px-1 text-center text-xs text-muted-foreground">
                    Nível {item.level} · {formatCoins(item.price)} PC
                  </span>
                )}
              </div>
            </li>
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

      <section aria-label="Minhas cartas" className="flex flex-col gap-3">
        <SectionHeader
          icon={WalletCardsIcon}
          title={`Minhas cartas · ${mine.length}`}
          text="Escolha qual carta usar. O que você comprou é seu para sempre."
        />
        {renderGrid(mine)}
      </section>

      {sections.map((section) => (
        <section key={section.key} aria-label={section.title} className="flex flex-col gap-3">
          <SectionHeader
            icon={section.key === "event" ? GhostIcon : SparklesIcon}
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
                  <PlayerCard player={withSkin(me, selected)} size="fill" />
                </div>
                <SheetTitle className="font-display text-3xl font-extrabold uppercase">{selected.name}</SheetTitle>
                <SheetDescription>Liberada no nível {selected.level} · sua para sempre</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Seu saldo</span>
                  <span className="flex items-center gap-1.5 font-display text-base font-bold tabular-nums">
                    <CoinsIcon aria-hidden className="size-4 text-amber-300" />
                    {formatCoins(balance)} → {formatCoins(balance - selected.price)}
                  </span>
                </div>
                {balance < selected.price ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Faltam {formatCoins(selected.price - balance)} PeladaCoins. Jogue, avalie e ganhe prêmios para juntar.
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
                    {isPending ? "Comprando…" : `Comprar e usar · ${formatCoins(selected.price)}`}
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
