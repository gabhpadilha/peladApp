import Link from "next/link";
import { LayoutGridIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { Match } from "@/types/match";

type OpenRoundCardProps = {
  match: Match;
  submitted: number;
  expected: number;
};

/** Rodada em avaliação: quantos presentes já mandaram as notas. */
export function OpenRoundCard({ match, submitted, expected }: OpenRoundCardProps) {
  return (
    <section aria-labelledby="open-round-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="open-round-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Rodada {match.round} em avaliação
        </h2>
        <p className="text-sm text-muted-foreground">{formatShortDate(match.date)}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="font-display text-xl font-bold text-foreground tabular-nums">{submitted}</span> de{" "}
        <span className="tabular-nums">{expected}</span> jogadores já enviaram as notas.
      </p>
      <progress
        value={submitted}
        max={expected}
        aria-label="Notas enviadas"
        className="h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
      />
      <Link
        href={`/rodadas/${match.id}`}
        className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-11 text-sm")}
      >
        <LayoutGridIcon aria-hidden />
        Abrir a mesa tática
      </Link>
    </section>
  );
}
