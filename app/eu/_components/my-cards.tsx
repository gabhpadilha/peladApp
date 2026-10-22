"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { StoreIcon, WalletCardsIcon } from "lucide-react";
import { equipCardSkin } from "@/app/loja/_actions/equip-card-skin";
import type { ShopItem } from "@/app/loja/_data-access/get-shop";
import { CardSkinTile } from "@/components/card-skin-tile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";

type MyCardsProps = {
  me: Player;
  /** Padrão + compradas (`getMyCards`). */
  cards: ShopItem[];
};

/** "Minhas cartas": escolher qual carta usar entre a padrão e as compradas na Loja. */
export function MyCards({ me, cards }: MyCardsProps) {
  const [message, setMessage] = useState<{ kind: "error" | "saved"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEquip(item: ShopItem) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await equipCardSkin(item.skin);
        setMessage({ kind: result.success ? "saved" : "error", text: result.message });
      } catch (error) {
        console.error("Falha ao trocar de carta", error);
        setMessage({ kind: "error", text: "Não foi possível falar com o servidor. Confira a conexão." });
      }
    });
  }

  return (
    <section id="minhas-cartas" aria-labelledby="my-cards-title" className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="my-cards-title" className="flex items-center gap-2 font-display text-xl font-bold tracking-wide uppercase">
            <WalletCardsIcon aria-hidden className="size-5 text-primary" />
            Minhas cartas · {cards.length}
          </h2>
          <p className="text-sm text-muted-foreground">Escolha qual carta usar. O que você comprou é seu para sempre.</p>
        </div>
        <Link
          href="/loja"
          className="flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:bg-muted"
        >
          <StoreIcon aria-hidden className="size-4" />
          Ver a Loja
        </Link>
      </div>

      {message && (
        <p role="status" className={cn("text-sm", message.kind === "saved" ? "text-success" : "text-destructive")}>
          {message.text}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((item) => (
          <CardSkinTile
            key={item.skin ?? "padrao"}
            player={{ ...me, cardSkin: item.skin }}
            name={item.name}
            isEquipped={item.state === "equipped"}
          >
            {item.state === "equipped" ? (
              <span className="flex h-10 w-full items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary">
                Em uso
              </span>
            ) : (
              <Button type="button" variant="outline" className="h-10 w-full" disabled={isPending} onClick={() => handleEquip(item)}>
                Usar
              </Button>
            )}
          </CardSkinTile>
        ))}
      </ul>
    </section>
  );
}
