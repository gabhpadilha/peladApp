import { CanchaCard, type CanchaCardAward } from "@/components/cancha-card";
import { SAMPLE_PLAYER } from "@/lib/sample-player";
import { cn } from "@/lib/utils";
import type { CardSkinKey } from "@/types/card-skin";

/**
 * Carta de vitrine (Loja, slides da home, prêmio de primeiro login, Coleção vazia, visualizador da Loja): só o design da skin ou do
 * prêmio, como na abertura do pacote, sem foto, nome, selo do OVR nem estatísticas (pedido do dono do app em 2026-11-09: nada de
 * jogador de exemplo no app). A carta com foto e números aparece só quando é do próprio jogador.
 */
export function ShowcaseCard({ skin = null, award, className }: { skin?: CardSkinKey | null; award?: CanchaCardAward; className?: string }) {
  return <CanchaCard player={{ ...SAMPLE_PLAYER, cardSkin: skin }} award={award} pure photoSizes="160px" className={cn("w-full", className)} />;
}
