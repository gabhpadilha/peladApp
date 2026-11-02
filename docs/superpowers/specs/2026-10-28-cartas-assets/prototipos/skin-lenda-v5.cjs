// Lenda do Trovão, versão 5 (2026-11-02, em camadas do Gemini): o dono do app pediu as três peças separadas:
//   `lenda-v5-fundo-dono.jpg`   tempestade azul e laranja com raios, num cartão de cantos redondos (1342 × 2000);
//   `lenda-v5-borda-dono.jpg`   fio fino de ouro com o neon azul e laranja ondulado por fora, como raios (687 × 1024, a mesma proporção);
//   `lenda-v5-render-dono.jpg`  o cristal de rocha com raios azuis e fagulhas laranja, que passa da carta pela direita (1342 × 2000).
// Mesmo caminho do Melhor Jogador (`premio-craque-fogo.cjs`): fundo → borda → render, sem separar nem preencher nada. O render tem alfa
// pelo brilho (com um piso, que o preto da arte não é preto) e fica POR CIMA da borda. A janela vai até o lado de dentro do fio de ouro
// (`window: "ring"`, canto de 5,2cqw), as fagulhas e o cristal que caem dentro dela ficam no fundo, atrás do jogador. Sem animação.
// Saem `skin-lenda.webp` (janela, 600 × 846) e `skin-lenda-vaza.webp` (borda e render por fora, 800 × 1000, `overflowWidth` 800/714).
// Uso: node skin-lenda-v5.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const dir = __dirname;

const W = 1342, H = 2000;
const EDGE = { left: 219, right: 1131, top: 344, bottom: 1651 }; // o centro do fio de ouro da borda (medido) = a borda da carta
const RADIUS = 55;
const IX = 0.009, IY = 0.0065;
const BW = 714, BH = 1000, OUT_W = 800;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
const WIN = { l: CX0 + CW * IX, t: CY0 + CH * IY, r: CX0 + CW * (1 - IX), b: CY0 + CH * (1 - IY) };
const WIN_RADIUS = CW * 0.052; // o canto do lado de dentro do fio (medido na borda: sai da reta uns 17 a 25 px antes do canto, ~5% da largura do cartão)
const FW = 600, FH = Math.round(600 * ((1 - 2 * IY) * (EDGE.bottom - EDGE.top)) / ((1 - 2 * IX) * (EDGE.right - EDGE.left)));

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
const mapPoint = (x, y) => [EDGE.left + (x - CX0) / SX, EDGE.top + (y - CY0) / SY];
function depth(x, y) {
  const lx = x - CX0, ly = y - CY0;
  if (lx <= 0 || ly <= 0 || lx >= CW || ly >= CH) return -1;
  const cx = Math.min(Math.max(lx, CORNER), CW - CORNER), cy = Math.min(Math.max(ly, CORNER), CH - CORNER);
  const d = Math.hypot(lx - cx, ly - cy);
  return d > CORNER ? -1 : d > 0 ? CORNER - d : Math.min(lx, ly, CW - lx, CH - ly);
}
function windowDistance(x, y) {
  const cx = clamp(x, WIN.l + WIN_RADIUS, WIN.r - WIN_RADIUS), cy = clamp(y, WIN.t + WIN_RADIUS, WIN.b - WIN_RADIUS);
  return Math.hypot(x - cx, y - cy) - WIN_RADIUS;
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
// O preto da borda e do render não é preto (15 a 26): o piso sai do cálculo, senão aparecia um retângulo escuro em volta.
// Cada peça (borda, render) é luz sobre preto: cor "pré-multiplicada" = pixel menos o piso, e alfa pelo brilho.
const FLOOR_FRAME = 26, FLOOR_RENDER = 18;
const alphaOf = (v, floor) => clamp(Math.max(0, Math.max(v[0], v[1], v[2]) - floor) / (255 - floor) * 1.25);
const premOf = (v, floor) => v.map((c) => Math.max(0, c - floor + 4) * 1.04);

(async () => {
  const load = async (name) => (await sharp(path.join(dir, name)).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer());
  const [bg, frame, render] = await Promise.all([load("lenda-v5-fundo-dono.jpg"), load("lenda-v5-borda-dono.jpg"), load("lenda-v5-render-dono.jpg")]);
  const sample = (buf, fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (x, y, k) => buf[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 3 + k];
    return [0, 1, 2].map((k) => at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  };
  // O render na posição (px da arte): [cor pré-multiplicada, alfa]; some nos últimos px da imagem (vem cortado reto). O cristal tem o corpo
  // cinza-azulado ESCURO (60 a 140 de brilho): com o alfa proporcional ao brilho, como nas luzes da borda, ele ficava translúcido, "fantasma"
  // (o dono viu). Aqui o alfa sobe de uma vez (16 a 60) e a cor fica como está: o corpo é opaco e nítido; só o brilho em volta, mais fraco, mistura.
  const renderLight = (sx, sy) => {
    const r = sample(render, sx, sy), f = 1 - smooth(W - 60, W - 2, sx);
    return [r.map((c) => Math.max(0, c - 12) * f), smooth(16, 60, Math.max(r[0], r[1], r[2])) * f];
  };
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * IX, top: EDGE.top + h * IY, width: w * (1 - 2 * IX), height: h * (1 - 2 * IY) };

  // A janela: o fundo, com o render (o cristal e as fagulhas) que cai dentro dela por cima, atrás do jogador.
  const bgOut = Buffer.alloc(FW * FH * 3);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const fx = win.left + ((x + 0.5) / FW) * win.width, fy = win.top + ((y + 0.5) / FH) * win.height;
    const b = sample(bg, fx, fy), [pm, a] = renderLight(fx, fy), o = (y * FW + x) * 3;
    for (let c = 0; c < 3; c++) bgOut[o + c] = clamp(pm[c] + b[c] * (1 - a), 0, 255);
  }
  await sharp(bgOut, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/skin-lenda.webp`);

  // Por fora da janela: dentro do cartão o fundo por baixo da borda (opaco); fora do cartão a borda e o render, o preto virando transparência.
  const vaza = Buffer.alloc(OUT_W * BH * 4);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const d = depth(x, y);
      const wd = d < 0 ? 0 : windowDistance(x + 0.5, y + 0.5);
      if (d >= 0 && wd < -3) continue;
      const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
      if (sx >= W - 2 || sy >= H - 2 || sx < 1 || sy < 1) continue;
      const o = (y * OUT_W + x) * 4;
      const f = sample(frame, sx, sy), [pr, ar] = renderLight(sx, sy);
      const af = alphaOf(f, FLOOR_FRAME), pf = premOf(f, FLOOR_FRAME);
      const aAll = clamp(ar + af * (1 - ar));
      const prem = [0, 1, 2].map((c) => pr[c] + pf[c] * (1 - ar));
      if (d >= 0) {
        const b = sample(bg, sx, sy), ramp = smooth(-3, -1, wd);
        for (let c = 0; c < 3; c++) vaza[o + c] = clamp(b[c] * (1 - aAll) + prem[c], 0, 255);
        vaza[o + 3] = Math.round(ramp * 255);
      } else {
        const edge = smooth(0, 20, x) * smooth(0, 20, y) * smooth(0, 20, BH - y);
        if (aAll * edge <= 0.004) continue;
        const k = 1 / Math.max(aAll, 0.05);
        for (let c = 0; c < 3; c++) vaza[o + c] = clamp(prem[c] * k, 0, 255);
        vaza[o + 3] = Math.round(aAll * edge * 255);
      }
    }
  }
  await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-vaza.webp`);

  // ---- Camada dos raios (animada): só os raios do render, mais claros, com um brilho azul em volta ----
  const N = W * H, lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = 0.3 * render[i * 3] + 0.59 * render[i * 3 + 1] + 0.11 * render[i * 3 + 2];
  const around = boxBlur(lum, W, H, 9, 2);
  const mask = new Float32Array(N);
  for (let i = 0; i < N; i++) mask[i] = smooth(20, 55, lum[i] - around[i]) * smooth(105, 160, lum[i]);
  const halo = boxBlur(mask, W, H, 11, 3);
  const sMask = (fx, fy) => { const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, at = (x, y) => mask[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]; return at(x0, y0) * (1 - tx) * (1 - ty) + at(x0 + 1, y0) * tx * (1 - ty) + at(x0, y0 + 1) * (1 - tx) * ty + at(x0 + 1, y0 + 1) * tx * ty; };
  const sHalo = (fx, fy) => { const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, at = (x, y) => halo[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]; return at(x0, y0) * (1 - tx) * (1 - ty) + at(x0 + 1, y0) * tx * (1 - ty) + at(x0, y0 + 1) * (1 - tx) * ty + at(x0 + 1, y0 + 1) * tx * ty; };
  const boltPixel = (sx, sy) => { // [r, g, b, alfa]
    const f = 1 - smooth(W - 60, W - 2, sx), m = sMask(sx, sy) * f, h = clamp(sHalo(sx, sy) * 3.2) * 0.9 * f, px = sample(render, sx, sy);
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
  await sharp(dentro, { raw: { width: FW, height: FH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-raios-dentro.webp`);
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
  await sharp(fora, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-raios.webp`);
  console.log("ok", FW, FH);
})().catch((e) => { console.error(e); process.exit(1); });
