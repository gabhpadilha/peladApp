import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino do link mágico. Aceita os dois formatos do Supabase:
 * - `token_hash` + `type` (template de e-mail customizado; funciona em outro aparelho);
 * - `code` (PKCE; só funciona no mesmo navegador que pediu o link).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

  const supabase = await createClient();
  let isSignedIn = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    isSignedIn = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    isSignedIn = !error;
  }

  const destination = request.nextUrl.clone();
  destination.search = "";
  destination.pathname = isSignedIn ? next : "/auth/erro";
  return NextResponse.redirect(destination);
}
