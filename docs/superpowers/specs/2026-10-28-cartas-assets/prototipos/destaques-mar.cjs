// Destaques, versão "mar" (2026-11-04): tempestade fotorrealista num cartão, com uma moldura de neon ciano e respingos de água.
// Três imagens do dono do app no Gemini, todas 687 × 1024 (a moldura veio em 848 × 1264, mesma proporção):
//   `destaques-mar-fundo-dono.jpg`  o mar em tempestade, num cartão com margem preta em volta;
//   `destaques-mar-borda-dono.jpg`  tubo de neon ciano, fio de metal e um respingo no canto de cima à direita, luz sobre preto;
//   `destaques-mar-composto-dono.jpg` a prévia dele com as duas juntas (só para conferir o alinhamento).
// O conteúdo vai até o tubo (`window: "ring"`) e a moldura inteira fica POR CIMA (`-vaza`). O RAIO do fundo acende: uma camada extra só com
// o raio (achado pelo brilho, num retângulo ao redor dele) soma luz com um halo azul (`-raios-dentro`, `cc-thunder-glow`).
// Saem `premio-destaque-mar.webp` (janela, 600 × 860) e `premio-destaque-mar-vaza.webp` (714 × 1000).
// Uso: node destaques-mar.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const dir = __dirname;

const W = 687, H = 1024;
const EDGE = { left: 62, right: 640, top: 112, bottom: 948 }; // lado de FORA do tubo (medido) = a borda da carta
const BGB = { left: 75, right: 623, top: 120, bottom: 929 }; // o cartão do fundo dentro da imagem dele // lado de FORA do tubo (medido) = a borda da carta
const RADIUS = 48;
const BW = 714, BH = 1000;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
// Janela do conteúdo: por dentro do aro de vidro (INNER_WINDOW do cancha-card: 5,8% da largura e 4,2% da altura da carta).
const WIN = { l: CX0 + CW * 0.058, t: CY0 + CH * 0.042, r: CX0 + CW * 0.942, b: CY0 + CH * 0.958 };
const WIN_RADIUS = CW * 0.075;
const FW = 600, FH = 860;

const SUB = 1.15; // sobra um pouco de fundo na subtração para não deixar resíduo do padrão
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
const load = async (name) => (await sharp(path.join(dir, name)).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer());
const sampler = (buf, ch) => (fx, fy) => {
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const at = (x, y, k) => buf[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * ch + k];
  const out = [];
  for (let k = 0; k < ch; k++) out.push(at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  return out;
};

(async () => {
  const [bgRaw, borderRaw] = await Promise.all([load("destaques-mar-fundo-dono.jpg"), load("destaques-mar-borda-dono.jpg")]);
  const N = W * H;

  // Borda: luz sobre preto; alfa pelo brilho, a cor como está (o brilho roxo em volta do tubo fica translúcido).
  // Moldura: luz sobre preto; alfa pelo brilho, a cor como está (o miolo dela é preto puro).
  const frame = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const r = borderRaw[i * 3], g = borderRaw[i * 3 + 1], b = borderRaw[i * 3 + 2], a = smooth(14, 120, Math.max(r, g, b));
    frame[i * 4] = r; frame[i * 4 + 1] = g; frame[i * 4 + 2] = b; frame[i * 4 + 3] = Math.round(a * 255);
  }
  const sBg = sampler(bgRaw, 3), sFrame = sampler(frame, 4);

  // Janela: o fundo até o tubo (`window: "ring"`, 0,9% e 0,65% de folga), com o cartão do fundo esticado nela.
  const bw = BGB.right - BGB.left, bh = BGB.bottom - BGB.top;
  const bgOut = Buffer.alloc(FW * FH * 3);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const fx = BGB.left + ((x + 0.5) / FW) * bw, fy = BGB.top + ((y + 0.5) / FH) * bh;
    const b = sBg(fx, fy), o = (y * FW + x) * 3;
    for (let c = 0; c < 3; c++) bgOut[o + c] = clamp(b[c], 0, 255);
  }
  await sharp(bgOut, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premio-destaque-mar.webp`);

  // Moldura por cima do conteúdo, só com luz (alfa pelo brilho).
  const vaza = Buffer.alloc(BW * BH * 4);
  const FEATHER = 26; // as pontas dos raios esmaecem antes do corte reto da borda da imagem
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
      if (sx < 1 || sy < 1 || sx >= W - 2 || sy >= H - 2) continue;
      const o = (y * BW + x) * 4, f = sFrame(sx, sy);
      const edge = smooth(0, FEATHER * 2.4, x) * smooth(0, FEATHER * 2.4, BW - 1 - x) * smooth(0, FEATHER, y) * smooth(0, FEATHER, BH - 1 - y);
      const aa = (f[3] / 255) * edge;
      if (aa > 0.004) { vaza[o] = clamp(f[0], 0, 255); vaza[o + 1] = clamp(f[1], 0, 255); vaza[o + 2] = clamp(f[2], 0, 255); vaza[o + 3] = Math.round(aa * 255); }
    }
  }
  await sharp(vaza, { raw: { width: BW, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premio-destaque-mar-vaza.webp`);

  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
