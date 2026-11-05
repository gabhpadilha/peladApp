import type { MetadataRoute } from "next";

/** Manifesto do PWA: instalar na tela de início, abrir em tela cheia, ícone do escudo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cancha Club",
    short_name: "Cancha Club",
    description: "Avaliações pós-jogo, cartas com OVR e sorteio de times equilibrado para a sua pelada.",
    lang: "pt-BR",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Mesmo tom do themeColor do layout e do fundo do ícone.
    background_color: "#0b130f",
    theme_color: "#0b130f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
