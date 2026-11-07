/**
 * Pacotes de skins (design em docs/superpowers/specs/2026-11-07-pacotes-design.md): ao fechar a rodada, quem jogou ganha um
 * pacote lacrado; o sorteio é do banco. Aqui ficam só os nomes e textos (as chances e as moedas das repetidas são dados do banco).
 */
export type PackTier = "A" | "B" | "C" | "D";
export type PackRarity = "comum" | "rara" | "epica" | "lendaria";

export const PACK_TIER_NAMES: Record<PackTier, string> = {
  A: "Pacote Craque",
  B: "Pacote Destaque",
  C: "Pacote Pelada",
  D: "Pacote Reserva",
};

export const PACK_RARITY_NAMES: Record<PackRarity, string> = {
  comum: "Comum",
  rara: "Rara",
  epica: "Épica",
  lendaria: "Lendária",
};

export const PACK_RARITY_ORDER: readonly PackRarity[] = ["comum", "rara", "epica", "lendaria"];

export function isPackTier(value: string): value is PackTier {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

export function isPackRarity(value: string): value is PackRarity {
  return PACK_RARITY_ORDER.includes(value as PackRarity);
}

/** Um pacote do jogador. A skin e a raridade só vêm depois de aberto (o banco não as entrega antes). */
export type MyPack = {
  id: string;
  matchId: string;
  round: number;
  /** Mês do conjunto (`AAAA-MM`). */
  month: string;
  tier: PackTier;
  /** Chance real de cada raridade neste pacote, em % (já com a proteção contra azar). */
  odds: Partial<Record<PackRarity, number>>;
  openedAt: string | null;
  skin: string | null;
  rarity: PackRarity | null;
  wasDuplicate: boolean;
  coinsAwarded: number;
};

export type OpenedPack = { skin: string; rarity: PackRarity; wasDuplicate: boolean; coinsAwarded: number };
