"use client";

import { useState, useTransition } from "react";
import { CoinsIcon, MinusIcon, PlusIcon, TagIcon } from "lucide-react";
import { listSkin, quickSellSkin } from "@/app/_actions/market";
import { RarityLabel } from "@/components/rarity-label";
import { ShowcaseCard } from "@/components/showcase-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MARKET_LISTING_HOURS, MARKET_PRICE_STEP, getQuickSellCoins, type PriceRange } from "@/lib/market";
import { getSkinRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";
import type { CardSkinKey } from "@/types/card-skin";

type SellSheetProps = {
  /** Skin a anunciar; `null` = folha fechada. */
  skin: CardSkinKey | null;
  name: string;
  range: PriceRange | null;
  suggestedPrice: number | null;
  onClose: () => void;
  onDone: (message: string) => void;
};

/** Folha "Vender no Mercado": escolher o preço dentro da faixa e anunciar por 24 h. */
export function SellSheet({ skin, name, range, suggestedPrice, onClose, onDone }: SellSheetProps) {
  return (
    <Sheet open={skin !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-y-auto rounded-t-2xl">
        {skin && range && suggestedPrice !== null && (
          // key: cada skin abre com o próprio preço sugerido.
          <SellForm key={skin} skin={skin} name={name} range={range} suggestedPrice={suggestedPrice} onClose={onClose} onDone={onDone} />
        )}
      </SheetContent>
    </Sheet>
  );
}

type SellFormProps = {
  skin: CardSkinKey;
  name: string;
  range: PriceRange;
  suggestedPrice: number;
  onClose: () => void;
  onDone: (message: string) => void;
};

function SellForm({ skin, name, range, suggestedPrice, onClose, onDone }: SellFormProps) {
  const [price, setPrice] = useState(suggestedPrice);
  const [draft, setDraft] = useState(String(suggestedPrice));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isConfirmingQuick, setIsConfirmingQuick] = useState(false);
  const quickCoins = getQuickSellCoins(skin);
  const rarity = getSkinRarity(skin);
  const isValid = Number.isInteger(price) && price >= range.min && price <= range.max;

  function applyPrice(value: number) {
    const clamped = Math.min(range.max, Math.max(range.min, value));
    setPrice(clamped);
    setDraft(String(clamped));
  }

  function handleDraftChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 5);
    setDraft(digits);
    setPrice(digits === "" ? 0 : Number(digits));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await listSkin({ skin, price });
        if (result.success) onDone(result.message);
        else setError(result.message);
      } catch (caught) {
        console.error("Falha ao anunciar", caught);
        setError("Não foi possível falar com o servidor. Confira a conexão.");
      }
    });
  }

  function handleQuickSell() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await quickSellSkin({ skin });
        if (result.success) onDone(result.message);
        else {
          setError(result.message);
          setIsConfirmingQuick(false);
        }
      } catch (caught) {
        console.error("Falha na venda rápida", caught);
        setError("Não foi possível falar com o servidor. Confira a conexão.");
        setIsConfirmingQuick(false);
      }
    });
  }

  return (
    <>
      <SheetHeader className="items-center pb-2 text-center">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Vender no Mercado</p>
        <div className="w-32 py-2">
          <ShowcaseCard skin={skin} />
        </div>
        <SheetTitle className="font-display text-2xl font-extrabold uppercase">{name}</SheetTitle>
        {rarity && <RarityLabel rarity={rarity} />}
        <SheetDescription className="sr-only">Escolha o preço e anuncie a carta no Mercado.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="flex w-full flex-col gap-2 rounded-xl border bg-card p-4">
          <label htmlFor="sell-price" className="text-sm text-muted-foreground">
            Seu preço
          </label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12"
              aria-label="Diminuir o preço"
              disabled={price <= range.min || isPending}
              onClick={() => applyPrice(price - MARKET_PRICE_STEP)}
            >
              <MinusIcon aria-hidden />
            </Button>
            <input
              id="sell-price"
              inputMode="numeric"
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onBlur={() => applyPrice(price)}
              aria-invalid={!isValid}
              className={cn(
                "h-12 min-w-0 flex-1 rounded-lg border bg-background text-center font-display text-3xl font-extrabold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !isValid && "border-destructive",
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12"
              aria-label="Aumentar o preço"
              disabled={price >= range.max || isPending}
              onClick={() => applyPrice(price + MARKET_PRICE_STEP)}
            >
              <PlusIcon aria-hidden />
            </Button>
          </div>
          <p className={cn("text-xs", isValid ? "text-muted-foreground" : "text-destructive")}>
            Entre <span className="text-foreground">{range.min}</span> e <span className="text-foreground">{range.max}</span> CC
            para esta carta.
          </p>
        </div>

        <div className="flex w-full flex-col gap-1 text-sm">
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">Fica no Mercado por</span>
            <span className="font-medium">{MARKET_LISTING_HOURS} horas</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">Se vender, você recebe</span>
            <span className="font-display text-lg font-bold text-amber-300 tabular-nums">{isValid ? price : "–"} CC</span>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Enquanto estiver anunciada, a carta não pode ser usada. Dá para cancelar a qualquer momento antes de vender.
        </p>

        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="button" className="h-12 w-full gap-2 text-base" disabled={!isValid || isPending} onClick={handleSubmit}>
          <TagIcon aria-hidden className="size-5" />
          {isPending ? "Anunciando…" : `Anunciar por ${isValid ? price : "–"} CC`}
        </Button>
        {quickCoins !== null && (
          <div className="flex w-full flex-col gap-2 rounded-xl border border-dashed p-3">
            <p className="text-center text-xs text-muted-foreground">
              Sem querer esperar comprador? Venda rápida: a carta sai da sua coleção agora, por bem menos.
            </p>
            {isConfirmingQuick ? (
              <div className="flex gap-2">
                <Button type="button" variant="destructive" className="h-11 flex-1 gap-1.5" disabled={isPending} onClick={handleQuickSell}>
                  {isPending ? "Vendendo…" : `Sim, vender por ${quickCoins} CC`}
                </Button>
                <Button type="button" variant="outline" className="h-11" disabled={isPending} onClick={() => setIsConfirmingQuick(false)}>
                  Voltar
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="h-11 w-full gap-2" disabled={isPending} onClick={() => setIsConfirmingQuick(true)}>
                <CoinsIcon aria-hidden className="size-4 text-amber-300" />
                Venda rápida · {quickCoins} CC
              </Button>
            )}
          </div>
        )}
        <Button type="button" variant="ghost" className="h-11 w-full" disabled={isPending} onClick={onClose}>
          Agora não
        </Button>
      </div>
    </>
  );
}
