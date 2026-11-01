// Skin Lenda do Trovão, versão 2 (2026-11-01): as três camadas que o dono do app gerou no Gemini,
// no mesmo enquadramento (1421 × 2000): `lenda-v2-moldura-dono.jpg` (metal dourado envelhecido sobre
// preto), `lenda-v2-fundo-dono.jpg` (tempestade sobre ruínas) e `lenda-v2-raios-dono.jpg` (raios
// dourados e azuis sobre preto). Saem `skin-lenda.webp` (fundo, na janela da carta),
// `skin-lenda-vaza.webp` (moldura, na caixa inteira) e `skin-lenda-raios.webp` (os raios que estalam).
// Uso: node skin-lenda-v2.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const src = (name) => path.join(__dirname, `lenda-v2-${name}-dono.jpg`);

// Centro do tubo de dentro da moldura (medido: 228–265 / 1263–1301 / 327–368 / 1780–1818) = borda da carta.
const CARD = { left: 246, top: 347, width: 1036, height: 1452 };
// A carta de neon ocupa os 84% do meio da caixa (`TRIMMED_CARD`).
const BOX = { left: CARD.left - (CARD.width / 0.84 - CARD.width) / 2, top: CARD.top - (CARD.height / 0.84 - CARD.height) / 2, width: CARD.width / 0.84, height: CARD.height / 0.84 };
// Janela da carta de neon: 1,7% da largura e 1,21% da altura para dentro.
const WIN = { left: CARD.left + CARD.width * 0.017, top: CARD.top + CARD.height * 0.0121, width: CARD.width * 0.966, height: CARD.height * 0.9758 };
const BW = 714, BH = 1000;
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Distância (px da fonte) para dentro da borda arredondada da carta; negativa fora dela. */
function depthInCard(sx, sy) {
  const lx = sx - CARD.left, ly = sy - CARD.top;
  if (lx <= 0 || ly <= 0 || lx >= CARD.width || ly >= CARD.height) return -1;
  const rx = CARD.width * 0.09, ry = CARD.height * 0.065;
  const cx = Math.min(Math.max(lx, rx), CARD.width - rx), cy = Math.min(Math.max(ly, ry), CARD.height - ry);
  const corner = Math.hypot((lx - cx) / rx, (ly - cy) / ry);
  return corner > 1 ? -1 : corner > 0 ? (1 - corner) * Math.min(rx, ry) : Math.min(lx, ly, CARD.width - lx, CARD.height - ly);
}

/** Recorta uma camada sobre preto pela luminância, já na caixa da carta. */
async function keyLayer(file, alphaOf) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const out = Buffer.alloc(BW * BH * 4);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const sx = Math.round(BOX.left + (x / BW) * BOX.width), sy = Math.round(BOX.top + (y / BH) * BOX.height);
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const i = (sy * W + sx) * C, o = (y * BW + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
      out[o + 3] = Math.round(alphaOf(r, g, b, depthInCard(sx, sy)) * 255);
    }
  }
  return sharp(out, { raw: { width: BW, height: BH, channels: 4 } });
}

(async () => {
  await sharp(src("fundo"))
    .extract({ left: Math.round(WIN.left), top: Math.round(WIN.top), width: Math.round(WIN.width), height: Math.round(WIN.height) })
    .resize(600, 860, { fit: "fill" })
    .webp({ quality: 92 })
    .toFile(`${OUT}/skin-lenda.webp`);

  // Moldura: o preto some pela luminância (o miolo e a volta); as sombras do metal ficam.
  const frame = await keyLayer(src("moldura"), (r, g, b) => smooth(0.03, 0.16, Math.max(r, g, b) / 255));
  await frame.webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-vaza.webp`);

  // Raios: por fora da carta e só numa faixa rente à borda por dentro (o miolo fica para a foto;
  // os raios de dentro já estão parados no fundo).
  const edge = CARD.width * 0.05;
  const bolts = await keyLayer(src("raios"), (r, g, b, depth) => smooth(0.1, 0.4, Math.max(r, g, b) / 255) * (depth < 0 ? 1 : 1 - smooth(edge * 0.5, edge, depth)));
  await bolts.webp({ quality: 88, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-raios.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
