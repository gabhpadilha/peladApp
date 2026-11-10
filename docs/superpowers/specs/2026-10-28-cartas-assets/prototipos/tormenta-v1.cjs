// Tormenta (lendária de novembro de 2026, tema Toró; 2026-11-10): as três peças do Gemini do dono, todas 1696 x 2528 com a carta no mesmo lugar
// (fundo = nuvens de tempestade em relevo com cristais e gotas de vidro; borda = ferro e bronze com raios de plasma, cristais nos cantos e uma coroa
// de pára-raios no topo; render = aglomerado de cristais de tempestade com pára-raios de bronze e arcos elétricos). Mesma receita do Ícone v4 e da Lenda:
// fundo -> borda -> render, a borda por cima do conteúdo.
// A caixa da carta é o lado de FORA da moldura (x 166 a 1531, y 338 a 2315 da arte), levada para os 84% do meio da caixa 714 x 1000. O cartão do fundo veio
// uns 5% mais baixo que a moldura: é esticado até cobrir a caixa toda, por baixo da borda (`artInset` na roupa). O render veio quase todo DENTRO da carta
// (só 84 px passavam da borda): aqui ele é reduzido a 72% e posto com o centro na borda direita (meio dentro, meio fora), ATRÁS do jogador por dentro
// (no fundo) e POR CIMA da borda só do lado de fora (`-vaza`). A coroa do topo passa da folga de 8% da caixa: o alto das faíscas esmaece.
// Saem `premium-tormenta.webp` (fundo) e `premium-tormenta-vaza.webp` (borda + render, 800 x 1000).
// Uso: node tormenta-v1.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const F = (n) => path.join(__dirname, `tormenta-${n}-dono.jpg`);
const SRC = { w: 1696, h: 2528, card: { x: 166, y: 338, w: 1366, h: 1978 }, fundo: { x: 164, y: 340, w: 1368, h: 1884 } };
const BW = 714, BH = 1000, OUT_W = 800, WIDE = 2000;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / SRC.card.w, SY = CH / SRC.card.h;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

const step = (buf, w, h, fn) => fn(sharp(buf, { raw: { width: w, height: h, channels: 1 } })).toColourspace("b-w").raw().toBuffer();
const grow = (b, w, h, r) => step(b, w, h, (i) => i.blur(r).threshold(8));
const shrink = (b, w, h, r) => step(b, w, h, (i) => i.blur(r).threshold(247));

/** Luz sobre preto: o alfa sai do brilho e a cor volta sem o preto misturado (o brilho de fora da borda fica um véu dourado-claro). */
async function cutFrame(renderAlpha) {
  const { data, info } = await sharp(F("borda")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height, out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], mx = Math.max(r, g, b);
    let a = smooth(6, 120, mx);
    // Onde o render está, a moldura some por inteiro (o fio de bronze aparecia através dos cristais translúcidos como um risco): o render fica por cima da borda, sem nada entre ele e o fundo.
    if (renderAlpha) { const x = i % info.width, y = (i / info.width) | 0; a *= 1 - smooth(0.01, 0.12, renderAlpha[(y * WIDE + x) * 4 + 3] / 255); }
    out[i * 4 + 3] = Math.round(a * 255);
    const k = a > 0.02 ? Math.min(255 / Math.max(mx, 1), 1 / a) : 1;
    out[i * 4] = Math.min(255, r * k); out[i * 4 + 1] = Math.min(255, g * k); out[i * 4 + 2] = Math.min(255, b * k);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/**
 * Render (refeito em 2026-11-10: a primeira versão deixava uma mancha preta em volta dos raios). O fundo do render é preto puro, então ele é "luz sobre preto":
 *  - os raios e o brilho são só LUZ: alfa pelo brilho e a cor sem o preto misturado (despremultiplicada), como a moldura. Assim o preto nunca vira pixel opaco;
 *  - o corpo sólido (cristais e fios de bronze) é opaco, mas só o que é GROSSO: uma abertura morfológica tira os raios finos da máscara do corpo;
 *  - os buracos escuros que ficam fechados por dentro do corpo (o miolo escuro dos cristais) são preenchidos; os vãos abertos para fora (entre pontas, entre raios) não.
 */
async function cutRender() {
  const { data, info } = await sharp(F("render")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  const mx = Buffer.alloc(n);
  for (let i = 0; i < n; i++) mx[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  // O brilho dos raios é um azul profundo (mx 60 a 100) colado no cristal: por brilho dá para separar o CORPO (faces claras, mx > 150) do brilho e dos raios (finos).
  // Com limiar mais baixo o brilho se fundia ao cristal e o vão escuro entre os raios e o cristal virava "buraco fechado", preenchido de preto (a mancha).
  const solid = Buffer.alloc(n);
  for (let i = 0; i < n; i++) solid[i] = mx[i] > 150 ? 255 : 0;
  // só o grosso: erode e volta; o corpo nunca passa do que já era claro (interseção com o sólido), então não ganha contorno escuro
  let body = await shrink(solid, W, H, 5);
  body = await grow(body, W, H, 5);
  for (let i = 0; i < n; i++) if (!solid[i]) body[i] = 0;
  // Sem preencher buracos: o preenchimento "fechado por dentro" pegava o vão escuro entre os raios e o cristal (os raios formam um laço em volta do cristal) e o pintava de preto opaco.
  // As faces escuras dos cristais ficam parcialmente transparentes pelo brilho, o que lê como vidro.
  const filled = body;
  const mask = await step(filled, W, H, (im) => im.blur(1.1));
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const ramp = smooth(10, 100, mx[i]);
    // o render vem com os cristais encostando na borda direita da imagem, cortados retos: esmaece nos últimos 90 px
    const x = i % W, edge = smooth(0, 90, W - 1 - x) * smooth(0, 40, x);
    const m = mask[i] / 255;
    // O bronze (pára-raios e fios) é quente (r > b) e tem lados na sombra com brilho baixo: pelo brilho ficava meio transparente, "fantasma". Pelo tom ele entra opaco.
    const warm = Math.min(1, Math.max(0, (data[i * 3] - data[i * 3 + 2]) / 40)) * smooth(20, 70, mx[i]);
    const a = Math.max(ramp, m, warm);
    out[i * 4 + 3] = Math.round(a * edge * 255);
    // corpo: cor como está. Luz (raios e brilho): a cor vai para o brilho máximo (maior canal = 255) e só o alfa diz o quanto dela entra. O brilho do render é um azul
    // fundo (0, 40, 130): mesmo despremultiplicado, em meia transparência ele escurecia as nuvens como uma mancha. Com a cor no máximo, o meio-transparente só ACENDE o que está atrás.
    const k = 1 + (255 / Math.max(mx[i], 1) - 1) * (1 - a); // opaco: cor como está; meio-transparente: cor no brilho máximo
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, Math.round(data[i * 3 + c] * k));
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

(async () => {
  const left = Math.round(CX0 - SRC.card.x * SX), top = Math.round(CY0 - SRC.card.y * SY);
  const place = async (png, srcW, srcH) => {
    const rw = Math.round(srcW * SX), rh = Math.round(srcH * SY);
    const piece = await sharp(png).resize(rw, rh, { kernel: "lanczos3" }).png().toBuffer();
    const cl = Math.max(0, -left), ct = Math.max(0, -top);
    const w = Math.min(rw - cl, OUT_W - Math.max(0, left)), h = Math.min(rh - ct, BH - Math.max(0, top));
    return { input: await sharp(piece).extract({ left: cl, top: ct, width: w, height: h }).png().toBuffer(), left: Math.max(0, left), top: Math.max(0, top) };
  };

  // Render maior e reposicionado numa tela 2000 x 2400 da arte (cabe o que passa da borda direita).
  const RS = 0.72, RC = [1200, 1323], RT = [1531, 1323];
  const small = await sharp(await cutRender()).resize(Math.round(SRC.w * RS), Math.round(SRC.h * RS), { kernel: "lanczos3" }).png().toBuffer();
  const wide = await sharp({ create: { width: WIDE, height: SRC.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: small, left: Math.round(RT[0] - RC[0] * RS), top: Math.round(RT[1] - RC[1] * RS) }]).png().toBuffer();

  // O render fica ATRÁS do jogador por dentro da carta (vai no fundo) e POR CIMA da borda só do lado de fora (camada `-vaza`):
  // a divisa é a janela do conteúdo (1,43% da carta para dentro da borda), com uns 16 px de rampa, e os dois lados têm os mesmos pixels.
  // A divisa fica um pouco antes do lado de dentro do ouro (x 1573 da arte): se ela cai depois, o fio de dentro da borda passa por cima
  // dos cristais como uma listra (o dono viu).
  const SPLIT = 1470;
  const raw = await sharp(wide).raw().toBuffer();
  const outer = Buffer.from(raw);
  for (let y = 0; y < SRC.h; y++) for (let x = 0; x < WIDE; x++) { const o = (y * WIDE + x) * 4 + 3; outer[o] = Math.round(raw[o] * smooth(SPLIT - 12, SPLIT, x)); }
  const outerPng = await sharp(outer, { raw: { width: WIDE, height: SRC.h, channels: 4 } }).png().toBuffer();

  // Fundo: o cartão do fundo esticado até a caixa da carta + o render por cima, recortado na folga de `artInset` (1,43% e 1,02%).
  const fu = SRC.fundo, c = SRC.card;
  const stretched = await sharp(F("fundo")).extract({ left: fu.x, top: fu.y, width: fu.w, height: fu.h }).resize(c.w, c.h, { fit: "fill" }).png().toBuffer();
  const renderOnCard = await sharp(wide).extract({ left: c.x, top: c.y, width: Math.min(c.w, WIDE - c.x), height: c.h }).png().toBuffer();
  const card = await sharp(stretched).composite([{ input: renderOnCard, left: 0, top: 0 }]).png().toBuffer();
  const ix = Math.round(c.w * 0.0143), iy = Math.round(c.h * 0.0102);
  await sharp(card).extract({ left: ix, top: iy, width: c.w - 2 * ix, height: c.h - 2 * iy }).resize(600, 850, { fit: "fill" }).webp({ quality: 92 }).toFile(`${OUT}/premium-tormenta.webp`);

  const frame = await place(await cutFrame(await sharp(wide).raw().toBuffer()), SRC.w, SRC.h);
  const render = await place(outerPng, WIDE, SRC.h);
  const layer = await sharp({ create: { width: OUT_W, height: BH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([frame, render]).raw().toBuffer();
  // A coroa passa da folga de cima da caixa: o alto das faíscas esmaece nos primeiros 26 px em vez de sair cortado reto.
  for (let y = 0; y < 26; y++) for (let x = 0; x < OUT_W; x++) { const o = (y * OUT_W + x) * 4 + 3; layer[o] = Math.round(layer[o] * smooth(0, 26, y)); }
  await sharp(layer, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/premium-tormenta-vaza.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
