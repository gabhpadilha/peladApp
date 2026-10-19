import {
  GOALKEEPER_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  type Player,
  type PlayerAttribute,
} from "@/types/player";

/** Notas (1–10) que o jogador logado já deu a um atleta, atributo a atributo. */
export type ScoreDraft = Partial<Record<PlayerAttribute, number>>;

/** Os 6 atributos avaliados: de linha ou de goleiro. */
export function getAttributeKeys(player: Player): readonly PlayerAttribute[] {
  return player.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
}

/** Quantos dos 6 atributos já receberam nota. */
export function countFilled(player: Player, draft: ScoreDraft | undefined): number {
  return getAttributeKeys(player).filter((key) => draft?.[key] !== undefined).length;
}

export function isDraftComplete(player: Player, draft: ScoreDraft | undefined): boolean {
  return countFilled(player, draft) === getAttributeKeys(player).length;
}

/** Média (1 casa) das notas dadas, ou `null` sem nenhuma. */
export function draftAverage(draft: ScoreDraft | undefined): number | null {
  const values = Object.values(draft ?? {}).filter((score): score is number => score !== undefined);
  return values.length === 0 ? null : values.reduce((sum, score) => sum + score, 0) / values.length;
}
