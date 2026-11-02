// Destaques (Atacante, Criativo, Defensor, Goleiro, Gol da Rodada, Goleador) fora do Halloween, versão da arte do dono do app (2026-11-02):
// `destaques-agua-dono.jpg` (1342 × 2000, uma imagem só, sem render em 3D): um redemoinho de água num cartão com fio de ouro fino, o tubo de
// neon ciano por fora e gotas d'água em volta, sobre preto. Duas peças: `premio-destaque-agua-arte.webp` (a janela, 600 × 860) e
// `premio-destaque-agua-arte-vaza.webp` (a borda, 714 × 1000: por dentro do cartão o que está por baixo do fio, opaco; por fora o neon, o brilho
// e as gotas, com o preto virando transparência pelo brilho, cor = pixel / alfa).
// Uso: node destaques-agua-arte.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "destaques-agua-dono.jpg");

const W = 1342, H = 2000;
const EDGE = { left: 173, right: 1167, top: 301, bottom: 1695 }; // o centro do fio de ouro (medido) = a borda da carta
const RADIUS = 82; // raio do canto do fio de ouro (medido: ele fica reto a ~83 px do canto)
const BW = 714, BH = 1000;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
// A janela do conteúdo vai até o lado de dentro do fio de ouro (0,9% da largura e 0,65% da altura para dentro da borda), `window: "ring"`
// na roupa: com os 1,7% das outras cartas sobrava uma faixa de água entre a foto e o fio, onde o conteúdo não chegava.
const IX = 0.009, IY = 0.0065;
const WIN = { l: CX0 + CW * IX, t: CY0 + CH * IY, r: CX0 + CW * (1 - IX), b: CY0 + CH * (1 - IY) };
const WIN_RADIUS = CW * 0.08; // o raio do lado de dentro do fio (medido: ~78 px na arte, 7,9% da largura) mais a folga de 0,9%
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

(async () => {
  const { data } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sample = (fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (x, y, k) => data[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 3 + k];
    return [0, 1, 2].map((k) => at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  };
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * IX, top: EDGE.top + h * IY, width: w * (1 - 2 * IX), height: h * (1 - 2 * IY) };
  const bg = Buffer.alloc(FW * FH * 3);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const px = sample(win.left + ((x + 0.5) / FW) * win.width, win.top + ((y + 0.5) / FH) * win.height), o = (y * FW + x) * 3;
    bg[o] = clamp(px[0], 0, 255); bg[o + 1] = clamp(px[1], 0, 255); bg[o + 2] = clamp(px[2], 0, 255);
  }
  await sharp(bg, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premio-destaque-agua-arte.webp`);

  const vaza = Buffer.alloc(BW * BH * 4);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const d = depth(x, y);
      const wd = d < 0 ? 0 : windowDistance(x + 0.5, y + 0.5);
      if (d >= 0 && wd < -3) continue;
      const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
      if (sx >= W - 2 || sy >= H - 2 || sx < 1 || sy < 1) continue;
      const [r, g, b] = sample(sx, sy), o = (y * BW + x) * 4;
      if (d >= 0) { // por baixo e em cima do fio de ouro, dentro do cartão: a arte como está
        vaza[o] = clamp(r, 0, 255); vaza[o + 1] = clamp(g, 0, 255); vaza[o + 2] = clamp(b, 0, 255); vaza[o + 3] = Math.round(smooth(-3, -1, wd) * 255);
        continue;
      }
      // O preto da arte não é preto (10 a 18): sem tirar esse piso aparecia um retângulo escuro em volta da carta.
      const lum = Math.max(0, Math.max(r, g, b) - 20), alphaRaw = clamp(lum / 235 * 1.1);
      const a = alphaRaw * smooth(0, 18, x) * smooth(0, 18, y) * smooth(0, 18, BW - x) * smooth(0, 18, BH - y);
      if (a <= 0.004) continue;
      const k = 1 / Math.max(alphaRaw, 0.05);
      vaza[o] = clamp(r * k, 0, 255); vaza[o + 1] = clamp(g * k, 0, 255); vaza[o + 2] = clamp(b * k, 0, 255); vaza[o + 3] = Math.round(a * 255);
    }
  }
  await sharp(vaza, { raw: { width: BW, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premio-destaque-agua-arte-vaza.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
