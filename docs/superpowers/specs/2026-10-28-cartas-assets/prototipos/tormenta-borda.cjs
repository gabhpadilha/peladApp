// Moldura da Tormenta (2026-11-09): recorte próprio, no lugar do `montar-carta.cjs`, que cercava os raios com uma silhueta escura opaca (mancha preta em volta de cada raio).
// Duas regras:
//   1) SÓLIDO (opaco, cor original): só o que é matéria, a faixa de ferro (retângulo da moldura menos o miolo) e as peles e o martelo do topo (pixels de baixa saturação, fechados).
//   2) LUZ (todo o resto: raios, brilho, faíscas): alfa pelo brilho, com a cor "desmultiplicada" (cor / alfa). Sobre o preto da arte original dá exatamente a mesma imagem,
//      mas sobre o fundo da carta não deixa borda escura: o raio soma luz, não pinta preto.
// Mesmo encaixe do `montar-carta.cjs` (caixa 840 × 1176 na célula 1000 × 1400). Saída: `premium-tormenta-vaza.webp`.
// Uso: node tormenta-borda.cjs <borda> <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[4], "node_modules/sharp"));
const [BORDA, OUT] = [process.argv[2], process.argv[3]];
const CELL = { w: 1000, h: 1400 }, BOX = { x: 80, y: 112, w: 840, h: 1176 };
const [BX0, BY0, BX1, BY1] = [60, 75, 704, 965]; // caixa da carta na imagem da moldura
const RING_OUT = [58, 73, 706, 967], RING_IN = [125, 140, 640, 893]; // faixa de ferro: de fora e de dentro
const FUR_ROWS = 350; // peles e martelo só acima desta linha
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
const one = async (buf, w, h, fn) => (await fn(sharp(buf, { raw: { width: w, height: h, channels: 1 } })).extractChannel(0).raw().toBuffer());

(async () => {
  const { data, info } = await sharp(BORDA).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const lum = new Uint8Array(N), sat = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    lum[i] = mx; sat[i] = mx === 0 ? 0 : (mx - mn) / mx;
  }
  // 1) sólido: a faixa de ferro + as peles e o martelo (cinza, baixa saturação) acima da linha FUR_ROWS
  const solidRaw = Buffer.alloc(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const inRing = x >= RING_OUT[0] && x <= RING_OUT[2] && y >= RING_OUT[1] && y <= RING_OUT[3] && !(x > RING_IN[0] && x < RING_IN[2] && y > RING_IN[1] && y < RING_IN[3]);
    const furLike = y < FUR_ROWS && lum[i] > 22 && sat[i] < 0.42;
    solidRaw[i] = inRing || furLike ? 255 : 0;
  }
  // fecha os vãos escuros da pele e do relevo, sem engordar para fora do material
  const closed = await one(solidRaw, W, H, (s) => s.blur(7).threshold(110));
  const solidSoft = await one(closed, W, H, (s) => s.blur(1.1));

  // 2) luz sobre o resto, sem escurecer
  const px = Buffer.alloc(N * 4); // premultiplicado (para reduzir sem franja escura)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const edge = smooth(0, 24, x) * smooth(0, 24, W - 1 - x) * smooth(0, 24, y) * smooth(0, 24, H - 1 - y); // o que o Gemini corta na borda da imagem esmaece
    const s = (solidSoft[i] / 255) * edge;
    const aL = clamp((lum[i] - 14) / 186) * edge; // alfa da luz
    const lr = data[i * 3], lg = data[i * 3 + 1], lb = data[i * 3 + 2];
    // cor da luz desmultiplicada (cor / alfa, até 255); pré-multiplicada de volta vale a própria cor da arte
    const a = s + (1 - s) * aL;
    // mistura premultiplicada: sólido (cor original) por cima da luz
    px[i * 4] = Math.round(s * lr + (1 - s) * aL * Math.min(255, aL > 0 ? lr / aL : 0));
    px[i * 4 + 1] = Math.round(s * lg + (1 - s) * aL * Math.min(255, aL > 0 ? lg / aL : 0));
    px[i * 4 + 2] = Math.round(s * lb + (1 - s) * aL * Math.min(255, aL > 0 ? lb / aL : 0));
    px[i * 4 + 3] = Math.round(a * 255);
  }
  const sx = BOX.w / (BX1 - BX0), sy = BOX.h / (BY1 - BY0);
  const tw = Math.round(W * sx), th = Math.round(H * sy);
  const big = await sharp(px, { raw: { width: W, height: H, channels: 4 } }).resize(tw, th, { kernel: "lanczos3" }).raw().toBuffer();
  // volta ao alfa direto (desmultiplica)
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
    .webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(OUT, "premium-tormenta-vaza.webp"));
  console.log("ok", { sx: sx.toFixed(4), sy: sy.toFixed(4), left, top });
})().catch((e) => { console.error(e); process.exit(1); });
