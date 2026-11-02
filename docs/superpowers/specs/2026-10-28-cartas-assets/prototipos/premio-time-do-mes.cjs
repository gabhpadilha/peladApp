// Time do Mês, versão em camadas (2026-11-02): o dono do app pediu as três peças separadas ao Gemini (1421 × 2000 as três, a carta na
// mesma posição):
//   `time-do-mes-fundo-dono.jpg`   a tempestade roxa num cartão de cantos redondos (já tem um clarão de raios);
//   `time-do-mes-borda-dono.jpg`   o tubo de neon roxo com a coroa e o aro de vidro (o "fundo transparente" veio com um xadrez cinza ASSADO
//                                  na imagem: o neon e o brilho roxo saem pela cor, e o xadrez, cinza, pelo alfa);
//   `time-do-mes-render-dono.jpg`  o aglomerado de raios roxo, sobre preto, que passa da carta pela direita.
// Sem separar nem preencher nada: fundo → borda → render. O fundo e a borda (aro e neon) ficam parados; o render é a camada que muda de
// INTENSIDADE (`sweep: "pulso"`: respira entre 40% e 100%, nunca apaga; o dono não quer o raio sumindo): `-raios-dentro` (a parte dentro da
// janela, por cima do clarão do fundo) e `-raios` (a de fora, por cima da borda). Saem `premium-time-do-mes.webp` (janela, 600 × 860),
// `premium-time-do-mes-vaza.webp` (a borda por fora e por baixo do aro, 790 × 1000), `premium-time-do-mes-raios-dentro.webp` (600 × 860) e
// `premium-time-do-mes-raios.webp` (790 × 1000; `overflowWidth` 790/714 na roupa).
// Uso: node premio-time-do-mes.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const dir = __dirname;

const W = 1421, H = 2000;
const EDGE = { left: 207, right: 1216, top: 279, bottom: 1720 }; // as bordas do cartão do fundo (medidas) = a borda da carta
const RADIUS = 60;
const TOP_SQUEEZE = 0.86; // a coroa passa da sobra de cima: o que está acima do cartão encolhe
const BW = 714, BH = 1000, OUT_W = 790;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
const WIN = { l: CX0 + CW * 0.017, t: CY0 + CH * 0.0121, r: CX0 + CW * 0.983, b: CY0 + CH * 0.9879 };
const WIN_RADIUS = CW * 0.073;
const FW = 600, FH = 860;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
function mapPoint(x, y) {
  const v = EDGE.top + (y - CY0) / SY;
  return [EDGE.left + (x - CX0) / SX, v < EDGE.top ? EDGE.top - (EDGE.top - v) / TOP_SQUEEZE : v];
}
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
/** Distância assinada (px da arte) até o cartão: positiva fora. */
function cardDistance(x, y) {
  const hw = (EDGE.right - EDGE.left) / 2, hh = (EDGE.bottom - EDGE.top) / 2;
  const dx = Math.abs(x - (EDGE.left + EDGE.right) / 2) - hw + RADIUS, dy = Math.abs(y - (EDGE.top + EDGE.bottom) / 2) - hh + RADIUS;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - RADIUS;
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
const load = async (name) => (await sharp(path.join(dir, name)).removeAlpha().raw().toBuffer());
const sampler = (buf, ch) => (fx, fy) => {
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const at = (x, y, k) => buf[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * ch + k];
  const out = [];
  for (let k = 0; k < ch; k++) out.push(at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  return out;
};

(async () => {
  const [bgRaw, borderRaw, renderRaw] = await Promise.all([load("time-do-mes-fundo-dono.jpg"), load("time-do-mes-borda-dono.jpg"), load("time-do-mes-render-dono.jpg")]);
  const N = W * H;

  // Borda: RGBA limpo. O tubo de neon, a coroa e o aro são fortes (o xadrez assado é cinza e escuro, até ~55); o brilho em volta, que na
  // imagem vinha misturado ao xadrez (aparecia em blocos), é REFEITO: um desfoque da própria borda, em roxo.
  const core = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, mx = Math.max(borderRaw[i * 3], borderRaw[i * 3 + 1], borderRaw[i * 3 + 2]);
    let a = smooth(95, 165, mx);
    if (Math.abs(cardDistance(x, y)) < 16) a = Math.max(a, smooth(62, 105, mx));
    core[i] = a;
  }
  const glow = boxBlur(core, W, H, 11, 3);
  const frame = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const c = core[i], g = clamp(glow[i] * 1.5) * 0.62, a = c + (1 - c) * g;
    for (let k = 0; k < 3; k++) frame[i * 4 + k] = a > 0 ? clamp((borderRaw[i * 3 + k] * c + [150, 50, 235][k] * (1 - c) * g) / a, 0, 255) : 0;
    frame[i * 4 + 3] = Math.round(a * 255);
  }
  // Render: o aglomerado de raios sobre preto: alfa pelo brilho, a cor sem o preto; some nos últimos px da imagem (o aglomerado vem cortado reto).
  const render = Buffer.alloc(N * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = renderRaw[i * 3], g = renderRaw[i * 3 + 1], b = renderRaw[i * 3 + 2];
    const a = smooth(6, 110, Math.max(r, g, b)) * (1 - smooth(W - 110, W - 2, x)), k = a > 0.01 ? 1 / Math.max(smooth(6, 110, Math.max(r, g, b)), 0.05) : 0;
    render[i * 4] = clamp(r * k, 0, 255); render[i * 4 + 1] = clamp(g * k, 0, 255); render[i * 4 + 2] = clamp(b * k, 0, 255); render[i * 4 + 3] = Math.round(a * 255);
  }
  const sBg = sampler(bgRaw, 3), sFrame = sampler(frame, 4), sRender = sampler(render, 4);

  // Janela da carta: o fundo, com o aro e o neon que caem dentro dela por cima.
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * 0.017, top: EDGE.top + h * 0.0121, width: w * 0.966, height: h * 0.9758 };
  const bgOut = Buffer.alloc(FW * FH * 3), inner = Buffer.alloc(FW * FH * 4);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const fx = win.left + ((x + 0.5) / FW) * win.width, fy = win.top + ((y + 0.5) / FH) * win.height;
    const b = sBg(fx, fy), f = sFrame(fx, fy), r = sRender(fx, fy);
    const o = (y * FW + x) * 3, q = (y * FW + x) * 4, af = f[3] / 255;
    for (let c = 0; c < 3; c++) bgOut[o + c] = clamp(b[c] * (1 - af) + f[c] * af, 0, 255);
    inner[q] = r[0]; inner[q + 1] = r[1]; inner[q + 2] = r[2]; inner[q + 3] = Math.round(r[3]);
  }
  await sharp(bgOut, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premium-time-do-mes.webp`);
  await sharp(inner, { raw: { width: FW, height: FH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-time-do-mes-raios-dentro.webp`);

  // Por fora da janela: dentro do cartão o fundo por baixo da borda (opaco); fora, só a borda (alfa pela cor). O render, noutra camada, por cima.
  const vaza = Buffer.alloc(OUT_W * BH * 4), raios = Buffer.alloc(OUT_W * BH * 4);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const d = depth(x, y);
      const wd = d < 0 ? 0 : windowDistance(x + 0.5, y + 0.5);
      if (d >= 0 && wd < -3) continue;
      const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
      if (sx >= W - 2 || sy >= H - 2 || sx < 1 || sy < 1) continue;
      const o = (y * OUT_W + x) * 4, f = sFrame(sx, sy), r = sRender(sx, sy);
      const af = f[3] / 255, edge = smooth(0, 22, x) * smooth(0, 22, y) * smooth(0, 22, BH - y);
      if (d >= 0) {
        const b = sBg(sx, sy), ramp = smooth(-3, -1, wd);
        for (let c = 0; c < 3; c++) vaza[o + c] = clamp(b[c] * (1 - af) + f[c] * af, 0, 255);
        vaza[o + 3] = Math.round(ramp * 255);
      } else if (af * edge > 0.004) {
        vaza[o] = f[0]; vaza[o + 1] = f[1]; vaza[o + 2] = f[2]; vaza[o + 3] = Math.round(af * edge * 255);
      }
      const ar = (r[3] / 255) * (d < 0 ? 1 : smooth(-3, -1, wd)) * edge;
      if (ar > 0.004) { raios[o] = r[0]; raios[o + 1] = r[1]; raios[o + 2] = r[2]; raios[o + 3] = Math.round(ar * 255); }
    }
  }
  await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-time-do-mes-vaza.webp`);
  await sharp(raios, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-time-do-mes-raios.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
