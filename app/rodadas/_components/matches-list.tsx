import Link from "next/link";
import { ChevronDownIcon, LayoutGridIcon, PackageOpenIcon } from "lucide-react";
import { AWARD_ICONS } from "@/components/award-icons";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/section-title";
import { AWARD_LABELS, type AwardKind } from "@/types/award";
import { formatMonth, formatWeekdayDate } from "@/lib/format-date";
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

/** Rodadas fechadas que ficam sempre à vista; as mais antigas vão para "Rodadas anteriores". */
const RECENT_CLOSED_ROUNDS = 5;

type MonthGroup = { key: string; label: string; matches: MatchSummary[] };
type YearGroup = { year: string; count: number; months: MonthGroup[] };

/** Agrupa por ano e mês do jogo, mantendo a ordem (mais recente primeiro). */
function groupByYearAndMonth(matches: MatchSummary[]): YearGroup[] {
  const years: YearGroup[] = [];
  for (const match of matches) {
    const year = match.playedOn.slice(0, 4);
    const monthKey = match.playedOn.slice(0, 7);
    let yearGroup = years.at(-1);
    if (yearGroup?.year !== year) {
      yearGroup = { year, count: 0, months: [] };
      years.push(yearGroup);
    }
    let monthGroup = yearGroup.months.at(-1);
    if (monthGroup?.key !== monthKey) {
      monthGroup = { key: monthKey, label: formatMonth(match.playedOn), matches: [] };
      yearGroup.months.push(monthGroup);
    }
    monthGroup.matches.push(match);
    yearGroup.count += 1;
  }
  return years;
}

function countLabel(count: number): string {
  return count === 1 ? "1 rodada" : `${count} rodadas`;
}

const DISCLOSURE_SUMMARY =
  "flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden";

/** Rodadas antigas: ano → mês, tudo recolhido. Com 200 rodadas, a tela fica com poucas linhas. */
function OlderMatches({ matches }: { matches: MatchSummary[] }) {
  return (
    <div className="flex flex-col gap-1 border-t pt-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Rodadas anteriores</h3>
      <ul className="flex flex-col">
        {groupByYearAndMonth(matches).map((yearGroup) => (
          <li key={yearGroup.year} className="border-t first:border-t-0">
            <details className="group/year">
              <summary className={DISCLOSURE_SUMMARY}>
                <span className="font-display text-lg font-bold tabular-nums">{yearGroup.year}</span>
                <span className="flex-1 text-sm text-muted-foreground tabular-nums">· {countLabel(yearGroup.count)}</span>
                <ChevronDownIcon
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open/year:rotate-180"
                />
              </summary>
              <ul className="mb-2 flex flex-col rounded-lg bg-muted/40 px-3">
                {yearGroup.months.map((month) => (
                  <li key={month.key} className="border-t first:border-t-0">
                    <details className="group/month">
                      <summary className={DISCLOSURE_SUMMARY}>
                        <span className="text-sm font-medium first-letter:uppercase">{month.label}</span>
                        <span className="flex-1 text-sm text-muted-foreground tabular-nums">· {countLabel(month.matches.length)}</span>
                        <ChevronDownIcon
                          aria-hidden
                          className="size-5 shrink-0 text-muted-foreground transition-transform group-open/month:rotate-180"
                        />
                      </summary>
                      <ul className="flex flex-col">
                        {month.matches.map((match) => (
                          <ClosedMatchItem key={match.id} match={match} />
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

type MatchesListProps = {
  matches: MatchSummary[];
  isOrganizer: boolean;
};

export function MatchesList({ matches, isOrganizer }: MatchesListProps) {
  const openMatches = matches.filter((match) => match.status === "open");
  const closedMatches = matches.filter((match) => match.status !== "open");
  const recentClosed = closedMatches.slice(0, RECENT_CLOSED_ROUNDS);
  const olderClosed = closedMatches.slice(RECENT_CLOSED_ROUNDS);

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
        <>
          <ul className="flex flex-col">
            {openMatches.map((match) => (
              <OpenMatchItem key={match.id} match={match} isOrganizer={isOrganizer} />
            ))}
            {recentClosed.map((match) => (
              <ClosedMatchItem key={match.id} match={match} />
            ))}
          </ul>
          {olderClosed.length > 0 && <OlderMatches matches={olderClosed} />}
        </>
      )}
    </section>
  );
}
