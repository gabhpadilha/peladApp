import type { ReactNode } from "react";
import { CardViewer } from "@/components/card-viewer";
import { PlayerCard } from "@/components/player-card";
import { RarityLabel } from "@/components/rarity-label";
import { getSkinRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";

type CardSkinTileProps = {
  /** A carta do próprio jogador já com o visual do item. */
  player: Player;
  name: string;
  isEquipped?: boolean;
  /** Botão ou selo embaixo do nome ("Em uso", "Usar", preço…). */
  children: ReactNode;
};

/** Uma carta da Loja ou de "Minhas cartas" (página Eu): carta, nome e a ação. */
export function CardSkinTile({ player, name, isEquipped = false, children }: CardSkinTileProps) {
  // Raridade escrita embaixo do nome (só na Loja e em Eu → Minhas cartas; em outras telas a representação ainda será definida).
  const rarity = getSkinRarity(player.cardSkin);
  return (
    <li
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border bg-card px-2 pt-6 pb-3",
        isEquipped && "border-primary/60 bg-primary/5",
      )}
    >
      {/* A carta sempre aparece inteira e abre o visualizador, mesmo sem nível ou moedas para comprar (pedido do dono do app em 2026-11-09):
          o que fica cinza é só o botão de compra. */}
      <div className="w-[70%]">
        <CardViewer player={player}>
          <PlayerCard player={player} size="fill" />
        </CardViewer>
      </div>
      <div className="flex w-full flex-col items-center gap-2">
        <p className="font-display text-lg leading-none font-bold uppercase">{name}</p>
        {rarity && <RarityLabel rarity={rarity} />}
        {children}
      </div>
    </li>
  );
}
