import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
