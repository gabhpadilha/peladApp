// Ícone, quarta versão (2026-11-09): as três peças do Gemini sobre preto puro, todas 1792 x 2400 com a carta no mesmo lugar
// (fundo = cetim branco com veios de ouro; borda = barra de ouro com fio de luz branca por fora; render = cristais e pepitas de ouro).
// Mesma receita do Melhor Jogador e da Lenda: fundo -> borda -> render, a borda por cima do conteúdo.
// A caixa da carta é o lado de FORA do ouro da borda (x 190 a 1606, y 184 a 2174 da arte; 5:7) levado para os 84% do meio da caixa 714 x 1000.
// O cartão do fundo veio um pouco menor e mais baixo que a abertura da borda (deixava uma faixa preta no alto): ele é esticado ~2% até
// cobrir a caixa toda, por baixo da borda (`artInset` na roupa). O render veio grande demais (68% da carta): é reduzido a 70% e posto
// no meio da lateral direita, meio dentro e meio fora, abaixo do selo do OVR.
// Saem `premium-marfim.webp` (fundo) e `premium-marfim-vaza.webp` (borda + render, 774 x 1000: o aglomerado passa da caixa pela direita).
// Uso: node icone-v4.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const F = (n) => path.join(__dirname, `icone-v4-${n}-dono.jpg`);
const SRC = { w: 1792, h: 2400, card: { x: 190, y: 184, w: 1416, h: 1990 }, fundo: { x: 206, y: 232, w: 1377, h: 1956 } };
const BW = 714, BH = 1000, OUT_W = 790;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / SRC.card.w, SY = CH / SRC.card.h;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

const step = (buf, w, h, fn) => fn(sharp(buf, { raw: { width: w, height: h, channels: 1 } })).toColourspace("b-w").raw().toBuffer();
const grow = (b, w, h, r) => step(b, w, h, (i) => i.blur(r).threshold(8));
const shrink = (b, w, h, r) => step(b, w, h, (i) => i.blur(r).threshold(247));

/** Luz sobre preto: o alfa sai do brilho e a cor volta sem o preto misturado (o brilho de fora da borda fica um véu dourado-claro). */
async function cutFrame() {
  const { data, info } = await sharp(F("borda")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height, out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], mx = Math.max(r, g, b);
    const a = smooth(6, 120, mx);
    out[i * 4 + 3] = Math.round(a * 255);
    const k = a > 0.02 ? Math.min(255 / Math.max(mx, 1), 1 / a) : 1;
    out[i * 4] = Math.min(255, r * k); out[i * 4 + 1] = Math.min(255, g * k); out[i * 4 + 2] = Math.min(255, b * k);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Render: corpo opaco (buracos escuros entre as peças fechados) + brilho fraco em volta como véu. */
async function cutRender() {
  const { data, info } = await sharp(F("render")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  const mx = Buffer.alloc(n);
  for (let i = 0; i < n; i++) mx[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const seed = Buffer.alloc(n);
  for (let i = 0; i < n; i++) seed[i] = mx[i] > 48 ? 255 : 0;
  let m = await shrink(seed, W, H, 1.2);
  m = await grow(m, W, H, 2.5);
  m = await grow(m, W, H, 14);
  m = await shrink(m, W, H, 14);
  m = await shrink(m, W, H, 1.4);
  m = await step(m, W, H, (i) => i.blur(1));
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const ramp = smooth(12, 70, mx[i]);
    const a = Math.max(ramp, m[i] / 255);
    out[i * 4 + 3] = Math.round(a * 255);
    const k = m[i] > 128 || ramp >= 1 ? 1 : 1 / Math.max(a, 0.05);
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, Math.round(data[i * 3 + c] * k));
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

(async () => {
  // Fundo: o cartão inteiro, esticado para a caixa da carta (a borda esconde as beiradas).
  const fu = SRC.fundo;
  await sharp(F("fundo")).extract({ left: fu.x, top: fu.y, width: fu.w, height: fu.h }).resize(600, 850, { fit: "fill" }).webp({ quality: 92 }).toFile(`${OUT}/premium-marfim.webp`);

  const left = Math.round(CX0 - SRC.card.x * SX), top = Math.round(CY0 - SRC.card.y * SY);
  const place = async (png, srcW, srcH) => {
    const rw = Math.round(srcW * SX), rh = Math.round(srcH * SY);
    const piece = await sharp(png).resize(rw, rh, { kernel: "lanczos3" }).png().toBuffer();
    const cl = Math.max(0, -left), ct = Math.max(0, -top);
    const w = Math.min(rw - cl, OUT_W - Math.max(0, left)), h = Math.min(rh - ct, BH - Math.max(0, top));
    return { input: await sharp(piece).extract({ left: cl, top: ct, width: w, height: h }).png().toBuffer(), left: Math.max(0, left), top: Math.max(0, top) };
  };
  // Render reduzido e reposicionado numa tela 2000 x 2400 da arte (cabe o que passa da borda direita).
  const RS = 0.7, RC = [1320, 870], RT = [1570, 1180];
  const raw = await cutRender();
  const rw0 = Math.round(SRC.w * RS), rh0 = Math.round(SRC.h * RS);
  const small = await sharp(raw).resize(rw0, rh0, { kernel: "lanczos3" }).png().toBuffer();
  const wide = await sharp({ create: { width: 2000, height: SRC.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: small, left: Math.round(RT[0] - RC[0] * RS), top: Math.round(RT[1] - RC[1] * RS) }]).png().toBuffer();
  const frame = await place(await cutFrame(), SRC.w, SRC.h);
  const render = await place(wide, 2000, SRC.h);
  await sharp({ create: { width: OUT_W, height: BH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([frame, render]).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/premium-marfim-vaza.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
