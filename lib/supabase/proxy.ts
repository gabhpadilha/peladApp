import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "./env";

/** Rotas abertas sem login. Todo o resto exige sessão (contas são criadas pelo organizador). */
const PUBLIC_PATH_PREFIXES = ["/entrar", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Renova o token de acesso a cada requisição, devolve os cookies atualizados
 * e manda quem não está logado para /entrar (voltando à página pedida).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem .env.local não há sessão para renovar (as páginas mostram o erro de configuração).
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
  const { data } = await supabase.auth.getClaims();

  const { pathname, search } = request.nextUrl;
  if (!data?.claims && !isPublicPath(pathname)) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/entrar";
    signInUrl.search = "";
    signInUrl.searchParams.set("next", `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(signInUrl);
    // Leva junto os cookies que a renovação possa ter gravado.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  // Devolva este `response` como está, para os cookies não saírem de sincronia.
  return response;
}
