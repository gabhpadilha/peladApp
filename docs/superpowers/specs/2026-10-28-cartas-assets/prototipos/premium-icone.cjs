// Skin Ícone, versão do Gemini (2026-11-01): `premium-icone-dono.jpg` (1342 × 2000: mármore branco-creme
// com veios dourados, fio de ouro, tubo dourado por fora e um aglomerado de quartzo, diamantes e
// pepitas de ouro que passa por cima da moldura, sobre preto). Mesmo caminho das premium com
// cristais (`premium-v2.cjs`), sem girar cor: a proporção vai para 5:7 e o resto fica como a arte.
// Saem `premium-icone.webp` (fundo, na janela da carta) e `premium-icone-vaza.webp` (tubo, moldura e
// cristais por fora, mais larga só para a direita: `overflowWidth` 774/714 na roupa).
// Uso: node premium-icone.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "premium-icone-dono.jpg");

// Borda de fora do painel de mármore (medida) = borda da carta; o tubo dourado fica por fora, na sobra.
const EDGE = { left: 160, right: 1181, top: 298, bottom: 1701 };
const RADIUS = 95; // raio do canto do painel (medido, px da arte)
const BG = 13; // o preto da arte não é puro

const BW = 714, BH = 1000, OUT_W = 774;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
// A janela da carta (onde fica a foto): 1,7% da largura e 1,21% da altura para dentro, canto de 7,3% da largura.
// Por dentro da carta, a camada de fora cobre só o que está fora da janela (o fio de ouro e os cantos),
// para a foto ir até a borda da janela sem uma faixa de mármore por cima do ombro.
const WIN = { l: CX0 + CW * 0.017, t: CY0 + CH * 0.0121, r: CX0 + CW * 0.983, b: CY0 + CH * 0.9879 };
const WIN_RADIUS = CW * 0.073;

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

(async () => {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const at = (x, y, k) => data[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 3 + k];
  const sample = (fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    return [0, 1, 2].map((k) => at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  };

  // Fundo: a janela da carta (1,7% da largura e 1,21% da altura para dentro).
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * 0.017, top: EDGE.top + h * 0.0121, width: w * 0.966, height: h * 0.9758 };
  const FW = 600, FH = 860;
  const bg = Buffer.alloc(FW * FH * 3);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const px = sample(win.left + ((x + 0.5) / FW) * win.width, win.top + ((y + 0.5) / FH) * win.height);
      const o = (y * FW + x) * 3;
      bg[o] = clamp(px[0], 0, 255); bg[o + 1] = clamp(px[1], 0, 255); bg[o + 2] = clamp(px[2], 0, 255);
    }
  }
  await sharp(bg, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premium-icone.webp`);

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
  await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-icone-vaza.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
