// Skin Lenda do Trovão (2026-10-31): a moldura do concept que o dono do app criou no Gemini
// (`lenda-concept-dono.jpg`, 737 × 1024: metal dourado envelhecido, raio no topo, raios elétricos).
// O miolo do concept tem os textos pintados, então só a moldura entra (`skin-lenda-vaza.webp`), e o
// fundo é o da arte de tempestade (`skin-lenda.webp`, de `skin-lenda-fundo.cjs`). A borda da carta fica 12 px para fora do
// painel de dentro, para a moldura grossa caber na sobra da caixa (cobre 12 px da carta).
// Uso: node skin-tempestade-arte.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "lenda-concept-dono.jpg");

// Centro do fio dourado de dentro (medido) = borda da carta.
const CARD = { left: 122, top: 168, width: 537, height: 759 };
const BOX = { left: CARD.left - (CARD.width / 0.84 - CARD.width) / 2, top: CARD.top - (CARD.height / 0.84 - CARD.height) / 2, width: CARD.width / 0.84, height: CARD.height / 0.84 };
// Janela da carta de neon: 1,7% da largura e 1,21% da altura para dentro.
const WIN = { left: CARD.left + CARD.width * 0.017, top: CARD.top + CARD.height * 0.0121, width: CARD.width * 0.966, height: CARD.height * 0.9758 };
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

(async () => {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  const BW = 714, BH = 1000;
  const out = Buffer.alloc(BW * BH * 4);
  const bolts = Buffer.alloc(BW * BH * 4);
  const rx = CARD.width * 0.09, ry = CARD.height * 0.065;
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const sx = Math.round(BOX.left + (x / BW) * BOX.width), sy = Math.round(BOX.top + (y / BH) * BOX.height);
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const lx = sx - CARD.left, ly = sy - CARD.top;
      let depth = -1;
      if (lx > 0 && ly > 0 && lx < CARD.width && ly < CARD.height) {
        const cx = Math.min(Math.max(lx, rx), CARD.width - rx), cy = Math.min(Math.max(ly, ry), CARD.height - ry);
        const corner = Math.hypot((lx - cx) / rx, (ly - cy) / ry);
        depth = corner > 1 ? -1 : corner > 0 ? (1 - corner) * Math.min(rx, ry) : Math.min(lx, ly, CARD.width - lx, CARD.height - ly);
      }
      const i = (sy * W + sx) * C, o = (y * BW + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Dentro da carta: opaco só nos 12 px que a moldura cobre (some até 14 px; mais para dentro
      // vinha a fumaça do painel do concept, uma faixa escura). Fora: o preto recortado pela luminância.
      const keep = depth >= 0 ? 1 - smooth(12, 14, depth) : smooth(0.06, 0.25, Math.max(r, g, b) / 255);
      // Raios: claros e puxados para o branco ou o azul (a moldura de metal é dourada, com pouco azul).
      const bolt = Math.max(smooth(0.7, 0.85, Math.max(r, g, b) / 255) * smooth(0.82, 0.98, b / Math.max(1, r)), smooth(0.86, 0.96, Math.min(r, g, b) / 255)) * (depth > 12 ? 0 : 1);
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = Math.round(keep * (1 - bolt) * 255);
      bolts[o] = r; bolts[o + 1] = g; bolts[o + 2] = b; bolts[o + 3] = Math.round(bolt * 255);
    }
  }
  await sharp(out, { raw: { width: BW, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-vaza.webp`);
  // Raios numa camada própria (`skin-lenda-raios.webp`), com um brilho em volta, para estalar.
  const layer = sharp(bolts, { raw: { width: BW, height: BH, channels: 4 } });
  const glow = await layer.clone().blur(3).png().toBuffer();
  await sharp({ create: { width: BW, height: BH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: glow }, { input: await layer.clone().png().toBuffer() }])
    .webp({ quality: 88, alphaQuality: 95 })
    .toFile(`${OUT}/skin-lenda-raios.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
