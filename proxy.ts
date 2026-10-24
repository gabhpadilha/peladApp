import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos, imagens, o recorte de fundo (WASM + modelo do MediaPipe em public/mediapipe)
    // e o PWA (manifesto e service worker: o navegador os busca sem login).
    "/((?!_next/static|_next/image|favicon.ico|mediapipe/|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
