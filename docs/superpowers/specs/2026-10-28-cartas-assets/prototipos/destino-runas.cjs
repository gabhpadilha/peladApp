// Peças flutuantes da carta Destino (2026-11-05, pedido do dono do app: "uma runa flutuando em volta da carta, com alguma animação"): três artes do Gemini sobre preto
// (círculo arcano, runa de pedra, cacos de esmeralda) viram WebP com transparência: alfa pelo brilho (com o miolo fechado nas peças sólidas, para o corpo escuro da pedra
// não ficar "fantasma"; o círculo não é fechado, o furo do meio é transparente). Saem `destino-circulo.webp`, `destino-runa.webp` e `destino-caco-a|b|c.webp`.
// Uso: node destino-runas.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

async function cutout(srcFile, box, size, name, { fill }) {
  const base = sharp(path.join(__dirname, srcFile)).removeAlpha();
  const { data, info } = await (box ? base.extract(box) : base).resize(size, size, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const lum = new Uint8Array(N); for (let i = 0; i < N; i++) lum[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  let solid = new Uint8Array(N);
  if (fill) {
    const m = Buffer.alloc(N); for (let i = 0; i < N; i++) m[i] = lum[i] > 38 ? 255 : 0;
    const closed = await sharp(m, { raw: { width: W, height: H, channels: 1 } }).blur(5).threshold(110).extractChannel(0).raw().toBuffer();
    const hole = new Uint8Array(N), st = [];
    const push = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (hole[i] || closed[i] > 127) return; hole[i] = 1; st.push(i); };
    for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); } for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
    while (st.length) { const i = st.pop(), x = i % W, y = (i / W) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
    for (let i = 0; i < N; i++) solid[i] = hole[i] ? 0 : 255;
  }
  const solidSoft = fill ? await sharp(Buffer.from(solid), { raw: { width: W, height: H, channels: 1 } }).blur(1.2).extractChannel(0).raw().toBuffer() : null;
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const glow = smooth(12, 80, lum[i]);
    const x = i % W, y = (i / W) | 0, edge = box ? smooth(14, 34, x) * smooth(14, 34, W - 1 - x) * smooth(14, 34, y) * smooth(14, 34, H - 1 - y) : 1; // pedaços de cacos vizinhos na borda do recorte somem
    const a = Math.max(glow, solidSoft ? solidSoft[i] / 255 : 0) * edge;
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = Math.round(a * 255);
  }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 92 }).toFile(path.join(OUT, name));
}

(async () => {
  await cutout("destino-circulo-arcano-dono.jpg", null, 640, "destino-circulo.webp", { fill: false });
  await cutout("destino-runa-pedra-dono.jpg", null, 520, "destino-runa.webp", { fill: true });
  const shards = [["a", { left: 495, top: 372, width: 520, height: 790 }], ["b", { left: 945, top: 262, width: 365, height: 600 }], ["c", { left: 2005, top: 530, width: 400, height: 520 }]];
  for (const [k, box] of shards) await cutout("destino-cacos-esmeralda-dono.jpg", box, 300, `destino-caco-${k}.webp`, { fill: true });
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
