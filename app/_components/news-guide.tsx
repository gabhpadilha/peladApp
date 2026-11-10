import { ArrowLeftRightIcon, ZapIcon } from "lucide-react";
import { PackCover } from "@/components/pack-cover";
import { ShowcaseCard } from "@/components/showcase-card";
import { QUICK_SELL_COINS } from "@/lib/market";
import { PACK_RARITY_NAMES, PACK_RARITY_ORDER, type PackRarity, type PackTier } from "@/lib/packs";
import type { CardSkinKey } from "@/types/card-skin";
import { cn } from "@/lib/utils";

/** Guia visual das novidades (pacotes, raridade, Mercado e venda rápida): as artes dos slides da Home. */

/** Faixa do pacote e como ela sai ao fechar a rodada (pela posição na nota da rodada). */
const PACK_TIERS: readonly { tier: PackTier; when: string }[] = [
  { tier: "A", when: "1º da rodada" },
  { tier: "B", when: "2º e 3º" },
  { tier: "C", when: "meio da tabela" },
  { tier: "D", when: "últimos" },
];

/** Os 4 pacotes lado a lado, com quem ganha cada um, e a lembrança de que dá para comprar na Loja. */
export function PacksGuideVisual({ month }: { month: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ul className="grid w-full max-w-md grid-cols-4 gap-2">
        {PACK_TIERS.map((item) => (
          <li key={item.tier} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <PackCover tier={item.tier} month={month} className="w-full" />
            <span className="text-[0.6875rem] leading-tight text-muted-foreground sm:text-xs">{item.when}</span>
          </li>
        ))}
      </ul>
      <p className="max-w-md text-center text-xs text-muted-foreground">
        Ganhe um ao fechar a rodada (quanto melhor a sua nota, melhor o pacote) ou compre na Loja com CanchaCoins.
      </p>
    </div>
  );
}

const RARITY_DOT: Record<PackRarity, string> = {
  comum: "bg-zinc-300",
  rara: "bg-sky-400",
  epica: "bg-violet-400",
  lendaria: "bg-amber-300",
};

/** Uma skin de cada raridade (do conjunto de novembro), da comum à lendária. */
const RARITY_SKINS: Record<PackRarity, CardSkinKey> = { comum: "nublado", rara: "aguaceiro", epica: "relampago", lendaria: "diluvio" };

export function RarityGuideVisual() {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <ul className="grid w-full max-w-md grid-cols-4 gap-2">
        {PACK_RARITY_ORDER.map((rarity) => (
          <li key={rarity} className="flex min-w-0 flex-col items-center gap-1.5">
            <ShowcaseCard skin={RARITY_SKINS[rarity]} />
            <span className="flex items-center gap-1 text-[0.6875rem] font-semibold sm:text-xs">
              <span aria-hidden className={cn("size-2 rounded-full", RARITY_DOT[rarity])} />
              {PACK_RARITY_NAMES[rarity]}
            </span>
          </li>
        ))}
      </ul>
      <p className="max-w-md text-center text-xs text-muted-foreground">
        Quanto mais rara, mais trabalhada: a lendária tem peças 3D por fora, por dentro e por trás da carta.
      </p>
    </div>
  );
}

/** Mercado (venda entre jogadores) e venda rápida (a casa paga na hora), lado a lado. */
export function MarketGuideVisual() {
  return (
    <div className="grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        <p className="flex items-center gap-1.5 font-display text-base font-bold tracking-wide uppercase">
          <ArrowLeftRightIcon aria-hidden className="size-4 text-primary" />
          Mercado
        </p>
        <p className="text-xs text-muted-foreground">Anuncie uma skin por até 24 horas, pelo preço que quiser dentro da faixa. Outro jogador compra na hora.</p>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        <p className="flex items-center gap-1.5 font-display text-base font-bold tracking-wide uppercase">
          <ZapIcon aria-hidden className="size-4 text-amber-300" />
          Venda rápida
        </p>
        <p className="text-xs text-muted-foreground">Não quer esperar? Venda na hora por um valor fixo, bem abaixo do Mercado:</p>
        <ul className="flex flex-wrap gap-1">
          {PACK_RARITY_ORDER.map((rarity) => (
            <li key={rarity} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] whitespace-nowrap">
              <span className="text-muted-foreground">{PACK_RARITY_NAMES[rarity]}</span>
              <span className="font-semibold text-amber-200 tabular-nums">{QUICK_SELL_COINS[rarity]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
