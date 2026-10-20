/**
 * Personalizações de carta vendidas na Loja (PeladaCoins). Cada uma aparece a
 * partir de um nível e custa um preço; comprada, é do jogador para sempre.
 * Sem personalização, a carta é a padrão (Bronze, Prata ou Ouro pelo OVR).
 * Carta nova (ex.: evento do mês): entre aqui + tokens `card-skin-<chave>` no
 * `app/globals.css`. O banco guarda só a chave (`group_members.card_skin`).
 */
export const CARD_SKINS = [
  // Liberada desde o começo: dá para comprar com o bônus de boas-vindas.
  { key: "esmeralda", name: "Esmeralda", level: 0, price: 150 },
  { key: "safira", name: "Safira", level: 4, price: 250 },
  { key: "ametista", name: "Ametista", level: 6, price: 350 },
  { key: "rubi", name: "Rubi", level: 8, price: 450 },
  { key: "turquesa", name: "Turquesa", level: 10, price: 600 },
  { key: "onix", name: "Ônix", level: 13, price: 800 },
  { key: "icone", name: "Ícone", level: 16, price: 1200 },
  // Evento de Halloween (outubro de 2026).
  { key: "lobisomem", name: "Lobisomem", level: 3, price: 200 },
  { key: "vampiro", name: "Vampiro", level: 3, price: 200 },
] as const;

export type CardSkin = (typeof CARD_SKINS)[number];
export type CardSkinKey = CardSkin["key"];

export function isCardSkinKey(value: unknown): value is CardSkinKey {
  return CARD_SKINS.some((skin) => skin.key === value);
}

export function getCardSkin(key: CardSkinKey): CardSkin {
  return CARD_SKINS.find((skin) => skin.key === key) ?? CARD_SKINS[0];
}
