import type { PlayerRole } from "@/lib/round-position";
import type { PlayerAttribute } from "@/types/player";
import { countFilled, getAttributeKeys, type ScoreDraft } from "@/lib/rating-drafts";

/**
 * Votação com 3 notas (decisão do dono do app em 2026-11-02, ver
 * docs/superpowers/specs/2026-11-02-votacao-3-estatisticas-design.md): em vez de 6 atributos, quem vota dá
 * uma nota por estatística da carta (Ataque, Criação e Defesa; no gol, Paredão, Leitura e Saída). Para não mexer
 * no banco, a nota de uma estatística é gravada nos dois atributos dela (Ataque = VEL e CHU com o mesmo valor):
 * a carta já mostra a média de cada par, então o OVR, os prêmios e a média aparada seguem funcionando.
 * Vale para rodadas com data a partir de `THREE_STAT_RATINGS_FROM`; as de antes pedem os 6 atributos.
 */
export const THREE_STAT_RATINGS_FROM = "2026-11-02";

/** A rodada (pela data do jogo, `AAAA-MM-DD`) é votada com 3 notas? */
export function usesThreeStats(matchDate: string): boolean {
  return matchDate >= THREE_STAT_RATINGS_FROM;
}

export type RatingStat = {
  abbreviation: string;
  name: string;
  /** O que o jogador deve ter em mente ao dar a nota. */
  hint: string;
  /** Os dois atributos que recebem a mesma nota. */
  attributes: readonly [PlayerAttribute, PlayerAttribute];
};

const OUTFIELD_STATS: readonly RatingStat[] = [
  { abbreviation: "ATQ", name: "Ataque", hint: "chute e velocidade", attributes: ["vel", "chu"] },
  { abbreviation: "CRI", name: "Criação", hint: "passe e drible", attributes: ["pas", "dri"] },
  { abbreviation: "DEF", name: "Defesa", hint: "marcação e físico", attributes: ["def", "fis"] },
];

const GOALKEEPER_STATS: readonly RatingStat[] = [
  { abbreviation: "PAR", name: "Paredão", hint: "reflexo e elasticidade", attributes: ["ref", "ela"] },
  { abbreviation: "LEI", name: "Leitura", hint: "posicionamento e saída do gol", attributes: ["pos", "sai"] },
  { abbreviation: "SAÍ", name: "Saída", hint: "reposição e jogo com os pés", attributes: ["rep", "pes"] },
];

export function getRatingStats(role: PlayerRole): readonly RatingStat[] {
  return role === "goalkeeper" ? GOALKEEPER_STATS : OUTFIELD_STATS;
}

/** A nota dada a uma estatística (a do primeiro atributo dela), ou `null` se ainda não foi dada. */
export function getStatScore(draft: ScoreDraft | undefined, stat: RatingStat): number | null {
  return draft?.[stat.attributes[0]] ?? null;
}

/** As notas a gravar para uma estatística: o mesmo valor nos dois atributos. */
export function statScoreUpdates(stat: RatingStat, value: number): ScoreDraft {
  return { [stat.attributes[0]]: value, [stat.attributes[1]]: value };
}

/** Quantas notas faltam dar (3 ou 6, conforme a rodada). */
export function ratingSize(isThreeStats: boolean): number {
  return isThreeStats ? 3 : 6;
}

/** Quantas notas já foram dadas (estatísticas ou atributos, conforme a rodada). */
export function countFilledRatings(role: PlayerRole, draft: ScoreDraft | undefined, isThreeStats: boolean): number {
  if (!isThreeStats) return countFilled(role, draft);
  return getRatingStats(role).filter((stat) => getStatScore(draft, stat) !== null).length;
}

/** Numa rodada de 3 notas, os dois atributos de cada estatística têm que ter o mesmo valor. */
export function hasEqualPairs(role: PlayerRole, scores: Partial<Record<PlayerAttribute, number>>): boolean {
  const keys = getAttributeKeys(role);
  return getRatingStats(role).every(({ attributes: [first, second] }) => keys.includes(first) && scores[first] === scores[second]);
}
