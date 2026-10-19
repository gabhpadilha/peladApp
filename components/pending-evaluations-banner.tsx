import Link from "next/link";
import { ClipboardListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWeekdayDate } from "@/lib/format-date";
import type { PendingEvaluation } from "@/lib/players";

type PendingEvaluationsBannerProps = {
  pending: PendingEvaluation[];
};

/** "1 avaliação de jogo pendente": aparece só para o próprio jogador. */
export function PendingEvaluationsBanner({ pending }: PendingEvaluationsBannerProps) {
  if (pending.length === 0) return null;

  const [next] = pending;
  const title =
    pending.length === 1
      ? "1 avaliação de jogo pendente"
      : `${pending.length} avaliações de jogo pendentes`;

  return (
    <section
      aria-label="Avaliações pendentes"
      className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4"
    >
      <ClipboardListIcon aria-hidden className="size-5 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">
          Rodada {next.match.round} · {formatWeekdayDate(next.match.date)} ·{" "}
          {next.playersToRate} jogadores para avaliar
        </p>
      </div>
      <Button asChild size="lg">
        <Link href={`/rodadas/${next.match.id}`}>Avaliar</Link>
      </Button>
    </section>
  );
}
