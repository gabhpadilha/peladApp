import type { Player } from "@/types/player";

/**
 * Jogador de exemplo das cartas que ainda não são de quem está vendo: vitrines e
 * prévias da Loja, slides de novidades da home, prêmio de primeiro login e a
 * Coleção vazia. Decisão do dono do app (2026-10-22): o rosto e os dados de cada
 * um só aparecem nas cartas que são dele, para a carta ser conquistada.
 * Foto recortada pelo mesmo fluxo do "Sua foto" (`public/cartas/exemplo-jogador.webp`).
 */
export const SAMPLE_PLAYER: Player = {
  id: "exemplo",
  nickname: "Craque",
  fullName: "Jogador de exemplo",
  photo: { url: "/cartas/exemplo-jogador.webp", kind: "cutout" },
  cardSkin: null,
  level: 10,
  role: "outfield",
  position: "ALA",
  ovr: 88,
  attributes: { vel: 97, chu: 90, pas: 82, dri: 92, def: 40, fis: 80 },
};
