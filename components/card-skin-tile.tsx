import type { ReactNode } from "react";
import { LockIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { getSkinRarity, PACK_RARITY_NAMES, type PackRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/player";

type CardSkinTileProps = {
  /** A carta do próprio jogador já com o visual do item. */
  player: Player;
  name: string;
  isEquipped?: boolean;
  isLocked?: boolean;
  /** Botão ou selo embaixo do nome ("Em uso", "Usar", preço…). */
  children: ReactNode;
};

/** Cor do nome de cada raridade (a luz da abertura do pacote). */
const RARITY_TEXT: Record<PackRarity, string> = {
  comum: "text-slate-300",
  rara: "text-sky-300",
  epica: "text-violet-300",
  lendaria: "text-amber-300",
};

/** Uma carta da Loja ou de "Minhas cartas" (página Eu): carta, nome e a ação. */
export function CardSkinTile({ player, name, isEquipped = false, isLocked = false, children }: CardSkinTileProps) {
  // Raridade escrita embaixo do nome (só na Loja e em Eu → Minhas cartas; em outras telas a representação ainda será definida).
  const rarity = getSkinRarity(player.cardSkin);
  return (
    <li
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border bg-card px-2 pt-6 pb-3",
        isEquipped && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="relative w-[70%]">
        {/* Só opacidade: `saturate` (filtro) sobre as cartas desmontava a prévia no iPhone. */}
        <div className={cn(isLocked && "opacity-40")}>
          <PlayerCard player={player} size="fill" />
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
        <p className="font-display text-lg leading-none font-bold uppercase">{name}</p>
        {rarity && <p className={cn("font-display text-sm leading-none font-bold tracking-[0.16em] uppercase", RARITY_TEXT[rarity])}>{PACK_RARITY_NAMES[rarity]}</p>}
        {children}
      </div>
    </li>
  );
}
