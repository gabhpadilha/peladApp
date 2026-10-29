import type { GoalkeeperAttribute, OutfieldAttribute, Player } from "@/types/player";

/**
 * As 3 estatísticas da carta (identidade própria, decisão do dono do app em
 * 2026-10-28). A votação continua com os 6 atributos; a carta mostra a média de
 * cada par. Ver docs/superpowers/specs/2026-10-28-cartas-identidade-propria-design.md.
 */
export type CardStat = { label: string; value: number | null };

const OUTFIELD_PAIRS: readonly { label: string; keys: readonly [OutfieldAttribute, OutfieldAttribute] }[] = [
  { label: "Ataque", keys: ["vel", "chu"] },
  { label: "Criação", keys: ["pas", "dri"] },
  { label: "Defesa", keys: ["def", "fis"] },
];

const GOALKEEPER_PAIRS: readonly { label: string; keys: readonly [GoalkeeperAttribute, GoalkeeperAttribute] }[] = [
  { label: "Paredão", keys: ["ref", "ela"] },
  { label: "Leitura", keys: ["pos", "sai"] },
  { label: "Saída", keys: ["rep", "pes"] },
];

/** Média dos valores que existem (sem nota em nenhum = `null`), arredondada. */
function averageOf(values: readonly (number | null | undefined)[]): number | null {
  const known = values.filter((value): value is number => typeof value === "number");
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, value) => sum + value, 0) / known.length);
}

type AttributeValues = Partial<Record<OutfieldAttribute | GoalkeeperAttribute, number | null>>;

/** As 3 estatísticas a partir dos atributos já na escala da carta (0–99). */
export function getStatsFromAttributes(role: Player["role"], attributes: AttributeValues): CardStat[] {
  const pairs = role === "goalkeeper" ? GOALKEEPER_PAIRS : OUTFIELD_PAIRS;
  return pairs.map(({ label, keys }) => ({ label, value: averageOf(keys.map((key) => attributes[key])) }));
}

export function getCardStats(player: Player): CardStat[] {
  return getStatsFromAttributes(player.role, player.attributes);
}

/**
 * OVR da carta = média das 3 estatísticas que ela mostra (decisão do dono do app em
 * 2026-10-29), para o número grande bater com os de baixo. Espelha `card_ovr` no banco.
 */
export function getOvrFromStats(stats: readonly CardStat[]): number | null {
  return averageOf(stats.map((stat) => stat.value));
}
