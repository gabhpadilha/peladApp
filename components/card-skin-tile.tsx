import type { ReactNode } from "react";
import { LockIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
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

/** Uma carta da Loja ou de "Minhas cartas" (página Eu): carta, nome e a ação. */
export function CardSkinTile({ player, name, isEquipped = false, isLocked = false, children }: CardSkinTileProps) {
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
        {children}
      </div>
    </li>
  );
}
