import Link from "next/link";
import { ChevronDownIcon, PackageOpenIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { formatShortDate } from "@/lib/format-date";
import { AWARD_LABELS, formatAwardResult, type Award } from "@/types/award";
import type { Match } from "@/types/match";
import type { RoundPerformer } from "../_data-access/get-home-data";

type LatestRoundCardProps = {
  match: Match;
  topPerformers: RoundPerformer[];
  awards: Award[];
};

/** Cartas do leque ao lado do Melhor Jogador (as primeiras ficam por cima). */
const FAN_SIZE = 4;
const FAN_LAYERS = ["z-[4]", "z-[3]", "z-[2]", "z-[1]"];

const awardHref = (award: Award) => `/jogadores/${award.memberId}/colecao`;
const awardLabel = (award: Award) => `${AWARD_LABELS[award.kind].title}: ${award.card.nickname}`;

/** O Melhor Jogador em destaque e um leque pequeno com as outras cartas da rodada. */
function FeaturedAward({ award, others }: { award: Award; others: Award[] }) {
  return (
    <div className="flex items-center gap-4">
      <Link href={awardHref(award)} aria-label={awardLabel(award)} className="w-28 shrink-0">
        <PlayerCard player={award.card} award={award} size="fill" />
      </Link>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {AWARD_LABELS[award.kind].title}
        </p>
        <p className="truncate font-display text-2xl font-bold uppercase">{award.card.nickname}</p>
        <p className="text-sm text-muted-foreground">{formatAwardResult(award)}</p>
        {others.length > 0 && (
          // `isolate`: as camadas do leque ficam só aqui dentro; sem isso, passavam por cima da barra de baixo (z-30).
          <div className="isolate mt-2 flex items-center" aria-hidden>
            {others.slice(0, FAN_SIZE).map((other, index) => (
              <div key={other.id} className={`relative -ml-3 w-9 first:ml-0 ${FAN_LAYERS.at(index)}`}>
                <PlayerCard player={other.card} award={other} size="fill" />
              </div>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              +{others.length} {others.length === 1 ? "destaque" : "destaques"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Última rodada fechada: o Melhor Jogador em destaque (aprovado pelo dono do app em 2026-10-24,
 * "muita informação de cara"), os outros prêmios atrás de "Ver todos os destaques" e o top 3 de notas.
 */
export function LatestRoundCard({ match, topPerformers, awards }: LatestRoundCardProps) {
  // Sem Melhor Jogador na rodada, a primeira carta faz o papel de destaque.
  const featured = awards.find((award) => award.kind === "craque") ?? awards.at(0);
  const others = awards.filter((award) => award !== featured);
  return (
    <section aria-labelledby="latest-round-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="latest-round-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Rodada {match.round}
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatShortDate(match.date)} · {match.presentPlayerIds.length} jogadores
        </p>
      </div>

      {featured === undefined ? (
        <p className="text-sm text-muted-foreground">Ninguém ganhou carta especial nessa rodada.</p>
      ) : (
        <FeaturedAward award={featured} others={others} />
      )}

      {others.length > 0 && (
        <details className="group">
          <summary className="flex h-11 cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Ver todos os destaques ({awards.length})</span>
            <span className="hidden group-open:inline">Mostrar menos</span>
            <ChevronDownIcon aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          {/* Grade de 3 colunas (empates quebram linha): cabe no celular sem rolagem lateral. */}
          <ul aria-label="Outros prêmios da rodada" className="grid grid-cols-3 gap-x-2 gap-y-4 pt-4 sm:gap-x-4">
            {others.map((award) => (
              <li key={award.id} className="mx-auto flex w-full max-w-40 min-w-0 flex-col items-center gap-1.5 text-center">
                <Link href={awardHref(award)} aria-label={awardLabel(award)} className="w-full">
                  <PlayerCard player={award.card} award={award} size="fill" />
                </Link>
                <span className="flex flex-col text-xs leading-tight">
                  <span className="font-medium">{AWARD_LABELS[award.kind].title}</span>
                  <span className="text-muted-foreground">{formatAwardResult(award)}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {awards.length > 0 && (
        <Link
          href={`/rodadas/${match.id}/vencedores`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <PackageOpenIcon aria-hidden className="size-4" />
          Ver a revelação de novo
        </Link>
      )}

      {topPerformers.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">Maiores notas</h3>
          <ol className="flex flex-col">
            {topPerformers.map(({ player, score }, index) => (
              <li key={player.id}>
                <Link
                  href={`/jogadores/${player.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted"
                >
                  <span className="w-4 text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{player.nickname}</span>
                  <span className="font-display text-lg font-bold tabular-nums">{score}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
