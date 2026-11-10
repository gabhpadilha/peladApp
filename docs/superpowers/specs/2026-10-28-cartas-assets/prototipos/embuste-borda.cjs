// Moldura do Embuste (2026-11-09): mesmo recorte de luz da Tormenta (`tormenta-borda.cjs`), com as zonas de matéria desta arte.
//   SÓLIDO (opaco, cor original): a faixa de ferro (retângulo da moldura menos o miolo) e as zonas de matéria (chifres dourados, cabeças de dragão, panos, cantos de couro),
//   onde só entra o que não é fumaça (a fumaça verde, clara e dominada pelo verde, fica de fora do sólido).
//   LUZ (todo o resto: fumaça, brilho das runas, faíscas): alfa pelo brilho, cor desmultiplicada (cor / alfa), que soma luz e não deixa borda escura.
// Mesmo encaixe do `montar-carta.cjs` (caixa 840 × 1176 na célula 1000 × 1400). Saída: `premium-embuste-vaza.webp`.
// Uso: node embuste-borda.cjs <borda> <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[4], "node_modules/sharp"));
const [BORDA, OUT] = [process.argv[2], process.argv[3]];
const CELL = { w: 1000, h: 1400 }, BOX = { x: 80, y: 112, w: 840, h: 1176 };
const [BX0, BY0, BX1, BY1] = [48, 88, 692, 965]; // caixa da carta na imagem da moldura
const RING_OUT = [46, 86, 694, 967], RING_IN = [108, 150, 625, 903]; // faixa de ferro: de fora e de dentro
const ZONES = [[215, 8, 515, 182], [30, 56, 232, 345], [515, 56, 702, 400], [28, 795, 162, 977], [552, 795, 702, 977]]; // chifres, dragões com panos, cantos de couro
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
const one = async (buf, w, h, fn) => (await fn(sharp(buf, { raw: { width: w, height: h, channels: 1 } })).extractChannel(0).raw().toBuffer());

(async () => {
  const { data, info } = await sharp(BORDA).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const solidRaw = Buffer.alloc(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], lum = Math.max(r, g, b);
    const inRing = x >= RING_OUT[0] && x <= RING_OUT[2] && y >= RING_OUT[1] && y <= RING_OUT[3] && !(x > RING_IN[0] && x < RING_IN[2] && y > RING_IN[1] && y < RING_IN[3]);
    const smoke = g > 1.5 * r && g > 1.2 * b && lum > 70;
    const inZone = ZONES.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
    solidRaw[i] = inRing || (inZone && lum > 22 && !smoke) ? 255 : 0;
  }
  const closed = await one(solidRaw, W, H, (s) => s.blur(6).threshold(110));
  const solidSoft = await one(closed, W, H, (s) => s.blur(1.1));

  const px = Buffer.alloc(N * 4); // premultiplicado (reduz sem franja escura)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const lr = data[i * 3], lg = data[i * 3 + 1], lb = data[i * 3 + 2], lum = Math.max(lr, lg, lb);
    const edge = smooth(0, 24, x) * smooth(0, 24, W - 1 - x) * smooth(0, 24, y) * smooth(0, 24, H - 1 - y);
    const s = (solidSoft[i] / 255) * edge;
    const aL = clamp((lum - 14) / 186) * edge;
    const a = s + (1 - s) * aL;
    px[i * 4] = Math.round(s * lr + (1 - s) * aL * Math.min(255, aL > 0 ? lr / aL : 0));
    px[i * 4 + 1] = Math.round(s * lg + (1 - s) * aL * Math.min(255, aL > 0 ? lg / aL : 0));
    px[i * 4 + 2] = Math.round(s * lb + (1 - s) * aL * Math.min(255, aL > 0 ? lb / aL : 0));
    px[i * 4 + 3] = Math.round(a * 255);
  }
  const sx = BOX.w / (BX1 - BX0), sy = BOX.h / (BY1 - BY0);
  const tw = Math.round(W * sx), th = Math.round(H * sy);
  const big = await sharp(px, { raw: { width: W, height: H, channels: 4 } }).resize(tw, th, { kernel: "lanczos3" }).raw().toBuffer();
  for (let i = 0; i < tw * th; i++) {
    const a = big[i * 4 + 3] / 255;
    if (a > 0.003) { for (let c = 0; c < 3; c++) big[i * 4 + c] = Math.min(255, Math.round(big[i * 4 + c] / a)); }
  }
  const placed = await sharp(big, { raw: { width: tw, height: th, channels: 4 } }).png().toBuffer();
  const left = Math.round(BOX.x - BX0 * sx), top = Math.round(BOX.y - BY0 * sy);
  const cl = Math.max(0, -left), ct = Math.max(0, -top), cw = Math.min(tw - cl, CELL.w - Math.max(0, left)), ch = Math.min(th - ct, CELL.h - Math.max(0, top));
  const piece = await sharp(placed).extract({ left: cl, top: ct, width: cw, height: ch }).png().toBuffer();
  await sharp({ create: { width: CELL.w, height: CELL.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }])
    .webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(OUT, "premium-embuste-vaza.webp"));
  console.log("ok", { sx: sx.toFixed(4), sy: sy.toFixed(4), left, top });
})().catch((e) => { console.error(e); process.exit(1); });
