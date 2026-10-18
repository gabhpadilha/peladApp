import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** A chave secreta ignora o RLS: use só em Server Actions, depois de checar permissão. */
export function hasAdminEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/**
 * Client com a chave secreta (service role), para criar contas de jogadores.
 * Nunca importe em Client Components nem exponha o resultado sem filtrar.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Defina SUPABASE_SECRET_KEY no .env.local (veja .env.example).");
  }

  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
