"use client";

import { AttributeSlider } from "@/app/avaliar/[matchId]/_components/attribute-slider";
import { getAttributeKeys, type ScoreDraft } from "@/lib/rating-drafts";
import { getRatingStats, getStatScore, statScoreUpdates } from "@/lib/rating-stats";
import type { PlayerRole } from "@/lib/round-position";
import { ATTRIBUTE_LABELS } from "@/types/player";

type RatingSlidersProps = {
  /** Prefixo dos ids dos campos (um por jogador e tela). */
  idPrefix: string;
  role: PlayerRole;
  /** Rodada de 3 notas (a partir de `THREE_STAT_RATINGS_FROM`) ou de 6 atributos. */
  isThreeStats: boolean;
  draft: ScoreDraft | undefined;
  /** Notas a gravar (uma estatística grava os dois atributos dela). */
  onChange: (updates: ScoreDraft) => void;
};

/** Os sliders de nota de um jogador: 3 estatísticas ou os 6 atributos, conforme a rodada. */
export function RatingSliders({ idPrefix, role, isThreeStats, draft, onChange }: RatingSlidersProps) {
  if (isThreeStats) {
    return getRatingStats(role).map((stat) => (
      <div key={stat.name} className="flex flex-col gap-1">
        <AttributeSlider
          id={`${idPrefix}-${stat.attributes[0]}`}
          abbreviation={stat.abbreviation}
          name={stat.name}
          value={getStatScore(draft, stat)}
          onChange={(value) => onChange(statScoreUpdates(stat, value))}
        />
        <p className="text-xs text-muted-foreground">Pense em {stat.hint}.</p>
      </div>
    ));
  }
  return getAttributeKeys(role).map((key) => (
    <AttributeSlider
      key={key}
      id={`${idPrefix}-${key}`}
      abbreviation={ATTRIBUTE_LABELS[key].abbreviation}
      name={ATTRIBUTE_LABELS[key].name}
      value={draft?.[key] ?? null}
      onChange={(value) => onChange({ [key]: value })}
    />
  ));
}
