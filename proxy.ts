import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos, imagens e o recorte de fundo (WASM + modelo do MediaPipe em public/mediapipe).
    "/((?!_next/static|_next/image|favicon.ico|mediapipe/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
