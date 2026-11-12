import { getCurrentShopEvent } from "@/lib/shop-events";

/**
 * Personalizações de carta vendidas na Loja (CanchaCoins). Cada uma aparece a
 * partir de um nível e custa um preço; comprada, é do jogador para sempre.
 * Sem personalização, a carta é a padrão (Bronze, Prata ou Ouro pelo OVR).
 * Carta nova: entre aqui + tokens `card-skin-<chave>` no `app/globals.css` +
 * `SKIN_CLASSES` no `player-card.tsx`. O banco guarda só a chave (`group_members.card_skin`).
 * Carta de evento (`event`: evento da Loja em `lib/shop-events.ts` e ano): só fica à venda durante o evento daquele ano; quem
 * comprou continua usando depois (decisão do dono do app).
 */
export const CARD_SKINS = [
  // Prêmio de primeiro login: de graça para todo mundo (decisão do dono do app, 2026-10-21).
  { key: "esmeralda", name: "Esmeralda", level: 0, price: 0 },
  { key: "safira", name: "Safira", level: 4, price: 250 },
  { key: "ametista", name: "Ametista", level: 6, price: 350 },
  { key: "rubi", name: "Rubi", level: 8, price: 450 },
  // Turquesa e Ônix saíram em 2026-10-29 (decisão do dono do app; ninguém tinha comprado).
  { key: "icone", name: "Ícone", level: 11, price: 1200 },
  // Evento de Halloween de 2026: à venda só em outubro de 2026.
  { key: "lobisomem", name: "Lobisomem", level: 3, price: 200, event: { theme: "halloween", year: 2026 } },
  { key: "vampiro", name: "Vampiro", level: 3, price: 200, event: { theme: "halloween", year: 2026 } },
  // Evento Temporal de 2026 (aprovado pelo dono do app em 2026-10-30): à venda só em novembro de 2026.
  // A Nuvem carregada entrou no lugar do Trovão em 2026-10-31 (ninguém tinha comprado).
  { key: "nuvem", name: "Nuvem carregada", level: 3, price: 200, event: { theme: "temporal", year: 2026 }, packOnly: true },
  { key: "relampago", name: "Relâmpago", level: 3, price: 200, event: { theme: "temporal", year: 2026 }, packOnly: true },
  // Carta de prestígio do evento (decisão do dono do app em 2026-10-31): a moldura de metal do concept dele.
  { key: "lenda", name: "Lenda do Trovão", level: 5, price: 600, event: { theme: "temporal", year: 2026 }, packOnly: true },
  // Evento "Destino" de dezembro de 2026 (decisão do dono do app em 2026-11-05; alude a um vilão de cinema sem copiar nada): à venda só em dezembro de 2026.
  // Carta de prestígio, como a Lenda do Trovão. Reator e Fúria (nível 3, 200 CC) entram aqui quando as artes chegarem.
  { key: "destino", name: "Destino", level: 5, price: 600, event: { theme: "destino", year: 2026 }, packOnly: true },
  // Skins que só saem de pacote (nunca à venda na Loja; sem nível nem preço de tabela, então o Mercado usa a faixa da raridade).
  // Dilúvio: lendária do conjunto de novembro de 2026 (tema Toró), 3D por fora, por dentro e por trás (2026-11-10).
  { key: "diluvio", name: "Dilúvio", level: 0, price: 0, packOnly: true },
  // Raras (Aguaceiro, em azul, e Chuva Violeta, o mesmo desenho em violeta) e comuns (Nublado e Neblina, em cinza-azulado e verde-musgo) do mesmo conjunto,
  // feitas em código por Claude a pedido do dono do app (2026-11-10).
  { key: "aguaceiro", name: "Aguaceiro", level: 0, price: 0, packOnly: true },
  { key: "chuvavioleta", name: "Chuva Violeta", level: 0, price: 0, packOnly: true },
  { key: "nublado", name: "Nublado", level: 0, price: 0, packOnly: true },
  { key: "neblina", name: "Neblina", level: 0, price: 0, packOnly: true },
  { key: "chuvaesmeralda", name: "Chuva Esmeralda", level: 0, price: 0, packOnly: true },
  { key: "chuvarubi", name: "Chuva Rubi", level: 0, price: 0, packOnly: true },
  { key: "cerracao", name: "Cerração", level: 0, price: 0, packOnly: true },
  { key: "crepusculo", name: "Crepúsculo", level: 0, price: 0, packOnly: true },
  // Segunda carta de prestígio de dezembro (2026-11-09): tempestade nórdica (martelo de runas, peles e raios azuis), só alusões à mitologia.
  { key: "tormenta", name: "Tormenta", level: 5, price: 600, event: { theme: "destino", year: 2026 }, packOnly: true },
  // Terceira de prestígio de dezembro (2026-11-09): o trapaceiro nórdico (chifres dourados, fumaça verde e runas), só alusões à mitologia.
  { key: "embuste", name: "Embuste", level: 5, price: 600, event: { theme: "destino", year: 2026 }, packOnly: true },
  // Épicas do conjunto de dezembro de 2026 (evento Destino, só de pacote; 2026-11-12): borda com 1 enfeite no topo e fundo do poder do herói,
  // só alusões (sem nome, emblema ou traje de personagem). Peças do dono no Gemini em `docs/cartas/<chave>/pecas/`, camadas por `scripts/cartas/montar-epica.py`.
  { key: "rajada", name: "Rajada", level: 0, price: 0, event: { theme: "destino", year: 2026 }, packOnly: true },
  { key: "pedreira", name: "Pedreira", level: 0, price: 0, event: { theme: "destino", year: 2026 }, packOnly: true },
  { key: "cartada", name: "Cartada", level: 0, price: 0, event: { theme: "destino", year: 2026 }, packOnly: true },
  { key: "ima", name: "Ímã", level: 0, price: 0, event: { theme: "destino", year: 2026 }, packOnly: true },
  { key: "miragem", name: "Miragem", level: 0, price: 0, event: { theme: "destino", year: 2026 }, packOnly: true },
  { key: "elastico", name: "Elástico", level: 0, price: 0, event: { theme: "destino", year: 2026 }, packOnly: true },
  { key: "labareda", name: "Labareda", level: 0, price: 0, event: { theme: "destino", year: 2026 }, packOnly: true },
  { key: "garra", name: "Garra", level: 0, price: 0, event: { theme: "destino", year: 2026 }, packOnly: true },
  // Épicas novas de novembro de 2026 (evento Toró, só de pacote; 2026-11-12): fundo e borda do dono no Gemini, montados por `scripts/cartas/montar-epica.py`.
  { key: "granizo", name: "Granizo", level: 0, price: 0, event: { theme: "temporal", year: 2026 }, packOnly: true },
  // Lendária nova de novembro de 2026 (evento Toró, só de pacote; 2026-11-12): o rei dos mares na tempestade, só alusões (sem nome nem traje de personagem).
  { key: "marerei", name: "Maré-Rei", level: 0, price: 0, event: { theme: "temporal", year: 2026 }, packOnly: true },
  { key: "ciclone", name: "Ciclone", level: 0, price: 0, event: { theme: "temporal", year: 2026 }, packOnly: true },
  { key: "enxurrada", name: "Enxurrada", level: 0, price: 0, event: { theme: "temporal", year: 2026 }, packOnly: true },
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
  if ("packOnly" in skin) return false;
  if (!("event" in skin)) return true;
  return today.startsWith(`${skin.event.year}-`) && getCurrentShopEvent(today).key === skin.event.theme;
}
