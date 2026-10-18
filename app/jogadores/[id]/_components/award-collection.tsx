import { FrownIcon, GoalIcon, TrophyIcon, type LucideIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { SectionTitle } from "@/components/section-title";
import { CARD_THEME_LABELS } from "@/lib/card-themes";
import { formatShortDate } from "@/lib/format-date";
import { AWARD_KINDS, AWARD_LABELS, type Award, type AwardKind } from "@/types/award";

const AWARD_ICONS: Record<AwardKind, LucideIcon> = {
  craque: TrophyIcon,
  gol: GoalIcon,
  bola_murcha: FrownIcon,
};

type AwardCollectionProps = {
  awards: Award[];
  nickname: string;
  isOwnProfile: boolean;
};

/** Coleção de cartas especiais do atleta: uma carta por prêmio ganho. */
export function AwardCollection({ awards, nickname, isOwnProfile }: AwardCollectionProps) {
  const countByKind = Object.fromEntries(
    AWARD_KINDS.map((kind) => [kind, awards.filter((award) => award.kind === kind).length]),
  ) as Record<AwardKind, number>;

  return (
    <section
      id="colecao"
      aria-labelledby="collection-title"
      className="flex scroll-mt-20 flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <SectionTitle id="collection-title" aside={`${awards.length} ${awards.length === 1 ? "carta" : "cartas"}`}>
        {isOwnProfile ? "Minha coleção" : `Coleção de ${nickname}`}
      </SectionTitle>

      <ul aria-label="Prêmios por tipo" className="flex flex-wrap gap-2">
        {AWARD_KINDS.map((kind) => {
          const Icon = AWARD_ICONS[kind];
          return (
            <li
              key={kind}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
            >
              <Icon aria-hidden className="size-4 text-muted-foreground" />
              {AWARD_LABELS[kind].title}
              <span className="font-display font-bold tabular-nums">{countByKind[kind]}</span>
            </li>
          );
        })}
      </ul>

      {awards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isOwnProfile
            ? "Nenhuma carta especial ainda. Ganhe votos como Craque da Rodada ou Gol da Semana… e fuja da Bola Murcha."
            : "Nenhuma carta especial ainda."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 justify-items-center gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {awards.map((award) => (
            <li key={award.id} className="flex flex-col items-center gap-1.5 text-center">
              <PlayerCard player={award.card} award={award} size="md" />
              <p className="text-sm font-medium">{AWARD_LABELS[award.kind].title}</p>
              <p className="text-xs text-muted-foreground">
                Rodada {award.round} · {formatShortDate(award.date)}
                {award.theme !== "default" && ` · ${CARD_THEME_LABELS[award.theme]}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
