// Peças flutuantes da Tormenta (lendária de novembro, 2026-11-10): três artes do Gemini sobre preto (anel de raio, gotas de vidro e cacos de cristal) viram WebP com
// transparência: alfa pelo brilho, com o miolo fechado nas peças sólidas (as gotas e os cacos de vidro escuro ficam opacos, sem "fantasma"); o anel não é fechado, o furo do meio
// fica transparente. Saem `tormenta-anel.webp`, `tormenta-gota-a|b|c|d.webp` e `tormenta-caco-a|b|c.webp`. Mesma receita de `destino-runas.cjs`.
// Uso: node tormenta-flutuantes.cjs <pasta de saída> <raiz do repo>
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
    const body = solidSoft ? solidSoft[i] / 255 : 0;
    const a = Math.max(glow, body) * edge;
    // Luz sobre preto: fora do corpo sólido a cor é despremultiplicada (sem o preto do fundo misturado), senão o meio-transparente vira uma mancha escura por cima das nuvens.
    const k = body >= 0.98 ? 1 : 1 / Math.max(glow, body, 0.04);
    rgba[i * 4] = Math.min(255, data[i * 3] * k); rgba[i * 4 + 1] = Math.min(255, data[i * 3 + 1] * k); rgba[i * 4 + 2] = Math.min(255, data[i * 3 + 2] * k); rgba[i * 4 + 3] = Math.round(a * 255);
  }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88, alphaQuality: 92 }).toFile(path.join(OUT, name));
}

const pad = (b, n = 90) => ({ left: Math.max(0, b.left - n), top: Math.max(0, b.top - n), width: Math.min(2048 - Math.max(0, b.left - n), b.width + 2 * n), height: Math.min(2048 - Math.max(0, b.top - n), b.height + 2 * n) });
(async () => {
  await cutout("tormenta-anel-dono.jpg", null, 640, "tormenta-anel.webp", { fill: false });
  const drops = [["a", { left: 220, top: 132, width: 684, height: 1076 }], ["b", { left: 1332, top: 132, width: 388, height: 604 }], ["c", { left: 1176, top: 848, width: 696, height: 1080 }], ["d", { left: 372, top: 1296, width: 388, height: 600 }]];
  for (const [k, box] of drops) await cutout("tormenta-gotas-dono.jpg", pad(box, 90), 300, `tormenta-gota-${k}.webp`, { fill: false });
  const shards = [["a", { left: 228, top: 238, width: 763, height: 1416 }, 110], ["b", { left: 1177, top: 201, width: 646, height: 1060 }, 70], ["c", { left: 1102, top: 1166, width: 403, height: 626 }, 60]];
  for (const [k, box, margin] of shards) await cutout("tormenta-cacos-dono.jpg", pad(box, margin), 300, `tormenta-caco-${k}.webp`, { fill: true });
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
