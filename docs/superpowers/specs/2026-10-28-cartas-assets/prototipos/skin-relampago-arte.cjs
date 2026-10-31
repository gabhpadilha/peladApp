// Skin Relâmpago a partir da arte montada pelo dono do app em 2026-10-31
// (`relampago-arte-dono.jpg`, 825 × 1024: a carta inteira com moldura dourada e enfeites).
// Separa em duas imagens:
// - `skin-relampago.webp` (600 × 860): o miolo, dentro do tubo de dentro da moldura;
// - `skin-relampago-vaza.webp` (714 × 1000, transparente): a caixa da carta de neon (a carta ocupa os
//   84% do meio), só com o que fica por fora da carta (moldura de fora, raio do topo, cacos, raios),
//   com o preto do fundo recortado pela luminância, SEM os raios;
// - `skin-relampago-raios.webp` (714 × 1000, transparente): só os raios das decorações (o do topo
//   com as faíscas, o da lateral esquerda, o da direita e o de baixo), que a carta faz piscar como
//   trovão (pedido do dono do app em 2026-10-31). As linhas retas da moldura ficam fora (faixas
//   medidas), para a moldura não piscar junto.
// Uso: node skin-relampago-arte.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "relampago-arte-dono.jpg");

// Centro do tubo de dentro da moldura na arte (medido): é a borda da carta.
const CARD = { left: 112.5, top: 114.5, width: 604, height: 840.5 };
const BOX = { left: CARD.left - (CARD.width / 0.84 - CARD.width) / 2, top: CARD.top - (CARD.height / 0.84 - CARD.height) / 2, width: CARD.width / 0.84, height: CARD.height / 0.84 };
const clamp = (v) => Math.max(0, Math.min(1, v));

// Onde estão os raios na arte (retângulos medidos) e as linhas retas da moldura que passam por eles.
const BOLT_AREAS = [
  { left: 375, top: 12, right: 485, bottom: 100 }, // topo: o raio e as faíscas
  { left: 40, top: 545, right: 150, bottom: 815 }, // lateral esquerda
  { left: 712, top: 215, right: 775, bottom: 590 }, // lateral direita (a parte de fora da carta)
  { left: 175, top: 955, right: 265, bottom: 1008 }, // embaixo
];
const LINE_X = [[74, 81], [87, 96], [102, 118], [711, 722], [737, 744], [751, 758]];
const LINE_Y = [[86, 99], [108, 121], [950, 960], [971, 978], [984, 998]];
const inBand = (v, bands) => bands.some(([a, b]) => v >= a && v <= b);
function boltStrength(sx, sy, r, g, b) {
  if (!BOLT_AREAS.some((a) => sx >= a.left && sx <= a.right && sy >= a.top && sy <= a.bottom)) return 0;
  if (inBand(sx, LINE_X) || inBand(sy, LINE_Y)) return 0;
  // Raio = claro e puxado para o branco (o azul alto separa dos cacos dourados).
  return smooth(0.5, 0.75, Math.max(r, g, b) / 255) * smooth(0.3, 0.5, b / 255);
}
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

(async () => {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;

  // Miolo: um pouco para dentro do tubo (a moldura de neon da carta cobre a borda).
  await sharp(SRC).extract({ left: 117, top: 119, width: 596, height: 832 }).resize(600, 860, { fit: "fill" }).webp({ quality: 90 }).toFile(`${OUT}/skin-relampago.webp`);

  // Caixa: cada pixel da caixa vem da arte; dentro da carta (além do tubo) fica transparente.
  const BW = 714, BH = 1000;
  const out = Buffer.alloc(BW * BH * 4);
  const bolts = Buffer.alloc(BW * BH * 4);
  const rx = CARD.width * 0.09, ry = CARD.height * 0.065;
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const sx = Math.round(BOX.left + (x / BW) * BOX.width), sy = Math.round(BOX.top + (y / BH) * BOX.height);
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      // Profundidade dentro da carta (cantos arredondados): além de 5px, transparente.
      const lx = sx - CARD.left, ly = sy - CARD.top;
      let depth = -1;
      if (lx > 0 && ly > 0 && lx < CARD.width && ly < CARD.height) {
        const cx = Math.min(Math.max(lx, rx), CARD.width - rx), cy = Math.min(Math.max(ly, ry), CARD.height - ry);
        const corner = Math.hypot((lx - cx) / rx, (ly - cy) / ry);
        depth = corner > 1 ? -1 : corner > 0 ? (1 - corner) * Math.min(rx, ry) : Math.min(lx, ly, CARD.width - lx, CARD.height - ly);
      }
      const i = (sy * W + sx) * C, o = (y * BW + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = Math.max(r, g, b) / 255;
      const inside = depth > 5 ? 0 : 1;
      const bolt = boltStrength(sx, sy, r, g, b) * inside;
      const a = smooth(0.08, 0.3, lum) * inside * (1 - bolt);
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = Math.round(a * 255);
      bolts[o] = r; bolts[o + 1] = g; bolts[o + 2] = b; bolts[o + 3] = Math.round(bolt * 255);
    }
  }
  await sharp(out, { raw: { width: BW, height: BH, channels: 4 } }).webp({ quality: 85, alphaQuality: 90 }).toFile(`${OUT}/skin-relampago-vaza.webp`);
  // Os raios com um brilho em volta (cópia borrada por baixo), para acenderem de verdade.
  const boltsImage = sharp(bolts, { raw: { width: BW, height: BH, channels: 4 } });
  const glow = await boltsImage.clone().blur(4).png().toBuffer();
  const sharpBolts = await boltsImage.clone().png().toBuffer();
  await sharp({ create: { width: BW, height: BH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: glow }, { input: glow }, { input: sharpBolts }])
    .webp({ quality: 88, alphaQuality: 95 })
    .toFile(`${OUT}/skin-relampago-raios.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
