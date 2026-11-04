// Time do Mês, versão 3 (2026-11-04): SEM render. Só o fundo de padrão geométrico (art déco roxo, `time-do-mes-v3-fundo-dono.jpg`, 687 × 1024)
// e a moldura nova do Gemini (`time-do-mes-v3-borda-dono.jpg`: tubo de neon roxo ondulado com a coroa e raios que saem para fora; o fundo dela é o mesmo padrão, que sai pela luminância).
// Saem `premium-time-do-mes.webp` (janela, 600 × 860: fundo + aro/neon que caem dentro) e `-vaza.webp` (714 × 1000: fundo + borda por fora da janela).
// Uso: node premio-time-do-mes-v3.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const dir = __dirname;

const W = 687, H = 1024;
const EDGE = { left: 78, right: 610, top: 94, bottom: 933 }; // lado de FORA do tubo (medido) = a borda da carta
const RADIUS = 40;
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
  const [bgRaw, borderRaw] = await Promise.all([load("time-do-mes-v3-fundo-dono.jpg"), load("time-do-mes-v3-borda-dono.jpg")]);
  const N = W * H;

  // Borda: luz sobre preto; alfa pelo brilho, a cor como está (o brilho roxo em volta do tubo fica translúcido).
  // O padrão do fundo está assado na arte da moldura, na mesma posição: subtrai o fundo e sobra só a luz da moldura (tubo, coroa e raios).
  const frame = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const r = borderRaw[i * 3], g = borderRaw[i * 3 + 1], b = borderRaw[i * 3 + 2];
    const dr = Math.max(0, r - bgRaw[i * 3] * SUB), dg = Math.max(0, g - bgRaw[i * 3 + 1] * SUB), db = Math.max(0, b - bgRaw[i * 3 + 2] * SUB);
    const a = smooth(14, 120, Math.max(dr, dg, db));
    frame[i * 4] = r; frame[i * 4 + 1] = g; frame[i * 4 + 2] = b; frame[i * 4 + 3] = Math.round(a * 255);
  }
  const sBg = sampler(bgRaw, 3), sFrame = sampler(frame, 4);

  // Janela: o fundo puro, até a borda da carta (`window: "ring"`, 0,9% e 0,65% de folga); a moldura inteira vai POR CIMA, na camada `-vaza`.
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * 0.009, top: EDGE.top + h * 0.0065, width: w * 0.982, height: h * 0.987 };
  const bgOut = Buffer.alloc(FW * FH * 3);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const fx = win.left + ((x + 0.5) / FW) * win.width, fy = win.top + ((y + 0.5) / FH) * win.height;
    const b = sBg(fx, fy), o = (y * FW + x) * 3;
    for (let c = 0; c < 3; c++) bgOut[o + c] = clamp(b[c], 0, 255);
  }
  await sharp(bgOut, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premium-time-do-mes.webp`);

  // Moldura por cima do conteúdo, só com luz (alfa pelo brilho). O padrão sai pela subtração do fundo.
  const KEEP = 52, FADE = 62; // só tira resíduo do padrão no miolo; a coroa e os fios chegam a ~40 px para dentro // px da arte para dentro da borda da carta
  const vaza = Buffer.alloc(BW * BH * 4);
  const FEATHER = 26; // as pontas dos raios esmaecem antes do corte reto da borda da imagem
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < BW; x++) {
      const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
      if (sx < 1 || sy < 1 || sx >= W - 2 || sy >= H - 2) continue;
      const d = depth(x, y);
      const mask = d < 0 ? 1 : 1 - smooth(KEEP, FADE, d / SX);
      if (mask <= 0) continue;
      const o = (y * BW + x) * 4, f = sFrame(sx, sy);
      const edge = smooth(0, FEATHER * 2.4, x) * smooth(0, FEATHER * 2.4, BW - 1 - x) * smooth(0, FEATHER, y) * smooth(0, FEATHER, BH - 1 - y);
      const aa = (f[3] / 255) * edge * mask;
      if (aa > 0.004) { vaza[o] = clamp(f[0], 0, 255); vaza[o + 1] = clamp(f[1], 0, 255); vaza[o + 2] = clamp(f[2], 0, 255); vaza[o + 3] = Math.round(aa * 255); }
    }
  }
  await sharp(vaza, { raw: { width: BW, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-time-do-mes-vaza.webp`);

  // Energia correndo em volta (efeito LED): K setores (ordem horária a partir do topo) que se sobrepõem, cada um com a moldura num roxo mais vivo (não branco) só naquele trecho.
  // O CSS acende um setor depois do outro (`cc-energy-run`), e o brilho parece dar a volta na carta.
  const K = 24, cxm = BW / 2, cym = BH / 2;
  for (let k = 0; k < K; k++) {
    const run = Buffer.alloc(BW * BH * 4);
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      const o = (y * BW + x) * 4, a = vaza[o + 3];
      if (a < 2) continue;
      let ang = Math.atan2(x - cxm, -(y - cym)); if (ang < 0) ang += Math.PI * 2;
      let dd = Math.abs(ang / (Math.PI * 2) * K - (k + 0.5)); dd = Math.min(dd, K - dd);
      const wgt = 0.5 + 0.5 * Math.cos(Math.min(1, dd / 3.2) * Math.PI);
      if (wgt < 0.02) continue;
      for (let c = 0; c < 3; c++) run[o + c] = clamp(vaza[o + c] * 0.7 + [196, 110, 255][c] * 0.3, 0, 255);
      // só o fio (o núcleo claro do raio e do tubo): o halo em volta fica de fora, para o brilho não iluminar mais largo que o fio
      const core = smooth(120, 205, Math.max(vaza[o], vaza[o + 1], vaza[o + 2]));
      run[o + 3] = Math.round(a * wgt * core * 0.85);
    }
    await sharp(run, { raw: { width: BW, height: BH, channels: 4 } }).webp({ quality: 88, alphaQuality: 90 }).toFile(`${OUT}/premium-time-do-mes-corre-${k}.webp`);
  }
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
