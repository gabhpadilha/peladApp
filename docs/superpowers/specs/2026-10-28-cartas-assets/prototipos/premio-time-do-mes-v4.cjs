// Time do Mês, versão 4 (2026-11-04): tempestade roxa com raios e poeira dourada, no estilo das cartas da Loja (fio de ouro por dentro,
// tubo de neon roxo por fora e a coroa no topo). Uma imagem só do dono do app no Gemini, 728 × 1024 (`time-do-mes-v4-composto-dono.jpg`):
// o Gemini pôs uma nuvem com raios no canto de cima à direita, que o dono NÃO quis. A moldura é simétrica, então o canto sai espelhando o
// lado esquerdo (a moldura fora do fio de ouro) e o miolo dessa região também (fica sob a barra do nome e o selo do OVR).
// Janela `inner` (5,8% e 4,2%): o conteúdo vai até o fio de ouro; por fora dele, a faixa de moldura (neon, respiro preto e ouro) é OPACA e
// fica por cima (`-vaza`), e por fora da carta ficam só o brilho do neon e a ponta da coroa (alfa pelo brilho).
// Saem `premium-time-do-mes.webp` (janela, 600 × 860) e `premium-time-do-mes-vaza.webp` (714 × 1000).
// Uso: node premio-time-do-mes-v4.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const dir = __dirname;

const W = 728, H = 1024;
const EDGE = { left: 64, right: 663, top: 116, bottom: 901 }; // lado de FORA do tubo de neon (medido) = a borda da carta
const RADIUS = 80; // canto do tubo, na arte
const GOLD = { l: 105, r: 623, t: 157, b: 861, radius: 42 }; // lado de DENTRO do fio de ouro = o miolo
const BW = 714, BH = 1000;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
const FW = 600, FH = 860;

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
// distância (px da arte) ao miolo: negativa por dentro do fio de ouro
function goldDistance(sx, sy) {
  const cx = clamp(sx, GOLD.l + GOLD.radius, GOLD.r - GOLD.radius), cy = clamp(sy, GOLD.t + GOLD.radius, GOLD.b - GOLD.radius);
  return Math.hypot(sx - cx, sy - cy) - GOLD.radius;
}
const sampler = (buf, ch) => (fx, fy) => {
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const at = (x, y, k) => buf[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * ch + k];
  const out = [];
  for (let k = 0; k < ch; k++) out.push(at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  return out;
};

(async () => {
  const raw = await sharp(path.join(dir, "time-do-mes-v4-composto-dono.jpg")).removeAlpha().raw().toBuffer();
  const N = W * H;
  // Tira a nuvem: o canto de cima à direita vem do lado esquerdo, espelhado (a moldura é simétrica em torno de x = 363,5).
  const P = Buffer.from(raw);
  const mirrorX = (x) => W - 1 - x;
  for (let y = 0; y < 300; y++) for (let x = 364; x < W; x++) {
    const inside = goldDistance(x, y) < 0;
    // moldura (fora do fio de ouro): troca inteira; miolo: só a região onde a nuvem solta raios, com a emenda esmaecida
    let a = inside ? smooth(430, 475, x) * (1 - smooth(240, 275, y)) : 1 - smooth(232, 296, y); // a emenda esmaece devagar para o fio de ouro não dar degrau
    if (a <= 0) continue;
    const i = (y * W + x) * 3, m = (y * W + mirrorX(x)) * 3;
    for (let k = 0; k < 3; k++) P[i + k] = raw[i + k] * (1 - a) + raw[m + k] * a;
  }
  const sP = sampler(P, 3);

  // Janela (`inner`): o miolo da arte, de ponta a ponta do retângulo da janela.
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * 0.058, top: EDGE.top + h * 0.042, width: w * 0.884, height: h * 0.916 };
  const bgOut = Buffer.alloc(FW * FH * 3);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const c = sP(win.left + ((x + 0.5) / FW) * win.width, win.top + ((y + 0.5) / FH) * win.height), o = (y * FW + x) * 3;
    for (let k = 0; k < 3; k++) bgOut[o + k] = clamp(c[k], 0, 255);
  }
  await sharp(bgOut, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premium-time-do-mes.webp`);

  // Por fora do miolo: dentro da carta a faixa de moldura é opaca (a arte como está, sobre o preto); por fora da carta, só a luz.
  const vaza = Buffer.alloc(BW * BH * 4);
  const FEATHER = 22;
  const RIM = 16; // px de saída em que a faixa opaca desce para o alfa pelo brilho, rente à borda da carta (sem emenda visível)
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
    if (sx < 1 || sy < 1 || sx >= W - 2 || sy >= H - 2) continue;
    const d = depth(x, y), c = sP(sx, sy), o = (y * BW + x) * 4;
    const lum = smooth(14, 120, Math.max(c[0], c[1], c[2]));
    const edge = smooth(0, FEATHER * 2.4, x) * smooth(0, FEATHER * 2.4, BW - 1 - x) * smooth(0, FEATHER, y) * smooth(0, FEATHER, BH - 1 - y);
    let a;
    if (d < 0) a = lum * edge;
    else {
      const gd = goldDistance(sx, sy) * SX; // px de saída
      const strip = smooth(-1.5, 1.5, gd); // 0 dentro do miolo, 1 na faixa
      a = (lum + (1 - lum) * smooth(0, RIM, d)) * strip;
    }
    if (a > 0.004) { vaza[o] = clamp(c[0], 0, 255); vaza[o + 1] = clamp(c[1], 0, 255); vaza[o + 2] = clamp(c[2], 0, 255); vaza[o + 3] = Math.round(a * 255); }
  }
  await sharp(vaza, { raw: { width: BW, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-time-do-mes-vaza.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
