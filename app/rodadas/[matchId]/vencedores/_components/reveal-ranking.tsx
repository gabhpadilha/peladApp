import { TrophyIcon } from "lucide-react";
import { RoundRankingList } from "@/components/round-ranking";
import { Button } from "@/components/ui/button";
import type { RoundRankingEntry } from "@/lib/ranking-points";

type RevealRankingProps = {
  round: number;
  entries: readonly RoundRankingEntry[];
  myId: string;
  nextLabel: string;
  onNext: () => void;
};

/**
 * A classificação da rodada pela nota, depois dos prêmios (pedido do dono do app em 2026-11-10): entra do último para o
 * primeiro, com o pacote que cada um ganhou; tocar num nome mostra os pontos que ela somou no mês.
 */
export function RevealRanking({ round, entries, myId, nextLabel, onNext }: RevealRankingProps) {
  const hasPacks = entries.some((entry) => entry.packTier !== null);
  return (
    <section
      aria-label="Classificação da rodada"
      className="absolute inset-0 flex flex-col items-center gap-4 overflow-y-auto px-4 pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex animate-[reveal-in_0.5s_ease-out_both] flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border-2 border-amber-300 text-amber-300">
          <TrophyIcon aria-hidden className="size-6" />
        </span>
        <h2 className="font-display text-4xl leading-none font-extrabold uppercase">Classificação da rodada {round}</h2>
        <p className="text-sm text-muted-foreground">
          Ordem pela nota da rodada{hasPacks ? ", que também decide o pacote de cada um" : ""}. Toque num nome para ver os pontos que
          ele somou no ranking do mês.
        </p>
      </div>
      <RoundRankingList entries={entries} myId={myId} animated className="w-full max-w-sm" />
      <Button
        size="lg"
        className="mt-2 h-11 w-full max-w-sm shrink-0 animate-[reveal-fade_0.4s_ease-out_both] text-base"
        style={{ animationDelay: `${0.3 + entries.length * 0.14 + 0.2}s` }}
        onClick={onNext}
      >
        {nextLabel}
      </Button>
    </section>
  );
}
