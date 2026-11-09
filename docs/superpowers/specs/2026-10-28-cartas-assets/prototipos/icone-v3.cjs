// Ícone, terceira versão (2026-11-09): arte do dono no Gemini (cetim branco com veios de ouro, cristais com pepitas de ouro e moldura de ouro).
// Os arquivos vieram com o "quadriculado de transparência" desenhado dentro da imagem (JPG), então:
//  - fundo: recorte geométrico do cartão arredondado (sem precisar de transparência);
//  - render: máscara por segmentação (o que não é o quadriculado liso, só na região do aglomerado), cor original;
//  - moldura: refeita em SVG (barra de ouro, fio fino, brilho creme por fora), no estilo do composto do dono (`icone-v3-composto-dono.jpg`).
// Saem `premium-marfim.webp` (janela) e `premium-marfim-vaza.webp` (moldura + render, caixa 774 x 1000 com a carta nos 84% do meio).
// Uso: node icone-v3.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const RENDER = path.join(__dirname, "icone-v3-render-dono.jpg");
const FUNDO = path.join(__dirname, "icone-v3-fundo-dono.jpg");

// Cartão do fundo na imagem do dono (medido: o resto é o quadriculado).
const SRC_CARD = { x: 207, y: 232, w: 1376, h: 1962 };
const BW = 714, BH = 1000, OUT_W = 774;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SCALE = CW / SRC_CARD.w; // uniforme: o render não deforma
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const step = async (buf, w, h, fn) => fn(sharp(buf, { raw: { width: w, height: h, channels: 1 } })).toColourspace("b-w").raw().toBuffer();
const grow = (b, w, h, r) => step(b, w, h, (i) => i.blur(r).threshold(8));
const shrink = (b, w, h, r) => step(b, w, h, (i) => i.blur(r).threshold(247));

async function cutRender() {
  const { data, info } = await sharp(RENDER).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  const gray = Buffer.alloc(n), chroma = Buffer.alloc(n);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    gray[i] = Math.round((r + g + b) / 3);
    chroma[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  // O quadriculado desenhado é 100% neutro (croma 0); cristais e ouro têm algum croma. As partes neutras dos cristais ficam dentro do
  // contorno depois de fechar os buracos.
  const seed = Buffer.alloc(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    seed[i] = x > 880 && y > 200 && y < 1800 && chroma[i] >= 2 ? 255 : 0;
  }
  let m = await shrink(seed, W, H, 1.2); // tira ruído solto
  m = await grow(m, W, H, 2.5);
  m = await grow(m, W, H, 18);
  m = await shrink(m, W, H, 18);
  m = await shrink(m, W, H, 1.5);
  m = await step(m, W, H, (i) => i.blur(1.2));
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) { out[i * 4] = data[i * 3]; out[i * 4 + 1] = data[i * 3 + 1]; out[i * 4 + 2] = data[i * 3 + 2]; out[i * 4 + 3] = m[i]; }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

function frameSvg() {
  const rx = 54, f = (inset) => `x="${CX0 + inset}" y="${CY0 + inset}" width="${CW - 2 * inset}" height="${CH - 2 * inset}" rx="${Math.max(2, rx - inset)}" fill="none"`;
  const o = (grow) => `x="${CX0 - grow}" y="${CY0 - grow}" width="${CW + 2 * grow}" height="${CH + 2 * grow}" rx="${rx + grow}" fill="none"`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${BH}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e8b4"/><stop offset=".25" stop-color="#c9a24e"/><stop offset=".5" stop-color="#f3e0a0"/><stop offset=".75" stop-color="#b08a38"/><stop offset="1" stop-color="#e9d48f"/></linearGradient>
      <filter id="b1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="b2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.5"/></filter>
    </defs>
    <rect ${o(10)} stroke="#ffe9a6" stroke-opacity=".5" stroke-width="16" filter="url(#b1)"/>
    <rect ${o(7)} stroke="#fff3cf" stroke-opacity=".7" stroke-width="5" filter="url(#b2)"/>
    <rect ${o(6.5)} stroke="#fff6dc" stroke-width="3.2"/>
    <rect ${f(5)} stroke="url(#g)" stroke-width="10"/>
    <rect ${f(11.5)} stroke="#e2c777" stroke-opacity=".85" stroke-width="1.6"/>
    <rect ${f(13.5)} stroke="#000" stroke-opacity=".16" stroke-width="3"/>
  </svg>`);
}

(async () => {
  // Fundo: a janela da carta (1,7% da largura e 1,21% da altura para dentro).
  const inX = SRC_CARD.w * 0.017, inY = SRC_CARD.h * 0.0121;
  await sharp(FUNDO)
    .extract({ left: Math.round(SRC_CARD.x + inX), top: Math.round(SRC_CARD.y + inY), width: Math.round(SRC_CARD.w - 2 * inX), height: Math.round(SRC_CARD.h - 2 * inY) })
    .resize(600, 860, { fit: "fill" })
    .webp({ quality: 92 }).toFile(`${OUT}/premium-marfim.webp`);

  const render = await cutRender();
  const rw = Math.round(1792 * SCALE), rh = Math.round(2400 * SCALE);
  const piece = await sharp(render).resize(rw, rh).png().toBuffer();
  const left = Math.round(CX0 - SRC_CARD.x * SCALE), top = Math.round(CY0 - SRC_CARD.y * SCALE);
  // o render é maior que a caixa: recorta o que sobra e põe por cima da moldura
  const cropL = Math.max(0, -left), cropT = Math.max(0, -top);
  const cropW = Math.min(rw - cropL, OUT_W - Math.max(0, left)), cropH = Math.min(rh - cropT, BH - Math.max(0, top));
  const cropped = await sharp(piece).extract({ left: cropL, top: cropT, width: cropW, height: cropH }).png().toBuffer();
  const frame = await sharp(frameSvg()).png().toBuffer();
  await sharp(frame).composite([{ input: cropped, left: Math.max(0, left), top: Math.max(0, top) }]).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/premium-marfim-vaza.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
