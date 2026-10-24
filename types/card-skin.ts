import { getThemeForDate } from "@/lib/card-themes";

/**
 * Personalizações de carta vendidas na Loja (CanchaCoins). Cada uma aparece a
 * partir de um nível e custa um preço; comprada, é do jogador para sempre.
 * Sem personalização, a carta é a padrão (Bronze, Prata ou Ouro pelo OVR).
 * Carta nova: entre aqui + tokens `card-skin-<chave>` no `app/globals.css` +
 * `SKIN_CLASSES` no `player-card.tsx`. O banco guarda só a chave (`group_members.card_skin`).
 * Carta de evento (`event`): só fica à venda durante o tema daquele ano; quem
 * comprou continua usando depois (decisão do dono do app).
 */
export const CARD_SKINS = [
  // Prêmio de primeiro login: de graça para todo mundo (decisão do dono do app, 2026-10-21).
  { key: "esmeralda", name: "Esmeralda", level: 0, price: 0 },
  { key: "safira", name: "Safira", level: 4, price: 250 },
  { key: "ametista", name: "Ametista", level: 6, price: 350 },
  { key: "rubi", name: "Rubi", level: 8, price: 450 },
  { key: "turquesa", name: "Turquesa", level: 10, price: 600 },
  { key: "onix", name: "Ônix", level: 13, price: 800 },
  { key: "icone", name: "Ícone", level: 16, price: 1200 },
  // Evento de Halloween de 2026: à venda só em outubro de 2026.
  { key: "lobisomem", name: "Lobisomem", level: 3, price: 200, event: { theme: "halloween", year: 2026 } },
  { key: "vampiro", name: "Vampiro", level: 3, price: 200, event: { theme: "halloween", year: 2026 } },
  // Evento Brasileirão de 2026 (novembro): um por clube da Série A, com o escudo em public/clubes/.
  { key: "clube-athletico-pr", name: "Athletico-PR", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/athletico-pr.png" },
  { key: "clube-atletico-mg", name: "Atlético-MG", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/atletico-mg.png" },
  { key: "clube-bahia", name: "Bahia", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/bahia.png" },
  { key: "clube-botafogo", name: "Botafogo", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/botafogo.png" },
  { key: "clube-chapecoense", name: "Chapecoense", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/chapecoense.png" },
  { key: "clube-corinthians", name: "Corinthians", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/corinthians.png" },
  { key: "clube-coritiba", name: "Coritiba", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/coritiba.png" },
  { key: "clube-cruzeiro", name: "Cruzeiro", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/cruzeiro.png" },
  { key: "clube-flamengo", name: "Flamengo", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/flamengo.png" },
  { key: "clube-fluminense", name: "Fluminense", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/fluminense.png" },
  { key: "clube-gremio", name: "Grêmio", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/gremio.png" },
  { key: "clube-internacional", name: "Internacional", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/internacional.png" },
  { key: "clube-mirassol", name: "Mirassol", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/mirassol.png" },
  { key: "clube-palmeiras", name: "Palmeiras", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/palmeiras.png" },
  { key: "clube-bragantino", name: "Bragantino", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/bragantino.png" },
  { key: "clube-remo", name: "Remo", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/remo.png" },
  { key: "clube-santos", name: "Santos", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/santos.png" },
  { key: "clube-sao-paulo", name: "São Paulo", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/sao-paulo.png" },
  { key: "clube-vasco", name: "Vasco", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/vasco.png" },
  { key: "clube-vitoria", name: "Vitória", level: 3, price: 150, event: { theme: "brasileirao", year: 2026 }, crest: "/clubes/vitoria.png" },
] as const;

export type CardSkin = (typeof CARD_SKINS)[number];
export type CardSkinKey = CardSkin["key"];

export function isCardSkinKey(value: unknown): value is CardSkinKey {
  return CARD_SKINS.some((skin) => skin.key === value);
}

export function getCardSkin(key: CardSkinKey): CardSkin {
  return CARD_SKINS.find((skin) => skin.key === key) ?? CARD_SKINS[0];
}

/** Carta de evento ainda à venda em `today` (`AAAA-MM-DD`, horário de Brasília)? As outras, sempre. */
export function isCardSkinOnSale(skin: CardSkin, today: string): boolean {
  if (!("event" in skin)) return true;
  return today.startsWith(`${skin.event.year}-`) && getThemeForDate(today) === skin.event.theme;
}
