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

/**
 * Raridade de cada skin, pela régua do dono do app (2026-11-08; ver `CLAUDE.md`): aparece como losangos discretos embaixo da carta em
 * todo lugar (`RarityPips` em `cancha-card.tsx`). Skin nova de pacote entra aqui junto com a entrada em `CARD_SKINS`.
 */
export const SKIN_RARITIES: Readonly<Record<string, PackRarity>> = {
  esmeralda: "epica",
  safira: "epica",
  ametista: "epica",
  rubi: "rara",
  icone: "rara",
  lobisomem: "rara",
  vampiro: "rara",
  nuvem: "epica",
  relampago: "epica",
  lenda: "epica",
  destino: "lendaria",
};

/**
 * Quanto a arte de cada skin passa da borda de baixo da carta (em `cqw`, medido por pixel na tela: moldura, folhas, brilho do neon),
 * para a gema de raridade ficar sempre a mesma distância da carta e nunca escondida embaixo da arte. Skin nova: medir de novo.
 */
export const SKIN_BOTTOM_OVERHANG: Readonly<Record<string, number>> = {
  esmeralda: 4.8,
  safira: 4.5,
  ametista: 3.3,
  rubi: 9.5,
  icone: 9.5,
  lobisomem: 8.6,
  vampiro: 8,
  nuvem: 6.3,
  relampago: 6.3,
  lenda: 10.4,
  destino: 2.7,
};

export function getSkinRarity(skin: string | null | undefined): PackRarity | null {
  return skin ? (SKIN_RARITIES[skin] ?? null) : null;
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
