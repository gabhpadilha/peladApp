import type { Player, PlayerPosition } from "@/types/player";

/** Linha ou goleiro: decide os 6 atributos avaliados. */
export type PlayerRole = Player["role"];

/**
 * `match_attendance.plays_in_goal`: `null` = a posição do cadastro; `true` =
 * linha que jogou no gol; `false` = goleiro que jogou na linha.
 */
export type PlaysInGoal = boolean | null;

/** Papel do jogador na rodada: é por ele que a pessoa é avaliada. */
export function getRoundRole(player: Player, playsInGoal: PlaysInGoal): PlayerRole {
  if (playsInGoal === null) return player.role;
  return playsInGoal ? "goalkeeper" : "outfield";
}

/** Jogou fora da posição do cadastro: a nota não entra no OVR. */
export function isOffPosition(playsInGoal: PlaysInGoal): boolean {
  return playsInGoal !== null;
}

/** Posição para montar o campo da mesa tática (quem jogou no gol vai para o gol). */
export function getRoundSlotPosition(player: Player, playsInGoal: PlaysInGoal): PlayerPosition {
  if (playsInGoal === null) return player.position;
  return playsInGoal ? "GOL" : "FIX";
}
