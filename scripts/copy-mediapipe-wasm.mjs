// Copia o WASM do MediaPipe para public/, para o recorte de fundo não depender
// de CDN externa (rede móvel ou firewall que bloqueia o jsdelivr). Roda no
// postinstall; a pasta de destino fica fora do git.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const target = join(root, "public", "mediapipe", "wasm");

// Só os carregadores que o FilesetResolver usa (com e sem SIMD).
const FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

if (!existsSync(source)) {
  console.warn("copy-mediapipe-wasm: @mediapipe/tasks-vision não instalado, nada a copiar.");
  process.exit(0);
}
mkdirSync(target, { recursive: true });
for (const file of FILES) copyFileSync(join(source, file), join(target, file));
console.log(`copy-mediapipe-wasm: ${FILES.length} arquivos em public/mediapipe/wasm`);
