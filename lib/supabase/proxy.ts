import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "./env";

/**
 * Renova o token de acesso a cada requisição e devolve os cookies atualizados
 * para os Server Components e para o navegador.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem .env.local o app ainda roda com os mocks; não há sessão para renovar.
  if (!hasSupabaseEnv()) return response;

  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims(): é aqui que a
  // sessão é renovada; sem isso o usuário é deslogado aleatoriamente.
  await supabase.auth.getClaims();

  // Devolva este `response` como está, para os cookies não saírem de sincronia.
  return response;
}
