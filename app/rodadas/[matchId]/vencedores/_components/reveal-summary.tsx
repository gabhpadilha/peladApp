import Link from "next/link";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";

type RevealSummaryProps = {
  round: number;
  /** Na ordem da coleção (Melhor Jogador primeiro). */
  awards: Award[];
  team: Award[];
  collectionHref: string;
  onReplay: () => void;
};

// Atraso de entrada de cada carta do resumo (classes literais para o Tailwind).
const POP_DELAYS = [
  "[animation-delay:0.1s]",
  "[animation-delay:0.18s]",
  "[animation-delay:0.26s]",
  "[animation-delay:0.34s]",
  "[animation-delay:0.42s]",
  "[animation-delay:0.5s]",
  "[animation-delay:0.58s]",
  "[animation-delay:0.66s]",
  "[animation-delay:0.74s]",
];

/** Todos os vencedores juntos, depois da última carta. */
export function RevealSummary({ round, awards, team, collectionHref, onReplay }: RevealSummaryProps) {
  return (
    <section className="absolute inset-0 overflow-y-auto px-4 pt-18 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <h1 className="animate-[reveal-in_0.4s_ease-out_both] text-center font-display text-4xl leading-none font-extrabold uppercase">
          Vencedores da rodada {round}
        </h1>

        {awards.length > 0 && (
          <ul aria-label="Cartas por voto" className="grid grid-cols-3 gap-x-2.5 gap-y-4">
            {awards.map((award, index) => (
              <li
                key={award.id}
                className={`flex min-w-0 animate-[reveal-pop_0.4s_ease-out_both] flex-col items-center gap-1.5 text-center ${POP_DELAYS[index % POP_DELAYS.length]}`}
              >
                <PlayerCard player={award.card} award={award} size="fill" />
                <span className="flex flex-col text-xs leading-tight">
                  <span className="font-medium">{AWARD_LABELS[award.kind].title}</span>
                  <span className="text-muted-foreground">{formatAwardResult(award)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {team.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-bold tracking-wide uppercase">Time da Semana</h2>
            <ul aria-label="Time da Semana" className="grid grid-cols-5 gap-1.5">
              {team.map((award) => (
                <li key={award.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <PlayerCard player={award.card} award={award} size="fill" />
                  <span className="text-[0.6875rem] text-muted-foreground tabular-nums">{formatAwardResult(award)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex animate-[reveal-fade_0.4s_ease-out_1s_both] flex-col gap-2.5 pt-2">
          <Button asChild size="lg" className="h-11 text-base">
            <Link href={collectionHref}>Ver a minha coleção</Link>
          </Button>
          <Button size="lg" variant="outline" className="h-11 text-base" onClick={onReplay}>
            Ver a animação de novo
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-11 text-base">
            <Link href="/">Voltar para o início</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
