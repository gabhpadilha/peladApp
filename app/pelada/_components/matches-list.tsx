import { SectionTitle } from "@/components/section-title";
import { formatWeekdayDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "../_data-access/get-group-overview";
import { CloseMatchButton } from "./close-match-button";

type MatchesListProps = {
  matches: MatchSummary[];
  isOrganizer: boolean;
};

export function MatchesList({ matches, isOrganizer }: MatchesListProps) {
  return (
    <section aria-labelledby="matches-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <SectionTitle id="matches-title">Rodadas</SectionTitle>
      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isOrganizer
            ? "Nenhuma rodada ainda. Depois do jogo, crie a rodada e marque quem jogou."
            : "Nenhuma rodada ainda. O organizador cria a rodada depois do jogo."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {matches.map((match) => {
            const isOpen = match.status === "open";
            return (
              // flex-wrap: a confirmação de fechar desce para uma linha própria em vez de espremer o texto.
              <li key={match.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 border-t py-3 first:border-t-0">
                <div className="flex min-w-48 flex-1 flex-col gap-0.5">
                  <p className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold whitespace-nowrap">Rodada {match.round}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
                        isOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isOpen ? "Em avaliação" : "Fechada"}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="inline-block first-letter:uppercase">
                      {formatWeekdayDate(match.playedOn)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {match.presentCount} jogadores em {match.teamCount} times · {match.submittedCount}{" "}
                    enviaram notas
                  </p>
                </div>
                {isOrganizer && isOpen && <CloseMatchButton matchId={match.id} round={match.round} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
