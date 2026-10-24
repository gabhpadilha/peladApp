import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Upload da foto da carta (recorte PNG + original): o padrão de 1MB das Server Actions é pouco.
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Recorte de reserva no servidor (lib/person-matte.ts): binário nativo, fica fora do bundle.
  serverExternalPackages: ["onnxruntime-node"],
  // O modelo é lido do disco em tempo de execução e o binding nativo carrega a
  // libonnxruntime.so ao lado dele: o rastreio não enxerga nenhum dos dois sozinho.
  // A foto é trocada em /eu (cada um) e em /elenco (o Administrador): as duas levam o modelo.
  outputFileTracingIncludes: {
    "/elenco": [
      "./models/modnet-portrait-q.onnx",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1",
    ],
    "/eu": [
      "./models/modnet-portrait-q.onnx",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1",
    ],
  },
  // A Vercel roda em Linux x64: corta os binários das outras plataformas (~250MB).
  outputFileTracingExcludes: {
    "/*": [
      "./node_modules/onnxruntime-node/bin/napi-v6/darwin/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v6/win32/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/arm64/**/*",
    ],
  },
  // Fotos das cartas no Supabase Storage (bucket público player-photos).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/player-photos/**" },
    ],
  },
  // Service worker do PWA: sem cache, para a versão nova chegar logo a quem instalou.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // /pelada virou duas páginas: Rodadas (principal) e Elenco.
      { source: "/pelada", destination: "/rodadas", permanent: false },
      // Troca de senha deixou de ser obrigatória; agora fica em Eu → "Sua senha".
      { source: "/trocar-senha", destination: "/eu", permanent: false },
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
