import { FrownIcon, GoalIcon, TrophyIcon, type LucideIcon } from "lucide-react";
import { SectionTitle } from "@/components/section-title";
import { AWARD_LABELS, type AwardKind } from "@/types/award";
import { formatWeekdayDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "../_data-access/get-rounds-overview";
import { CloseMatchButton } from "./close-match-button";
import { DeleteMatchButton } from "./delete-match-button";

const AWARD_ICONS: Record<AwardKind, LucideIcon> = {
  craque: TrophyIcon,
  gol: GoalIcon,
  bola_murcha: FrownIcon,
};

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
                    {match.presentCount} jogadores em {match.teamCount} times
                    {match.benchCount > 0 && ` + ${match.benchCount} no banco`} · {match.submittedCount} enviaram notas
                  </p>
                  {match.winners.length > 0 && (
                    <ul aria-label="Cartas especiais da rodada" className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {match.winners.map((winner) => {
                        const Icon = AWARD_ICONS[winner.kind];
                        return (
                          <li key={`${winner.kind}-${winner.nickname}`} className="inline-flex items-center gap-1">
                            <Icon aria-hidden className="size-3.5 text-primary" />
                            <span className="text-muted-foreground">{AWARD_LABELS[winner.kind].title}:</span>
                            <span className="font-medium">{winner.nickname}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {isOrganizer && isOpen && <CloseMatchButton matchId={match.id} round={match.round} />}
                {isOrganizer && <DeleteMatchButton matchId={match.id} round={match.round} isClosed={!isOpen} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
