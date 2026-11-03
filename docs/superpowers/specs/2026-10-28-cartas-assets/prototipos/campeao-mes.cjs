// Campeão do Mês (2026-11-02): `campeao-mes-dono.jpg` (1342 × 2000, arte do Gemini do dono do app: tempestade
// azul e laranja num cartão com fio de ouro fino, tubo de neon azul por fora (contínuo e de uma cor só: a
// arte veio com uma emenda e duas cores, arrumadas à mão), louro de platina no centro do topo e um aglomerado
// de cristais com nuvem e raios que passa por cima da moldura pela direita), sobre preto.
// Mesmo caminho da Ícone (`premium-icone.cjs`), mas com a janela "ring": o conteúdo vai até o lado de dentro do
// fio de ouro (o lado de dentro do ouro é um retângulo 5:7 quase exato). Saem `campeao-mes.webp` (fundo, na
// janela da carta) e `campeao-mes-vaza.webp` (neon, ouro, louro e cristais por fora, mais larga só para a
// direita: `overflowWidth` 774/714 na roupa). Mais duas camadas só com os raios (`campeao-mes-raios-dentro.webp`, atrás do
// jogador, e `campeao-mes-raios.webp`, por cima da moldura), que acendem forte e esmaecem devagar (`cc-thunder-glow`).
// Uso: node campeao-mes.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "campeao-mes-dono.jpg");

// Caixa da carta = o lado de DENTRO do fio de ouro (medido: x 177 a 1165, y 309 a 1695) aberto 0,9% da largura e 0,65% da altura
// (as folgas da janela "ring"); o ouro fino e o neon ficam por fora, na sobra.
const EDGE = { left: 168, right: 1174, top: 300, bottom: 1704 };
const RADIUS = 100; // raio do canto da caixa (px da arte; o de dentro do ouro mede ~87)
const BG = 12; // o preto da arte não é puro

const BW = 714, BH = 1000, OUT_W = 774;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
// Janela "ring" (onde fica a foto): 0,9% da largura e 0,65% da altura para dentro, canto de ~8,6% da largura (o raio de dentro do ouro).
// Por dentro da carta, a camada de fora cobre só o que está fora da janela (o ouro, o neon e os cantos).
const WIN = { l: CX0 + CW * 0.009, t: CY0 + CH * 0.0065, r: CX0 + CW * 0.991, b: CY0 + CH * 0.9935 };
const WIN_RADIUS = CW * 0.0865;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
const mapPoint = (x, y) => [EDGE.left + (x - CX0) / SX, EDGE.top + (y - CY0) / SY];
/** Distância à janela da carta (negativa dentro dela). */
function windowDistance(x, y) {
  const cx = clamp(x, WIN.l + WIN_RADIUS, WIN.r - WIN_RADIUS), cy = clamp(y, WIN.t + WIN_RADIUS, WIN.b - WIN_RADIUS);
  return Math.hypot(x - cx, y - cy) - WIN_RADIUS;
}
function depth(x, y) {
  const lx = x - CX0, ly = y - CY0;
  if (lx <= 0 || ly <= 0 || lx >= CW || ly >= CH) return -1;
  const cx = Math.min(Math.max(lx, CORNER), CW - CORNER), cy = Math.min(Math.max(ly, CORNER), CH - CORNER);
  const d = Math.hypot(lx - cx, ly - cy);
  return d > CORNER ? -1 : d > 0 ? CORNER - d : Math.min(lx, ly, CW - lx, CH - ly);
}

/** Desfoque por caixa (soma corrente), `r` px, `passes` vezes. */
function boxBlur(a, W, H, r, passes) {
  let src = a;
  for (let p = 0; p < passes; p++) {
    const tmp = new Float32Array(a.length), dst = new Float32Array(a.length);
    for (let y = 0; y < H; y++) { let sum = 0, cnt = 0; for (let x = -r; x <= r; x++) if (x >= 0 && x < W) { sum += src[y * W + x]; cnt++; } for (let x = 0; x < W; x++) { tmp[y * W + x] = sum / cnt; const add = x + r + 1, rem = x - r; if (add < W) { sum += src[y * W + add]; cnt++; } if (rem >= 0) { sum -= src[y * W + rem]; cnt--; } } }
    for (let x = 0; x < W; x++) { let sum = 0, cnt = 0; for (let y = -r; y <= r; y++) if (y >= 0 && y < H) { sum += tmp[y * W + x]; cnt++; } for (let y = 0; y < H; y++) { dst[y * W + x] = sum / cnt; const add = y + r + 1, rem = y - r; if (add < H) { sum += tmp[add * W + x]; cnt++; } if (rem >= 0) { sum -= tmp[rem * W + x]; cnt--; } } }
    src = dst;
  }
  return src;
}
(async () => {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const at = (x, y, k) => data[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 3 + k];
  const sample = (fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    return [0, 1, 2].map((k) => at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  };

  // Fundo: a janela da carta.
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * 0.009, top: EDGE.top + h * 0.0065, width: w * 0.982, height: h * 0.987 };
  const FW = 600, FH = 860;
  const bg = Buffer.alloc(FW * FH * 3);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const px = sample(win.left + ((x + 0.5) / FW) * win.width, win.top + ((y + 0.5) / FH) * win.height);
      const o = (y * FW + x) * 3;
      bg[o] = clamp(px[0], 0, 255); bg[o + 1] = clamp(px[1], 0, 255); bg[o + 2] = clamp(px[2], 0, 255);
    }
  }
  await sharp(bg, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/campeao-mes.webp`);

  // Tubo, moldura e cristais: tudo por fora da carta (o preto da arte vira transparente) e uma beirada por dentro.
  const vaza = Buffer.alloc(OUT_W * BH * 4);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const d = depth(x, y);
      const wd = d < 0 ? 0 : windowDistance(x + 0.5, y + 0.5);
      if (d >= 0 && wd < -3) continue; // dentro da janela: é o fundo (e a foto) que aparece
      const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
      if (sx >= W - 2 || sy >= H - 2 || sx < 1 || sy < 1) continue; // fora da arte: sem repetir o último pixel
      const [r, g, b] = sample(sx, sy);
      const key = smooth(10, 45, Math.max(Math.abs(r - BG), Math.abs(g - BG), Math.abs(b - BG)));
      // A borda da janela cai no meio de um pixel: a rampa fica 1 a 3 px por dentro dela, onde o fundo sempre está
      // presente (se a rampa passasse da borda, uma coluna meio transparente deixava o escuro de trás aparecer, um risco).
      const alpha = d < 0 ? key : smooth(-3, -1, wd);
      if (alpha <= 0) continue;
      const o = (y * OUT_W + x) * 4;
      vaza[o] = clamp(r, 0, 255); vaza[o + 1] = clamp(g, 0, 255); vaza[o + 2] = clamp(b, 0, 255); vaza[o + 3] = Math.round(alpha * 255);
    }
  }
  await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/campeao-mes-vaza.webp`);

  // ---- Camada dos raios (animada, `cc-thunder-glow`): só os raios, mais claros, com um brilho azul em volta ----
  // Só a tempestade de dentro do ouro e o aglomerado da direita; o neon, o ouro e o louro ficam de fora (são claros
  // demais e não são raios). Só soma luz: a arte continua com os raios sempre à vista.
  const N = W * H, lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = 0.3 * data[i * 3] + 0.59 * data[i * 3 + 1] + 0.11 * data[i * 3 + 2];
  const around = boxBlur(lum, W, H, 9, 2);
  // Dentro do ouro: retângulo de cantos redondos (raio ~87, 8 px de folga); na direita, o trecho do aglomerado que sai da carta.
  const IN = { l: 185, r: 1157, t: 317, b: 1687, rad: 80 };
  const region = (x, y) => {
    const cx = Math.min(Math.max(x, IN.l + IN.rad), IN.r - IN.rad), cy = Math.min(Math.max(y, IN.t + IN.rad), IN.b - IN.rad);
    const inner = x > IN.l && x < IN.r && y > IN.t && y < IN.b && Math.hypot(x - cx, y - cy) <= IN.rad;
    const cluster = x >= 1215 && x <= 1342 && y >= 560 && y <= 1240;
    return inner || cluster ? 1 : 0;
  };
  // Só o que é bem mais claro que a volta (raio), não o contorno cinza da nuvem e dos cristais.
  const mask = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; mask[i] = region(x, y) ? smooth(28, 65, lum[i] - around[i]) * smooth(165, 220, lum[i]) : 0; }
  const halo = boxBlur(mask, W, H, 11, 3);
  const bilinear = (arr, fx, fy) => { const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, at = (x, y) => arr[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]; return at(x0, y0) * (1 - tx) * (1 - ty) + at(x0 + 1, y0) * tx * (1 - ty) + at(x0, y0 + 1) * (1 - tx) * ty + at(x0 + 1, y0 + 1) * tx * ty; };
  const boltPixel = (sx, sy) => { // [r, g, b, alfa]
    const f = 1 - smooth(W - 60, W - 2, sx), m = bilinear(mask, sx, sy) * f, h = clamp(bilinear(halo, sx, sy) * 3.2) * 0.9 * f, px = sample(sx, sy);
    const a = clamp(m + h * (1 - m));
    if (a <= 0.003) return [0, 0, 0, 0];
    const core = px.map((c) => clamp(c * 1.5 + 95, 0, 255)), glow = [110, 170, 255];
    return [0, 1, 2].map((c) => (core[c] * m + glow[c] * h * (1 - m)) / a).concat([a]);
  };
  const dentro = Buffer.alloc(FW * FH * 4);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const px = boltPixel(win.left + ((x + 0.5) / FW) * win.width, win.top + ((y + 0.5) / FH) * win.height), q = (y * FW + x) * 4;
    dentro[q] = px[0]; dentro[q + 1] = px[1]; dentro[q + 2] = px[2]; dentro[q + 3] = Math.round(px[3] * 255);
  }
  await sharp(dentro, { raw: { width: FW, height: FH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/campeao-mes-raios-dentro.webp`);
  const fora = Buffer.alloc(OUT_W * BH * 4);
  for (let y = 0; y < BH; y++) for (let x = 0; x < OUT_W; x++) {
    const d = depth(x, y), wd = d < 0 ? 0 : windowDistance(x + 0.5, y + 0.5);
    if (d >= 0 && wd < -3) continue;
    const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
    if (sx >= W - 2 || sy >= H - 2 || sx < 1 || sy < 1) continue;
    const px = boltPixel(sx, sy), o = (y * OUT_W + x) * 4, a = px[3] * (d < 0 ? 1 : smooth(-3, -1, wd)) * smooth(0, 20, x) * smooth(0, 20, y) * smooth(0, 20, BH - y);
    if (a <= 0.003) continue;
    fora[o] = px[0]; fora[o + 1] = px[1]; fora[o + 2] = px[2]; fora[o + 3] = Math.round(a * 255);
  }
  await sharp(fora, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/campeao-mes-raios.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
