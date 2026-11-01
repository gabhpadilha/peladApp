/** Promoção da Loja num período (decisão do dono do app; nada gravado no banco). */
export type ShopSale = {
  label: string;
  /** Desconto em % sobre o preço de tabela. */
  percent: number;
  /** Primeiro e último dia, `AAAA-MM-DD` (horário de Brasília). */
  start: string;
  end: string;
};

/** Black Friday 2026: de 31/10 (ligada um dia antes, com o Toró, a pedido do dono do app) a 30/11, em tudo. */
export const SHOP_SALES: readonly ShopSale[] = [
  { label: "Black Friday", percent: 30, start: "2026-10-31", end: "2026-11-30" },
];

/** Promoção valendo em `today` (`AAAA-MM-DD`), se houver. */
export function getActiveSale(today: string): ShopSale | null {
  return SHOP_SALES.find((sale) => today >= sale.start && today <= sale.end) ?? null;
}

/** Preço com o desconto da promoção (arredondado para CanchaCoins inteiras). */
export function getSalePrice(price: number, sale: ShopSale | null): number {
  return sale ? Math.round((price * (100 - sale.percent)) / 100) : price;
}
