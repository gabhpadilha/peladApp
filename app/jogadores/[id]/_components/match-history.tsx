import { GoalBall } from "@/components/goal-ball";
import { SectionTitle } from "@/components/section-title";
import { formatShortDate } from "@/lib/format-date";
import type { MatchPerformance } from "@/lib/players";

type MatchHistoryProps = {
  performances: MatchPerformance[];
  /** Gols confirmados por rodada; `null` antes da contagem de gols (sem a coluna). */
  goalsByMatch: Record<string, number> | null;
};

/** Histórico rodada a rodada (também é a visão em tabela do gráfico). */
export function MatchHistory({ performances, goalsByMatch }: MatchHistoryProps) {
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
              {goalsByMatch && <th scope="col" className="py-2 text-right font-medium">Gols</th>}
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
                  {performance.offPosition && (
                    <span className="block text-xs font-normal text-amber-400">Fora da posição · não entra no OVR</span>
                  )}
                </th>
                <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                  {performance.wasPresent ? performance.evaluationCount : "–"}
                </td>
                {goalsByMatch && (
                  <td className="py-2.5 text-right tabular-nums">
                    {goalsByMatch[performance.match.id] ? (
                      <span className="inline-flex items-center gap-1 font-medium">
                        <GoalBall className="size-3" />
                        {goalsByMatch[performance.match.id]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">–</span>
                    )}
                  </td>
                )}
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
