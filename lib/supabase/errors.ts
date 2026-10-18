import type { PostgrestError } from "@supabase/supabase-js";

/** Códigos do Postgres que viram mensagens para o usuário. */
const UNIQUE_VIOLATION = "23505";
const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";

/** Traduz um erro do banco numa mensagem curta, sem vazar detalhes internos. */
export function getDatabaseErrorMessage(error: PostgrestError, fallback: string): string {
  if (error.code === INSUFFICIENT_PRIVILEGE) return "Você não tem permissão para isso.";
  if (error.code === UNIQUE_VIOLATION) return "Isso já foi registrado.";
  if (error.code === CHECK_VIOLATION) return "Algum dado está fora do permitido.";
  return fallback;
}
