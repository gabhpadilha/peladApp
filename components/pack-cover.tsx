import { BrandMark } from "@/components/brand-logo";
import type { PackTier } from "@/lib/packs";
import { cn } from "@/lib/utils";

/**
 * Capinha do pacote por faixa. Provisória (cor da faixa + a marca): a arte de cada tipo de pacote ainda será definida
 * com o dono do app e entra no lugar daqui, uma imagem por faixa.
 */
const COVER_LOOKS: Record<PackTier, { frame: string; face: string; mark: string; glow: string }> = {
  A: { frame: "border-amber-300/70", face: "from-[#3a2f10] to-[#17120a]", mark: "text-amber-300", glow: "rgba(252,211,77,.35)" },
  B: { frame: "border-primary/70", face: "from-[#1f3312] to-[#0e1710]", mark: "text-primary", glow: "rgba(182,242,60,.3)" },
  C: { frame: "border-sky-300/55", face: "from-[#16283a] to-[#0c141c]", mark: "text-sky-200", glow: "rgba(125,211,252,.28)" },
  D: { frame: "border-zinc-400/45", face: "from-[#2a2d2f] to-[#121415]", mark: "text-zinc-300", glow: "rgba(212,212,216,.2)" },
};

/** Miniatura do pacote (proporção da capinha, 3:4). O tamanho vem de `className`. */
export function PackCover({ tier, className }: { tier: PackTier; className?: string }) {
  const look = COVER_LOOKS[tier];
  return (
    <div
      aria-hidden
      style={{ boxShadow: `0 0 14px ${look.glow}` }}
      className={cn("relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border bg-linear-to-b", look.frame, look.face, className)}
    >
      <BrandMark className={cn("h-[52%] w-auto", look.mark)} />
      <span className="absolute inset-x-0 top-[6%] h-px bg-white/15" />
      <span className="absolute inset-x-0 bottom-[6%] h-px bg-white/15" />
    </div>
  );
}
