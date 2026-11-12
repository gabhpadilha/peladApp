// Peças flutuantes da carta Tormenta (2026-11-09): a folha de peças do dono (`tormenta-pecas-dono.jpg`, Gemini, sobre preto) vira WebP com transparência
// pelo mesmo método do `destino-runas.cjs`: alfa pelo brilho, com o miolo fechado nas peças sólidas (runa de pedra, rochas) para o corpo escuro não ficar "fantasma".
// Saem `tormenta-runa.webp`, `tormenta-pedra-a|b.webp`, `tormenta-raio-a|b|c.webp` e, desde 2026-11-12 (pedido do dono do app, para a Tormenta ter
// uma peça girando atrás como a Destino e o Embuste), `tormenta-martelo.webp` e `tormenta-faiscas.webp` (anel de faíscas montado com o recorte das faíscas).
// Uso: node tormenta-pecas.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

async function cutout(srcFile, box, size, name, { fill }) {
  const base = sharp(path.join(__dirname, srcFile)).removeAlpha();
  const { data, info } = await base.extract(box).resize(size, size, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const lum = new Uint8Array(N); for (let i = 0; i < N; i++) lum[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const solid = new Uint8Array(N);
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
    const glow = fill ? smooth(12, 80, lum[i]) : smooth(30, 125, lum[i]); // raios: o halo azul-escuro fica de fora
    const x = i % W, y = (i / W) | 0;
    const edge = smooth(10, 30, x) * smooth(10, 30, W - 1 - x) * smooth(10, 30, y) * smooth(10, 30, H - 1 - y); // vizinhos na borda do recorte somem
    const a = Math.max(glow, solidSoft ? solidSoft[i] / 255 : 0) * edge;
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = Math.round(a * 255);
  }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 92 }).toFile(path.join(OUT, name));
}

(async () => {
  const SRC = "tormenta-pecas-dono.jpg";
  const pieces = [
    ["tormenta-runa.webp", { left: 1075, top: 80, width: 340, height: 350 }, 520, true],
    ["tormenta-pedra-a.webp", { left: 1530, top: 75, width: 380, height: 365 }, 420, true],
    ["tormenta-pedra-b.webp", { left: 535, top: 710, width: 345, height: 340 }, 420, true],
    ["tormenta-raio-a.webp", { left: 120, top: 140, width: 190, height: 460 }, 360, false],
    ["tormenta-raio-b.webp", { left: 330, top: 45, width: 240, height: 615 }, 360, false],
    ["tormenta-raio-c.webp", { left: 480, top: 235, width: 310, height: 405 }, 360, false],
    ["tormenta-martelo.webp", { left: 1490, top: 570, width: 440, height: 480 }, 460, true],
    ["tormenta-faiscas-peca.webp", { left: 1000, top: 600, width: 400, height: 410 }, 400, false],
  ];
  for (const [name, box, size, fill] of pieces) await cutout(SRC, box, size, name, { fill });
  // anel de faíscas: o recorte repetido em volta de um círculo, girado a cada cópia (gira atrás da carta, só aparece em volta dela)
  const peca = path.join(OUT, "tormenta-faiscas-peca.webp");
  const SIZE = 1000, R = 420, COPIES = 7, PIECE = 300;
  const layers = [];
  for (let k = 0; k < COPIES; k++) {
    const ang = (k / COPIES) * 2 * Math.PI;
    const img = await sharp(peca).resize(PIECE, PIECE, { fit: "inside" }).rotate((k * 360) / COPIES + 20, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const meta = await sharp(img).metadata();
    const left = Math.round(SIZE / 2 + R * Math.cos(ang) - meta.width / 2), top = Math.round(SIZE / 2 + R * Math.sin(ang) - meta.height / 2);
    const cl = Math.max(0, -left), ct = Math.max(0, -top);
    const cw = Math.min(meta.width - cl, SIZE - Math.max(0, left)), ch = Math.min(meta.height - ct, SIZE - Math.max(0, top));
    layers.push({ input: await sharp(img).extract({ left: cl, top: ct, width: cw, height: ch }).png().toBuffer(), left: Math.max(0, left), top: Math.max(0, top) });
  }
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers)
    .webp({ quality: 85, alphaQuality: 90 }).toFile(path.join(OUT, "tormenta-faiscas.webp"));
  require("fs").unlinkSync(peca);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
