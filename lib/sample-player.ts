import type { Player } from "@/types/player";

/**
 * Jogador de exemplo das cartas que ainda não são de quem está vendo: vitrines e
 * prévias da Loja, slides de novidades da home, prêmio de primeiro login e a
 * Coleção vazia. Decisão do dono do app (2026-10-22): o rosto e os dados de cada
 * um só aparecem nas cartas que são dele, para a carta ser conquistada.
 * Sem foto desde 2026-11-09 (pedido do dono do app): as vitrines mostram só o design (`ShowcaseCard`).
 */
export const SAMPLE_PLAYER: Player = {
  id: "exemplo",
  nickname: "Craque",
  fullName: "Jogador de exemplo",
  photo: null,
  cardSkin: null,
  level: 10,
  role: "outfield",
  position: "ALA",
  ovr: 88,
  attributes: { vel: 97, chu: 90, pas: 82, dri: 92, def: 40, fis: 80 },
};
