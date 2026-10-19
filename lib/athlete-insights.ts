import {
  GOALKEEPER_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  type Player,
  type PlayerAttribute,
} from "@/types/player";

export type AttributeValue = { key: PlayerAttribute; value: number };

function attributeKeys(role: Player["role"]): readonly PlayerAttribute[] {
  return role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
}

function attributeValues(player: Player): AttributeValue[] {
  const values: Partial<Record<PlayerAttribute, number | null>> = player.attributes;
  return attributeKeys(player.role).flatMap((key) => {
    const value = values[key];
    return value === null || value === undefined ? [] : [{ key, value }];
  });
}

/** Ponto forte e ponto a melhorar (maior e menor atributo); `null` sem notas. */
export function getAttributeExtremes(
  player: Player,
): { strongest: AttributeValue; weakest: AttributeValue } | null {
  const values = attributeValues(player);
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => b.value - a.value);
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
}

/**
 * Média de cada atributo entre os jogadores da mesma função (linha ou gol)
 * que já têm nota. Linha e goleiro nunca se misturam.
 */
export function getGroupAttributeAverages(
  players: readonly Player[],
  role: Player["role"],
): Partial<Record<PlayerAttribute, number>> {
  const sameRole = players.filter((player) => player.role === role);
  return Object.fromEntries(
    attributeKeys(role).flatMap((key) => {
      const values = sameRole.flatMap((player) => {
        const value = (player.attributes as Partial<Record<PlayerAttribute, number | null>>)[key];
        return value === null || value === undefined ? [] : [value];
      });
      if (values.length === 0) return [];
      return [[key, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)]];
    }),
  );
}
