import Link from "next/link";
import { ChevronDownIcon, LayoutGridIcon, PackageOpenIcon } from "lucide-react";
import { AWARD_ICONS } from "@/components/award-icons";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/section-title";
import { AWARD_LABELS, type AwardKind } from "@/types/award";
import { formatWeekdayDate } from "@/lib/format-date";
import type { MatchSummary } from "../_data-access/get-rounds-overview";
import { CloseMatchButton } from "./close-match-button";
import { DeleteMatchButton } from "./delete-match-button";

/** Um item por prêmio: empates e o Time da Semana juntam os nomes ("Gui, Russo"). */
function groupWinners(winners: MatchSummary["winners"]): { kind: AwardKind; nicknames: string[] }[] {
  const groups = new Map<AwardKind, string[]>();
  for (const winner of winners) {
    groups.set(winner.kind, [...(groups.get(winner.kind) ?? []), winner.nickname]);
  }
  return [...groups].map(([kind, nicknames]) => ({ kind, nicknames }));
}

function MatchFacts({ match }: { match: MatchSummary }) {
  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      Branco x Preto · {match.starterCount} titulares
      {match.reserveCount > 0 && ` + ${match.reserveCount} reservas`} · {match.submittedCount} enviaram notas
    </p>
  );
}

function BoardLink({ match, isOpen }: { match: MatchSummary; isOpen: boolean }) {
  return (
    <Button asChild size="sm" variant={isOpen ? "default" : "secondary"} className="shrink-0">
      <Link href={`/rodadas/${match.id}`} aria-label={`Abrir a mesa tática da rodada ${match.round}`}>
        <LayoutGridIcon aria-hidden />
        Mesa tática
      </Link>
    </Button>
  );
}

/** Rodada em avaliação: aberta por inteiro, porque pede ação (notas, fechar). */
function OpenMatchItem({ match, isOrganizer }: { match: MatchSummary; isOrganizer: boolean }) {
  return (
    // flex-wrap: a confirmação de fechar desce para uma linha própria em vez de espremer o texto.
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 border-t py-3 first:border-t-0">
      <div className="flex min-w-48 flex-1 flex-col gap-0.5">
        <p className="flex items-center gap-2">
          <span className="font-display text-lg font-bold whitespace-nowrap">Rodada {match.round}</span>
          <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-primary">
            Em avaliação
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="inline-block first-letter:uppercase">{formatWeekdayDate(match.playedOn)}</span>
        </p>
        <MatchFacts match={match} />
      </div>
      <BoardLink match={match} isOpen />
      {isOrganizer && <CloseMatchButton matchId={match.id} round={match.round} submittedCount={match.submittedCount} />}
      {isOrganizer && <DeleteMatchButton matchId={match.id} round={match.round} isClosed={false} />}
    </li>
  );
}

/**
 * Rodada fechada: uma linha só (número, data e Melhor Jogador) que abre os detalhes.
 * Com o acúmulo de rodadas, a lista continua curta.
 */
function ClosedMatchItem({ match }: { match: MatchSummary }) {
  const groups = groupWinners(match.winners);
  const best = groups.find((group) => group.kind === "craque");
  const BestIcon = AWARD_ICONS.craque;

  return (
    <li className="border-t first:border-t-0">
      <details className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-lg font-bold whitespace-nowrap">Rodada {match.round}</span>
              <span className="truncate text-sm text-muted-foreground first-letter:uppercase">
                {formatWeekdayDate(match.playedOn)}
              </span>
            </p>
            {best && (
              <p className="flex min-w-0 items-center gap-1 text-xs">
                <BestIcon aria-hidden className="size-3.5 shrink-0 text-primary" />
                <span className="sr-only">Melhor Jogador:</span>
                <span className="truncate font-medium">{best.nicknames.join(", ")}</span>
              </p>
            )}
          </div>
          <span className="sr-only group-open:hidden">Ver detalhes</span>
          <ChevronDownIcon
            aria-hidden
            className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-3 pb-3">
          <MatchFacts match={match} />
          {groups.length > 0 && (
            <ul aria-label="Cartas especiais da rodada" className="flex flex-col gap-1.5 text-sm">
              {groups.map((winner) => {
                const Icon = AWARD_ICONS[winner.kind];
                return (
                  <li key={winner.kind} className="flex items-start gap-1.5">
                    <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      <span className="text-muted-foreground">{AWARD_LABELS[winner.kind].title}: </span>
                      <span className="font-medium">{winner.nicknames.join(", ")}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <BoardLink match={match} isOpen={false} />
            {match.winners.length > 0 && (
              <Button asChild size="sm" variant="secondary" className="shrink-0">
                <Link
                  href={`/rodadas/${match.id}/vencedores`}
                  aria-label={`Ver a revelação dos vencedores da rodada ${match.round}`}
                >
                  <PackageOpenIcon aria-hidden />
                  Vencedores
                </Link>
              </Button>
            )}
          </div>
        </div>
      </details>
    </li>
  );
}

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
          {matches.map((match) =>
            match.status === "open" ? (
              <OpenMatchItem key={match.id} match={match} isOrganizer={isOrganizer} />
            ) : (
              <ClosedMatchItem key={match.id} match={match} />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
