// Lenda do Trovão, versão 3 (2026-11-01): `lenda-v3-dono.jpg` (1342 × 2000: céu de tempestade azul-noite com
// raios azuis e dourados, fio de ouro fino com filigranas nos cantos e um raio dourado no topo, tubo de neon azul
// e uma nuvem de tempestade que passa por cima da moldura pelo lado ESQUERDO). Mesmo caminho do Relâmpago
// (`premium-relampago.cjs`): os raios saem do fundo e vão para duas camadas que piscam (`innerBolts` e
// `overflowBolts`). Diferenças: a imagem de fora tem 60 px extras à esquerda (`overflowLeft` na roupa), a
// arte tem filigranas e o raio do topo, que ficam fixos, e os raios são achados pelo contraste local.
// Saem `skin-lenda.webp`, `skin-lenda-raios-dentro.webp`, `skin-lenda-vaza.webp` e `skin-lenda-raios.webp`.
// Uso: node skin-lenda-v3.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "lenda-v3-dono.jpg");

const EDGE = { left: 191, right: 1151, top: 319, bottom: 1681 }; // borda de fora do fio de ouro (medida)
const RADIUS = 50;
const BG = 12;
const BW = 714, BH = 1000, LEFT_EXT = 60, OUT_W = LEFT_EXT + BW; // a nuvem sai pela esquerda
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
const WIN = { l: CX0 + CW * 0.017, t: CY0 + CH * 0.0121, r: CX0 + CW * 0.983, b: CY0 + CH * 0.9879 };
const WIN_RADIUS = CW * 0.073;
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
function windowDistance(x, y) {
  const cx = clamp(x, WIN.l + WIN_RADIUS, WIN.r - WIN_RADIUS), cy = clamp(y, WIN.t + WIN_RADIUS, WIN.b - WIN_RADIUS);
  return Math.hypot(x - cx, y - cy) - WIN_RADIUS;
}
/** Distância assinada (px da arte) até o painel: positiva fora. */
function panelDistance(x, y) {
  const hw = (EDGE.right - EDGE.left) / 2, hh = (EDGE.bottom - EDGE.top) / 2;
  const dx = Math.abs(x - (EDGE.left + EDGE.right) / 2) - hw + RADIUS, dy = Math.abs(y - (EDGE.top + EDGE.bottom) / 2) - hh + RADIUS;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - RADIUS;
}

/** Máscara com raio `r` por duas passadas (máximo numa janela). */
function dilate(mask, W, H, r) {
  const tmp = new Float32Array(mask.length), out = new Float32Array(mask.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < W) m = Math.max(m, mask[y * W + xx]); } tmp[y * W + x] = m; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < H) m = Math.max(m, tmp[yy * W + x]); } out[y * W + x] = m; }
  return out;
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
  const W = info.width, H = info.height, N = W * H;
  const ch = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  for (let i = 0; i < N; i++) { ch[0][i] = data[i * 3]; ch[1][i] = data[i * 3 + 1]; ch[2][i] = data[i * 3 + 2]; }

  // Raios: linhas finas bem mais claras que o entorno (o contraste local não pega as nuvens iluminadas). O fio de
  // ouro, as filigranas dos cantos, o raio do topo e o tubo de neon ficam fixos.
  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = 0.3 * ch[0][i] + 0.59 * ch[1][i] + 0.11 * ch[2][i];
  const around = boxBlur(lum, W, H, 10, 2);
  const bolt = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let m = smooth(22, 60, lum[i] - around[i]) * smooth(150, 205, lum[i]);
      if (m <= 0) continue;
      const d = panelDistance(x, y);
      const nearCorner = Math.min(Math.abs(x - EDGE.left), Math.abs(x - EDGE.right)) < 120 && Math.min(Math.abs(y - EDGE.top), Math.abs(y - EDGE.bottom)) < 120;
      if ((d > (nearCorner ? -55 : -9) && d < 6) || (d > 9 && d < 38)) m = 0; // fio de ouro, filigranas e tubo de neon
      if (x > 625 && x < 725 && y > 250 && y < 380) m = 0; // o raio dourado do topo
      m *= 1 - smooth(W - 130, W - 6, x);
      bolt[i] = m;
    }
  }

  // Fundo sem os raios: cada raio (e uma folga em volta) é preenchido com a média da nuvem ao redor.
  const hard = new Float32Array(N);
  for (let i = 0; i < N; i++) hard[i] = bolt[i] > 0.08 ? 1 : 0;
  const grow = dilate(hard, W, H, 4);
  const S = 2, w4 = Math.ceil(W / S), h4 = Math.ceil(H / S), n4 = w4 * h4;
  const sumC = [new Float32Array(n4), new Float32Array(n4), new Float32Array(n4)], sumW = new Float32Array(n4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, j = Math.floor(y / S) * w4 + Math.floor(x / S), k = 1 - grow[i]; for (let c = 0; c < 3; c++) sumC[c][j] += ch[c][i] * k; sumW[j] += k; }
  const bw = boxBlur(sumW, w4, h4, 9, 3);
  const bc = sumC.map((a) => boxBlur(a, w4, h4, 9, 3));
  const fill = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  const soft = boxBlur(grow, W, H, 3, 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, j = Math.min(h4 - 1, Math.floor(y / S)) * w4 + Math.min(w4 - 1, Math.floor(x / S)), m = soft[i];
      for (let c = 0; c < 3; c++) fill[c][i] = m > 0 && bw[j] > 0.02 ? ch[c][i] * (1 - m) + (bc[c][j] / bw[j]) * m : ch[c][i];
    }
  }

  const sampler = (arr) => (fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (x, y) => arr[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
    return at(x0, y0) * (1 - tx) * (1 - ty) + at(x0 + 1, y0) * tx * (1 - ty) + at(x0, y0 + 1) * (1 - tx) * ty + at(x0 + 1, y0 + 1) * tx * ty;
  };
  const sFill = fill.map(sampler), sOrig = ch.map(sampler), sBolt = sampler(bolt);

  // Janela da carta: fundo (sem raios) e raios de dentro (atrás do jogador).
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * 0.017, top: EDGE.top + h * 0.0121, width: w * 0.966, height: h * 0.9758 };
  const bg = Buffer.alloc(FW * FH * 3), inner = Buffer.alloc(FW * FH * 4);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const fx = win.left + ((x + 0.5) / FW) * win.width, fy = win.top + ((y + 0.5) / FH) * win.height;
      const o = (y * FW + x) * 3, q = (y * FW + x) * 4;
      for (let c = 0; c < 3; c++) { bg[o + c] = clamp(sFill[c](fx, fy), 0, 255); inner[q + c] = clamp(sOrig[c](fx, fy), 0, 255); }
      inner[q + 3] = Math.round(clamp(sBolt(fx, fy)) * 255);
    }
  }
  await sharp(bg, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/skin-lenda.webp`);
  await sharp(inner, { raw: { width: FW, height: FH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-raios-dentro.webp`);

  // Por fora da janela: moldura e nuvem (sem raios) e, noutra camada, os raios.
  const vaza = Buffer.alloc(OUT_W * BH * 4), raios = Buffer.alloc(OUT_W * BH * 4);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const xb = x - LEFT_EXT; // coordenada na caixa da carta (negativa = sobra à esquerda)
      const d = depth(xb, y);
      const wd = d < 0 ? 0 : windowDistance(xb + 0.5, y + 0.5);
      const [sx, sy] = mapPoint(xb + 0.5, y + 0.5);
      if (sx >= W - 2 || sy >= H - 2 || sx < 1 || sy < 1) continue;
      const o = (y * OUT_W + x) * 4;
      const onEmblem = sx > 625 && sx < 725 && sy > 250 && sy < 385; // o raio do topo atravessa a borda da janela
      // No raio do topo não há rampa na borda da janela (ela escurecia o ouro por 1 a 2 px, um risco): ou é o
      // traço dourado (por transparência) ou é a arte opaca.
      if (d >= 0 && (wd < -3 || (onEmblem && wd < -1))) {
        // Dentro da janela só ficam as filigranas dos cantos e a ponta do raio do topo (ouro), por cima da barra do nome e das
        // estatísticas, como parte da moldura. O resto da janela é o fundo.
        const nearCorner = Math.min(Math.abs(sx - EDGE.left), Math.abs(sx - EDGE.right)) < 120 && Math.min(Math.abs(sy - EDGE.top), Math.abs(sy - EDGE.bottom)) < 120;
        if (!onEmblem && (!nearCorner || panelDistance(sx, sy) < -58)) continue;
        const a = smooth(70, 120, 0.3 * sOrig[0](sx, sy) + 0.59 * sOrig[1](sx, sy) + 0.11 * sOrig[2](sx, sy));
        if (a <= 0) continue;
        const base = [18, 24, 45]; // o azul-noite por baixo: tira o escuro da borda do traço
        for (let c = 0; c < 3; c++) vaza[o + c] = clamp((sOrig[c](sx, sy) - base[c] * (1 - a)) / Math.max(a, 0.25), 0, 255);
        vaza[o + 3] = Math.round(a * 255);
        continue;
      }
      const fr = sFill[0](sx, sy), fg = sFill[1](sx, sy), fb = sFill[2](sx, sy);
      const key = smooth(10, 45, Math.max(Math.abs(fr - BG), Math.abs(fg - BG), Math.abs(fb - BG)));
      const alpha = (d < 0 ? key : smooth(-3, -1, wd)) * (1 - smooth(W - 110, W - 4, sx));
      if (alpha > 0) { vaza[o] = clamp(fr, 0, 255); vaza[o + 1] = clamp(fg, 0, 255); vaza[o + 2] = clamp(fb, 0, 255); vaza[o + 3] = Math.round(alpha * 255); }
      const b = clamp(sBolt(sx, sy)) * (d < 0 ? 1 : smooth(-1, 1, wd));
      if (b > 0) { raios[o] = clamp(sOrig[0](sx, sy), 0, 255); raios[o + 1] = clamp(sOrig[1](sx, sy), 0, 255); raios[o + 2] = clamp(sOrig[2](sx, sy), 0, 255); raios[o + 3] = Math.round(b * 255); }
    }
  }
  await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-vaza.webp`);
  await sharp(raios, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-raios.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
