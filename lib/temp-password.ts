import "server-only";
import { randomInt } from "node:crypto";

/** Sem letras/dígitos que se confundem (0/o, 1/l/i) ao ditar ou copiar do WhatsApp. */
const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";

function pick(alphabet: string, length: number): string {
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

/**
 * Senha gerada fácil de repassar, ex.: "pelada-4827-kxm". Vale até o jogador
 * trocar (opcional, em Elenco → "Sua senha").
 */
export function generateTempPassword(): string {
  return `pelada-${pick(DIGITS, 4)}-${pick(LETTERS, 3)}`;
}
