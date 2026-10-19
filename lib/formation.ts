import type { PlayerPosition } from "@/types/player";

/**
 * Esquema tático do futsal (1-2-1): goleiro, fixo, duas alas e pivô.
 * A ordem dos slots é a de leitura do campo, de baixo (gol) para cima (ataque).
 */
export const FORMATION_SLOTS = [
  { key: "gol", position: "GOL" },
  { key: "fixo", position: "FIX" },
  { key: "ala-esquerda", position: "ALA" },
  { key: "ala-direita", position: "ALA" },
  { key: "pivo", position: "PIV" },
] as const satisfies readonly { key: string; position: PlayerPosition }[];

export type FormationSlotKey = (typeof FORMATION_SLOTS)[number]["key"];

type Positioned = { position: PlayerPosition };

/**
 * Distribui os titulares nos 5 slots do campo. Cada um vai para o slot da sua
 * posição; quem sobra (posição repetida, time sem goleiro ou com 2 pivôs) ocupa
 * os slots que ficaram vazios. Slot sem jogador fica `null` (time incompleto).
 */
export function assignFormation<T extends Positioned>(starters: readonly T[]): Record<FormationSlotKey, T | null> {
  const slots: Record<FormationSlotKey, T | null> = {
    gol: null,
    fixo: null,
    "ala-esquerda": null,
    "ala-direita": null,
    pivo: null,
  };
  const leftovers: T[] = [];

  for (const starter of starters) {
    const slot = FORMATION_SLOTS.find((candidate) => candidate.position === starter.position && slots[candidate.key] === null);
    if (slot) slots[slot.key] = starter;
    else leftovers.push(starter);
  }

  // Sobras: vão para qualquer slot vazio, deixando o gol por último (só vai um goleiro).
  const emptyKeys = FORMATION_SLOTS.map((slot) => slot.key).filter((key) => slots[key] === null);
  const preferred = [...emptyKeys.filter((key) => key !== "gol"), ...emptyKeys.filter((key) => key === "gol")];
  leftovers.forEach((player, index) => {
    const key = preferred[index];
    if (key) slots[key] = player;
  });

  return slots;
}
