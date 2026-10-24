// Gera os PNGs do PWA a partir de app/icon.svg (a fonte única do ícone).
// Rode à mão depois de mudar o ícone: `node scripts/generate-pwa-icons.mjs`.
// Os PNGs ficam no git: a Vercel não precisa rodar isto.
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "app", "icon.svg"));
const iconsDir = join(root, "public", "icons");
mkdirSync(iconsDir, { recursive: true });

// Mesma cor do fundo do ícone (e do themeColor do app).
const BACKGROUND = "#0b130f";
// O Android recorta o ícone "maskable" em círculo ou gota: o desenho vai para os 80% do meio.
const MASKABLE_SAFE_ZONE = 0.8;

async function render(size, file) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(file);
  console.log(`ok ${file}`);
}

async function renderMaskable(size, file) {
  const inner = Math.round(size * MASKABLE_SAFE_ZONE);
  const pad = Math.floor((size - inner) / 2);
  const art = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer();
  await sharp(art)
    .extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: BACKGROUND })
    .png()
    .toFile(file);
  console.log(`ok ${file}`);
}

await render(192, join(iconsDir, "icon-192.png"));
await render(512, join(iconsDir, "icon-512.png"));
await renderMaskable(512, join(iconsDir, "maskable-512.png"));
// iPhone: "Adicionar à Tela de Início" (o iOS arredonda os cantos sozinho).
await render(180, join(root, "app", "apple-icon.png"));
