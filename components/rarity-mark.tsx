import { getSkinRarity, PACK_RARITY_NAMES } from "@/lib/packs";
import { cn } from "@/lib/utils";

/**
 * Cristal de raridade pequeno para listas (ranking, artilharia): vai junto do nome ou do texto da linha, no lugar da legenda
 * que não cabe embaixo de uma miniatura de carta. Sem skin com raridade, não mostra nada.
 */
export function RarityMark({ skin, className }: { skin: string | null | undefined; className?: string }) {
  const rarity = getSkinRarity(skin);
  if (!rarity) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ícone estático (public/rarity), sem o otimizador do Next
    <img
      role="img"
      alt={`Raridade ${PACK_RARITY_NAMES[rarity]}`}
      title={PACK_RARITY_NAMES[rarity]}
      src={`/rarity/${rarity}.webp`}
      className={cn("inline-block h-5 w-auto align-[-4px]", className)}
    />
  );
}
