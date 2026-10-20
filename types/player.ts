import type { CardSkinKey } from "@/types/card-skin";

export const OUTFIELD_POSITIONS = ["FIX", "ALA", "PIV"] as const;
export type OutfieldPosition = (typeof OUTFIELD_POSITIONS)[number];
export type PlayerPosition = OutfieldPosition | "GOL";

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  FIX: "Fixo",
  ALA: "Ala",
  PIV: "Pivô",
  GOL: "Goleiro",
};

/** Ordem de exibição na carta, da esquerda para a direita. */
export const OUTFIELD_ATTRIBUTES = ["vel", "chu", "pas", "dri", "def", "fis"] as const;
export type OutfieldAttribute = (typeof OUTFIELD_ATTRIBUTES)[number];

export const GOALKEEPER_ATTRIBUTES = ["ref", "ela", "pos", "sai", "rep", "pes"] as const;
export type GoalkeeperAttribute = (typeof GOALKEEPER_ATTRIBUTES)[number];

export type PlayerAttribute = OutfieldAttribute | GoalkeeperAttribute;

export const ATTRIBUTE_LABELS: Record<PlayerAttribute, { abbreviation: string; name: string }> = {
  vel: { abbreviation: "VEL", name: "Velocidade" },
  chu: { abbreviation: "CHU", name: "Chute" },
  pas: { abbreviation: "PAS", name: "Passe" },
  dri: { abbreviation: "DRI", name: "Drible" },
  def: { abbreviation: "DEF", name: "Defesa" },
  fis: { abbreviation: "FIS", name: "Físico" },
  ref: { abbreviation: "REF", name: "Reflexo" },
  ela: { abbreviation: "ELA", name: "Elasticidade" },
  pos: { abbreviation: "POS", name: "Posicionamento" },
  sai: { abbreviation: "SAI", name: "Saída do gol" },
  rep: { abbreviation: "REP", name: "Reposição" },
  pes: { abbreviation: "PÉS", name: "Jogo com os pés" },
};

/** `cutout` = fundo removido (PNG/WebP com transparência); `original` = foto comum. */
export type PlayerPhoto = {
  url: string;
  kind: "cutout" | "original";
};

type ProfileBase = {
  id: string;
  /** Exibido na carta; máx. ~12 caracteres. */
  nickname: string;
  fullName: string;
  photo: PlayerPhoto | null;
  /** Personalização comprada na Loja e em uso; sem ela, a carta padrão (faixa do OVR). */
  cardSkin?: CardSkinKey | null;
  /** Nível (XP), mostrado no selo da ponta da carta. */
  level?: number | null;
};

/** Dados cadastrais, sem nada derivado das avaliações. */
export type OutfieldProfile = ProfileBase & { role: "outfield"; position: OutfieldPosition };
export type GoalkeeperProfile = ProfileBase & { role: "goalkeeper"; position: "GOL" };
export type PlayerProfile = OutfieldProfile | GoalkeeperProfile;

/**
 * Jogador com OVR e atributos calculados pelas avaliações (escala 0–99).
 * `null` = ainda não avaliado.
 */
export type OutfieldPlayer = OutfieldProfile & {
  ovr: number | null;
  attributes: Record<OutfieldAttribute, number | null>;
};

export type GoalkeeperPlayer = GoalkeeperProfile & {
  ovr: number | null;
  attributes: Record<GoalkeeperAttribute, number | null>;
};

export type Player = OutfieldPlayer | GoalkeeperPlayer;
