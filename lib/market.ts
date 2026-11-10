import { getSkinRarity, type PackRarity } from "@/lib/packs";
import { CARD_SKINS } from "@/types/card-skin";

/**
 * Regras do Mercado de skins (design em docs/superpowers/specs/2026-11-09-mercado-skins-design.md).
 * Usadas no navegador (faixa no formulário) e no servidor (valida o preço antes de anunciar).
 */

/** Prazo único de cada anúncio. */
export const MARKET_LISTING_HOURS = 24;
/** Máximo de anúncios ativos por jogador (o banco também confere: PA026). */
export const MARKET_MAX_ACTIVE_LISTINGS = 10;
/** Skins que nunca vão para o Mercado (a Esmeralda é grátis para todos; o banco também confere: PA022). */
export const MARKET_BLOCKED_SKINS: ReadonlySet<string> = new Set(["esmeralda"]);

/** Faixa do anúncio para skins vendidas na Loja: de 70% a 130% do preço de tabela (sem o desconto de promoção). */
const SHOP_RANGE = { min: 0.7, max: 1.3 } as const;

/** Faixa das skins que só saem de pacote, por raridade. */
export const RARITY_PRICE_RANGES: Readonly<Record<PackRarity, PriceRange>> = {
  comum: { min: 50, max: 150 },
  rara: { min: 100, max: 300 },
  epica: { min: 200, max: 700 },
  lendaria: { min: 500, max: 2000 },
};

export type PriceRange = { min: number; max: number };

/** Mínimo e máximo do anúncio da skin, ou `null` se ela não pode ser vendida. */
export function getMarketPriceRange(skin: string): PriceRange | null {
  if (MARKET_BLOCKED_SKINS.has(skin)) return null;
  const shopSkin = CARD_SKINS.find((item) => item.key === skin);
  if (shopSkin && shopSkin.price > 0) {
    return { min: Math.round(shopSkin.price * SHOP_RANGE.min), max: Math.round(shopSkin.price * SHOP_RANGE.max) };
  }
  const rarity = getSkinRarity(skin);
  return rarity ? RARITY_PRICE_RANGES[rarity] : null;
}

/** O preço cabe na faixa da skin? */
export function isMarketPriceAllowed(skin: string, price: number): boolean {
  const range = getMarketPriceRange(skin);
  return range !== null && Number.isInteger(price) && price >= range.min && price <= range.max;
}

/** Mensagem para o usuário por código de erro do banco (PA020 a PA031). Nunca técnica. */
export const MARKET_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  PA009: "Sua pelada está suspensa. Fale com o Administrador.",
  PA020: "Sua conta está desativada nesta pelada.",
  PA021: "Essa skin não está mais com você. Recarregue a página.",
  PA022: "A Esmeralda é grátis para todos e não pode ser vendida.",
  PA023: "Essa skin está na sua carta. Troque de carta antes de anunciar.",
  PA024: "Confira o preço e tente de novo.",
  PA025: "Essa skin já está anunciada.",
  PA026: `Você já tem ${MARKET_MAX_ACTIVE_LISTINGS} anúncios ativos. Cancele um ou espere vender.`,
  PA027: "Esse anúncio já saiu do ar.",
  PA028: "Esse anúncio já foi vendido ou saiu do ar.",
  PA029: "Esse anúncio é seu.",
  PA030: "Você já tem essa skin.",
  PA031: "CanchaCoins insuficientes para essa compra.",
};

/** Passo do botão − / + do preço no formulário de anunciar. */
export const MARKET_PRICE_STEP = 10;

/** Preço sugerido ao abrir o formulário: o de tabela da Loja ou o meio da faixa da raridade, arredondado ao passo. */
export function getMarketSuggestedPrice(skin: string): number | null {
  const range = getMarketPriceRange(skin);
  if (!range) return null;
  const shopSkin = CARD_SKINS.find((item) => item.key === skin);
  const target = shopSkin && shopSkin.price > 0 ? shopSkin.price : (range.min + range.max) / 2;
  const rounded = Math.round(target / MARKET_PRICE_STEP) * MARKET_PRICE_STEP;
  return Math.min(range.max, Math.max(range.min, rounded));
}

/** Cor principal de cada skin, para o filtro do Mercado. Skin nova: acrescente aqui. */
export const SKIN_COLORS: Readonly<Record<string, string>> = {
  esmeralda: "Verde",
  safira: "Azul",
  ametista: "Roxa",
  rubi: "Vermelha",
  icone: "Branca",
  lobisomem: "Azul",
  vampiro: "Vermelha",
  nuvem: "Branca",
  relampago: "Dourada",
  lenda: "Azul",
  destino: "Verde",
  tormenta: "Azul",
  aguaceiro: "Azul",
  chuvavioleta: "Roxa",
  nublado: "Azul",
  neblina: "Verde",
  chuvaesmeralda: "Verde",
  chuvarubi: "Vermelha",
  cerracao: "Dourada",
  crepusculo: "Roxa",
};

export const MARKET_COLOR_OPTIONS: readonly string[] = ["Azul", "Roxa", "Vermelha", "Branca", "Dourada", "Verde"];
