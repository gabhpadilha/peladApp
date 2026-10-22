"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CoinsIcon, StoreIcon } from "lucide-react";
import { formatCoins } from "@/components/coin-pill";
import { PlayerCard } from "@/components/player-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCardSkin } from "@/types/card-skin";
import { dismissWelcomeBonus } from "../_actions/dismiss-welcome-bonus";

type WelcomeBonusDialogProps = {
  coins: number;
};

const FEATURED_SKIN = getCardSkin("esmeralda");

/** Aviso do prêmio de primeiro login (150 PC + Esmeralda grátis): aparece uma vez e some ao fechar. */
export function WelcomeBonusDialog({ coins }: WelcomeBonusDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleClose(goToShop: boolean) {
    setIsOpen(false);
    startTransition(async () => {
      await dismissWelcomeBonus();
      if (goToShop) router.push("/loja");
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose(false)}>
      {/* Sem foco automático: senão o "Depois" abre com o contorno de foco no celular. */}
      <DialogContent className="gap-5" onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader className="items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10">
            <CoinsIcon aria-hidden className="size-6 text-amber-300" />
          </span>
          <DialogTitle className="font-display text-sm font-bold tracking-widest text-muted-foreground uppercase">
            Prêmio pelo seu primeiro login
          </DialogTitle>
          <p className="font-display text-5xl leading-none font-extrabold text-amber-200 tabular-nums">
            +{formatCoins(coins)}
            <span className="ml-1.5 text-xl text-amber-200/70">PC</span>
          </p>
          <DialogDescription>
            Você recebeu {formatCoins(coins)} PeladaCoins na sua conta e a carta {FEATURED_SKIN.name} de graça: ela está na
            Loja esperando por você.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2">
          <div className="w-32">
            <PlayerCard player={{ ...SAMPLE_PLAYER, cardSkin: FEATURED_SKIN.key }} size="fill" />
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">
            {FEATURED_SKIN.name} · Grátis
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="lg" className="h-11 text-base" onClick={() => handleClose(false)} disabled={isPending}>
            Depois
          </Button>
          <Button size="lg" className="h-11 text-base" onClick={() => handleClose(true)} disabled={isPending}>
            <StoreIcon aria-hidden />
            Ir para a Loja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
