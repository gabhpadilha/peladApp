"use client";

import Link from "next/link";
import { useState } from "react";
import { GiftIcon } from "lucide-react";
import { PackCover } from "@/components/pack-cover";
import { PackOpener } from "@/components/pack-opener";
import { Button } from "@/components/ui/button";
import { PACK_RARITY_NAMES, PACK_RARITY_ORDER, PACK_TIER_NAMES, type MyPack } from "@/lib/packs";
import { getCardSkin, isCardSkinKey } from "@/types/card-skin";

/** O pacote de skins que a rodada deu ao jogador: abrir agora ou guardar em Loja → Meus pacotes. */
export function PackReward({ pack }: { pack: MyPack }) {
  const [isOpening, setIsOpening] = useState(false);
  const [isKept, setIsKept] = useState(false);
  const [wasOpened, setWasOpened] = useState(pack.openedAt !== null);

  if (wasOpened) {
    const skinName = pack.skin && isCardSkinKey(pack.skin) ? getCardSkin(pack.skin).name : null;
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2.5">
        <GiftIcon aria-hidden className="size-5 shrink-0 text-amber-200" />
        <p className="text-sm text-amber-100">
          {skinName && pack.rarity ? `Seu pacote deu a ${skinName} (${PACK_RARITY_NAMES[pack.rarity]}).` : "Pacote aberto."}{" "}
          <Link href="/eu#minhas-cartas" className="underline underline-offset-2">Minhas cartas</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex animate-[reveal-fade_0.4s_ease-out_0.8s_both] flex-col gap-3 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3">
      <div className="flex items-center gap-3">
        <PackCover tier={pack.tier} className="h-16 shrink-0" />
        <div className="flex flex-col">
          <span className="text-xs tracking-wide text-amber-200/80 uppercase">Você ganhou</span>
          <span className="font-display text-xl leading-tight font-extrabold uppercase">{PACK_TIER_NAMES[pack.tier]}</span>
        </div>
      </div>
      <p className="text-xs text-amber-100/80">
        Chances neste pacote:{" "}
        {PACK_RARITY_ORDER.filter((rarity) => pack.odds[rarity] !== undefined)
          .map((rarity) => `${PACK_RARITY_NAMES[rarity]} ${String(pack.odds[rarity]).replace(".", ",")}%`)
          .join(" · ")}
      </p>
      {isKept ? (
        <p className="text-sm text-amber-100">
          Guardado em <Link href="/loja" className="underline underline-offset-2">Loja → Meus pacotes</Link>. Ele não vence.
        </p>
      ) : (
        <div className="flex gap-2">
          <Button className="h-11 flex-1 text-base" onClick={() => setIsOpening(true)}>Abrir agora</Button>
          <Button variant="outline" className="h-11 flex-1 text-base" onClick={() => setIsKept(true)}>Guardar</Button>
        </div>
      )}
      {isOpening && (
        <PackOpener
          packs={[pack]}
          onClose={() => {
            setIsOpening(false);
            setWasOpened(true);
          }}
        />
      )}
    </div>
  );
}
