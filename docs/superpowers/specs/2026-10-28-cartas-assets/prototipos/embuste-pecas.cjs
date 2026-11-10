// Peças flutuantes do Embuste (2026-11-09): a folha do dono (`embuste-pecas-dono.jpg`, Gemini, sobre preto) vira WebP com transparência.
//   peças sólidas (runas de pedra, rochas, adaga): miolo fechado, opacas, mais a luz em volta;
//   fumaça: só luz, com a cor desmultiplicada (cor / alfa), que soma luz sem deixar borda escura (mesmo método da moldura, `tormenta-borda.cjs`).
// Saem `embuste-fumaca.webp`, `embuste-runa.webp`, `embuste-pedra-a|b.webp` e `embuste-adaga.webp`.
// Uso: node embuste-pecas.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

async function cutout(box, size, name, { fill, blank }) {
  // `blank`: retângulo da folha (x0, y0, x1, y1) pintado de preto antes do recorte (peça vizinha que invade a caixa)
  let src = sharp(path.join(__dirname, "embuste-pecas-dono.jpg")).removeAlpha();
  if (blank) {
    const hole = await sharp({ create: { width: blank[2] - blank[0], height: blank[3] - blank[1], channels: 3, background: "#000" } }).png().toBuffer();
    src = sharp(await src.composite([{ input: hole, left: blank[0], top: blank[1] }]).png().toBuffer());
  }
  const { data, info } = await src.extract(box).resize(size, size, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const lum = new Uint8Array(N); for (let i = 0; i < N; i++) lum[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  let solidSoft = null;
  if (fill) {
    const m = Buffer.alloc(N); for (let i = 0; i < N; i++) m[i] = lum[i] > 38 ? 255 : 0;
    const closed = await sharp(m, { raw: { width: W, height: H, channels: 1 } }).blur(5).threshold(110).extractChannel(0).raw().toBuffer();
    const hole = new Uint8Array(N), st = [];
    const push = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (hole[i] || closed[i] > 127) return; hole[i] = 1; st.push(i); };
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); } for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
    while (st.length) { const i = st.pop(), x = i % W, y = (i / W) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
    const solid = Buffer.alloc(N); for (let i = 0; i < N; i++) solid[i] = hole[i] ? 0 : 255;
    solidSoft = await sharp(solid, { raw: { width: W, height: H, channels: 1 } }).blur(1.2).extractChannel(0).raw().toBuffer();
  }
  const px = Buffer.alloc(N * 4); // premultiplicado
  for (let i = 0; i < N; i++) {
    const x = i % W, y = (i / W) | 0, edge = smooth(10, 30, x) * smooth(10, 30, W - 1 - x) * smooth(10, 30, y) * smooth(10, 30, H - 1 - y);
    const s = solidSoft ? (solidSoft[i] / 255) * edge : 0, aL = clamp((lum[i] - 14) / 186) * edge, a = s + (1 - s) * aL;
    for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.round(s * data[i * 3 + c] + (1 - s) * aL * Math.min(255, aL > 0 ? data[i * 3 + c] / aL : 0));
    px[i * 4 + 3] = Math.round(a * 255);
  }
  for (let i = 0; i < N; i++) { const a = px[i * 4 + 3] / 255; if (a > 0.003) for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.min(255, Math.round(px[i * 4 + c] / a)); }
  await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 92 }).toFile(path.join(OUT, name));
}

(async () => {
  // caixas na folha de 2576 × 1438 (medidas por componentes conectados, com margem de 25 px)
  await cutout({ left: 64, top: 112, width: 1108, height: 1260 }, 760, "embuste-fumaca.webp", { fill: false, blank: [900, 40, 1345, 500] });
  await cutout({ left: 940, top: 80, width: 368, height: 380 }, 520, "embuste-runa.webp", { fill: true });
  await cutout({ left: 1528, top: 88, width: 380, height: 380 }, 420, "embuste-pedra-a.webp", { fill: true });
  await cutout({ left: 2076, top: 100, width: 396, height: 364 }, 420, "embuste-pedra-b.webp", { fill: true });
  await cutout({ left: 2160, top: 824, width: 304, height: 508 }, 420, "embuste-adaga.webp", { fill: true });
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
