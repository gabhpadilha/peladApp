import type { PlayerRole } from "@/lib/round-position";
import { GOALKEEPER_ATTRIBUTES, OUTFIELD_ATTRIBUTES, type PlayerAttribute } from "@/types/player";

/** Notas (1–10) que o jogador logado já deu a um atleta, atributo a atributo. */
export type ScoreDraft = Partial<Record<PlayerAttribute, number>>;

/** Os 6 atributos avaliados: de linha ou de goleiro (pelo papel na rodada). */
export function getAttributeKeys(role: PlayerRole): readonly PlayerAttribute[] {
  return role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
}

/** Quantos dos 6 atributos já receberam nota. */
export function countFilled(role: PlayerRole, draft: ScoreDraft | undefined): number {
  return getAttributeKeys(role).filter((key) => draft?.[key] !== undefined).length;
}

export function isDraftComplete(role: PlayerRole, draft: ScoreDraft | undefined): boolean {
  return countFilled(role, draft) === getAttributeKeys(role).length;
}

/** Média (1 casa) das notas dadas, ou `null` sem nenhuma. */
export function draftAverage(draft: ScoreDraft | undefined): number | null {
  const values = Object.values(draft ?? {}).filter((score): score is number => score !== undefined);
  return values.length === 0 ? null : values.reduce((sum, score) => sum + score, 0) / values.length;
}
