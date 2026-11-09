import { PACK_RARITY_NAMES, type PackRarity } from "@/lib/packs";
import { cn } from "@/lib/utils";

/**
 * Legenda de raridade da skin (Loja e Eu → Minhas cartas): o cristal da raridade (renderizado com three.js, `scripts/rarity-gems/`,
 * uma imagem por raridade em `public/rarity/`), o nome em degradê metálico e um filete que some nas pontas, tudo na cor da raridade.
 * Sem `filter`, `mix-blend-mode` nem animação: fica fora da carta, mas na mesma grade, onde o iPhone já engasgou com esses efeitos.
 */
const LOOKS: Record<PackRarity, { text: string; line: string; glow: string }> = {
  comum: {
    text: "from-slate-100 to-slate-400",
    line: "from-transparent via-slate-400/60 to-slate-300",
    glow: "rgba(170,184,198,.16)",
  },
  rara: {
    text: "from-sky-100 to-blue-400",
    line: "from-transparent via-blue-400/60 to-sky-300",
    glow: "rgba(86,150,255,.22)",
  },
  epica: {
    text: "from-fuchsia-100 to-violet-400",
    line: "from-transparent via-violet-400/60 to-fuchsia-300",
    glow: "rgba(184,112,255,.24)",
  },
  lendaria: {
    text: "from-yellow-100 via-amber-300 to-orange-400",
    line: "from-transparent via-amber-400/70 to-yellow-200",
    glow: "rgba(255,196,84,.28)",
  },
};

export function RarityLabel({ rarity, className }: { rarity: PackRarity; className?: string }) {
  const look = LOOKS[rarity];
  const name = PACK_RARITY_NAMES[rarity];
  return (
    <span
      style={{ background: `radial-gradient(60% 120% at 50% 50%, ${look.glow}, transparent 70%)` }}
      className={cn("relative flex w-full items-center justify-center gap-1.5 py-1", className)}
    >
      <span aria-hidden className={cn("h-px w-3 bg-gradient-to-r sm:w-5", look.line)} />
      {/* eslint-disable-next-line @next/next/no-img-element -- ícone estático (public/rarity), sem o otimizador do Next */}
      <img src={`/rarity/${rarity}.webp`} alt="" aria-hidden className="h-7 w-auto" />
      <span className={cn("bg-gradient-to-b bg-clip-text font-display text-base leading-none font-extrabold tracking-[0.18em] text-transparent uppercase", look.text)}>
        <span className="sr-only">Raridade </span>
        {name}
      </span>
      <span aria-hidden className={cn("h-px w-3 rotate-180 bg-gradient-to-r sm:w-5", look.line)} />
    </span>
  );
}
