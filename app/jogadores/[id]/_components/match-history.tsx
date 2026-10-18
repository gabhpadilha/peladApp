import { SectionTitle } from "@/components/section-title";
import { formatShortDate } from "@/lib/format-date";
import type { MatchPerformance } from "@/lib/players";

type MatchHistoryProps = {
  performances: MatchPerformance[];
};

/** Histórico rodada a rodada (também é a visão em tabela do gráfico). */
export function MatchHistory({ performances }: MatchHistoryProps) {
  const rows = performances.toReversed();

  return (
    <section aria-labelledby="history-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <SectionTitle id="history-title">Histórico</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma rodada fechada ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground uppercase">
              <th scope="col" className="py-2 font-medium">Rodada</th>
              <th scope="col" className="py-2 text-right font-medium">Avaliações</th>
              <th scope="col" className="py-2 text-right font-medium">Nota</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((performance) => (
              <tr key={performance.match.id} className="border-t">
                <th scope="row" className="py-2.5 text-left font-medium">
                  R{performance.match.round}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {formatShortDate(performance.match.date)}
                  </span>
                </th>
                <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                  {performance.wasPresent ? performance.evaluationCount : "–"}
                </td>
                <td className="py-2.5 text-right">
                  {performance.score === null ? (
                    <span className="text-muted-foreground">
                      {performance.wasPresent ? "Sem notas" : "Ausente"}
                    </span>
                  ) : (
                    <span className="font-display text-lg font-bold tabular-nums">{performance.score}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
