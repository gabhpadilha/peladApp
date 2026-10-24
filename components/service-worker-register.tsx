"use client";

import { useEffect } from "react";

/** Registra o service worker do PWA (`public/sw.js`). Não desenha nada. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error: unknown) => console.error("Falha ao registrar o service worker", error));
  }, []);

  return null;
}
