import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/**
 * Client do Supabase para Server Components, Server Actions e Route Handlers.
 * Crie um por requisição; nunca guarde em variável de módulo.
 */
export async function createClient() {
  // Dados de sessão são sempre da requisição: sem isso, o prefetch com cookies
  // (Partial Prefetching) pré-renderiza e o Supabase lê Date.now() ao validar o token.
  await connection();
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado de um Server Component, que não pode gravar cookies.
          // O proxy.ts já renova a sessão, então pode ignorar.
        }
      },
    },
  });
}
