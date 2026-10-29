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

/** Média dos valores que existem (sem nota em nenhum dos dois = `null`). */
function averageOf(values: readonly (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, value) => sum + value, 0) / known.length);
}

export function getCardStats(player: Player): CardStat[] {
  if (player.role === "goalkeeper") {
    const attributes = player.attributes;
    return GOALKEEPER_PAIRS.map(({ label, keys }) => ({ label, value: averageOf(keys.map((key) => attributes[key])) }));
  }
  const attributes = player.attributes;
  return OUTFIELD_PAIRS.map(({ label, keys }) => ({ label, value: averageOf(keys.map((key) => attributes[key])) }));
}
