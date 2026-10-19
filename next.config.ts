import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Upload da foto da carta (recorte PNG + original): o padrão de 1MB das Server Actions é pouco.
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Fotos das cartas no Supabase Storage (bucket público player-photos).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/player-photos/**" },
    ],
  },
  async redirects() {
    return [
      // /pelada virou duas páginas: Rodadas (principal) e Elenco.
      { source: "/pelada", destination: "/rodadas", permanent: false },
      // Troca de senha deixou de ser obrigatória; agora fica em Elenco → "Sua senha".
      { source: "/trocar-senha", destination: "/elenco", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
