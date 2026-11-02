// Time do Mês, arte do dono do app (2026-11-02): `time-do-mes-dono.jpg` (1342 × 2000: tubo de neon roxo em volta, coroa
// de neon no topo, painel de vidro escuro e céu de tempestade roxo com um aglomerado de raios que passa por cima da
// moldura pela direita, sobre preto). Mesmo caminho da Nuvem (`premium-time-do-mes.cjs`): os raios saem do fundo e vão para
// duas camadas que piscam (`innerBolts` e `overflowBolts`). Diferenças: o neon fica A ~40 px FORA do painel (com o espaço
// escuro entre os dois), a coroa sobe acima da moldura (o espaço de cima é comprimido 14%) e o aglomerado só cabe com
// `overflowWidth` 774/714 (a nuvem de raios chega até a borda direita da arte e esmaece antes dela).
// Saem `premium-time-do-mes.webp`, `premium-time-do-mes-raios-dentro.webp`, `premium-time-do-mes-vaza.webp` e
// `premium-time-do-mes-raios.webp`.
// Uso: node premium-time-do-mes.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "time-do-mes-dono.jpg");

const EDGE = { left: 172, right: 1170, top: 299, bottom: 1683 }; // aro do painel de vidro (medido) = borda da carta
const RADIUS = 55;
const BG = 8;
const TOP_SQUEEZE = 0.86; // a coroa passa da sobra de cima: o que está acima do painel encolhe
const FADE_ART = 210; // a nuvem esmaece suave nos últimos px da arte (ela vem cortada reta na borda direita)
const BW = 714, BH = 1000, OUT_W = 774;
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
const inCrown = (x, y) => x > 520 && x < 830 && y > 130 && y < 310; // coroa de neon (e o vão do tubo em volta dela)
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

  // Raios: o que é branco e brilhante, menos o fio de prata e o tubo de neon (que também são brancos).
  const bolt = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, lum = Math.max(ch[0][i], ch[1][i], ch[2][i]);
      let m = smooth(185, 235, 0.3 * ch[0][i] + 0.59 * ch[1][i] + 0.11 * ch[2][i]); // branco-lilás (o roxo do brilho tem luminância baixa)
      const d = panelDistance(x, y);
      // O clarão do aglomerado (brilho roxo claro em volta dos raios) também acende e apaga: apagado, o fundo fica só com as nuvens
      // (senão sobrava uma mancha roxa encostada no aro). As nuvens têm luminância baixa; o clarão, não.
      const glowIn = d < -8 ? smooth(80, 175, 0.3 * ch[0][i] + 0.59 * ch[1][i] + 0.11 * ch[2][i]) * Math.max(0, 1 - smooth(0.65, 1, Math.hypot((x - 1150) / 440, (y - 960) / 560))) : 0;
      m = Math.max(m, glowIn);
      if (m <= 0) continue;
      if ((d > -8 && d < 8) || (d > 28 && d < 82) || inCrown(x, y)) m = 0; // aro, tubo de neon e coroa
      m *= 1 - smooth(W - 105, W - 2, x); // a arte termina na borda da imagem: os raios apagam antes dela
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
  // Segundo nível, mais grosso: o clarão apagado é um buraco grande e a média fina (raio de ~18 px) não chega ao meio dele.
  const S2 = 8, w8 = Math.ceil(W / S2), h8 = Math.ceil(H / S2), n8 = w8 * h8;
  const sumC8 = [new Float32Array(n8), new Float32Array(n8), new Float32Array(n8)], sumW8 = new Float32Array(n8);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (grow[i] > 0.02 || panelDistance(x, y) > -10) continue; const j = Math.floor(y / S2) * w8 + Math.floor(x / S2); for (let c = 0; c < 3; c++) sumC8[c][j] += ch[c][i]; sumW8[j] += 1; }
  const bw8 = boxBlur(sumW8, w8, h8, 32, 3), bc8 = sumC8.map((a) => boxBlur(a, w8, h8, 32, 3));
  const fill = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  const soft = boxBlur(grow, W, H, 16, 3); // borda bem suave: o buraco do clarão é grande e uma borda dura virava uma silhueta escura
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, j = Math.min(h4 - 1, Math.floor(y / S)) * w4 + Math.min(w4 - 1, Math.floor(x / S)), m = soft[i];
      if (m <= 0) { for (let c = 0; c < 3; c++) fill[c][i] = ch[c][i]; continue; }
      const j8 = Math.min(h8 - 1, Math.floor(y / S2)) * w8 + Math.min(w8 - 1, Math.floor(x / S2)), t = smooth(0.15, 0.6, bw[j]);
      for (let c = 0; c < 3; c++) {
        const fine = bw[j] > 0.005 ? bc[c][j] / bw[j] : ch[c][i], coarse = bw8[j8] > 0.002 ? bc8[c][j8] / bw8[j8] : fine;
        fill[c][i] = ch[c][i] * (1 - m) + (coarse * (1 - t) + fine * t) * m;
      }
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
  await sharp(bg, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premium-time-do-mes.webp`);
  await sharp(inner, { raw: { width: FW, height: FH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-time-do-mes-raios-dentro.webp`);

  // Por fora da janela: moldura e nuvem (sem raios) e, noutra camada, os raios.
  const vaza = Buffer.alloc(OUT_W * BH * 4), raios = Buffer.alloc(OUT_W * BH * 4);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const d = depth(x, y);
      const wd = d < 0 ? 0 : windowDistance(x + 0.5, y + 0.5);
      if (d >= 0 && wd < -3) continue;
      const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
      if (sx >= W - 2 || sy >= H - 2 || sx < 1 || sy < 1) continue;
      const o = (y * OUT_W + x) * 4;
      // No aro e no tubo (fixos), onde o aglomerado passa por cima, a camada fixa usa o trecho limpo da própria moldura (a linha
      // 1500 da arte, abaixo do aglomerado), senão sobrava um clarão no neon quando o raio está apagado.
      const pd0 = panelDistance(sx, sy);
      const frameBand = ((pd0 > -8 && pd0 < 8) || (pd0 > 28 && pd0 < 82)) && sx > EDGE.right - 10 && sy > 330 && sy < 1480;
      const clusterW = frameBand ? smooth(0.03, 0.25, Math.max(0, 1 - smooth(0.65, 1, Math.hypot((sx - 1235) / 175, (sy - 965) / 450)))) : 0;
      const refY = 1520;
      const fr = sFill[0](sx, sy) * (1 - clusterW) + sFill[0](sx, refY) * clusterW, fg = sFill[1](sx, sy) * (1 - clusterW) + sFill[1](sx, refY) * clusterW, fb = sFill[2](sx, sy) * (1 - clusterW) + sFill[2](sx, refY) * clusterW;
      const key = smooth(10, 45, Math.max(Math.abs(fr - BG), Math.abs(fg - BG), Math.abs(fb - BG)));
      // Degradê longo à direita (sem borda de ruído: ficava bruto), menos no tubo e no fio (que são a moldura, fixa).
      const pd = panelDistance(sx, sy);
      const fade = 1 - smooth(W - (pd > 8 && pd < 42 ? 110 : FADE_ART), W - 4, sx);
      // Aglomerado que sai pela direita: a ilustração inteira (raios E o brilho roxo em volta) vai para a camada que pisca, em
      // vez de só o núcleo branco dos raios (que ficava fino e solto). A moldura (aro, tubo, coroa) continua na camada fixa.
      const inFrame = (pd > -8 && pd < 8) || (pd > 28 && pd < 82) || inCrown(sx, sy);
      const cluster = Math.max(0, 1 - smooth(0.65, 1, Math.hypot((sx - 1235) / 175, (sy - 965) / 450)));
      const glowFade = 1 - smooth(W - 105, W - 2, sx); // a arte termina cortada reta na borda direita: some só nos últimos px
      const glow = d < 0 && !inFrame && sx > EDGE.right - 10 ? smooth(18, 120, Math.max(sOrig[0](sx, sy), sOrig[1](sx, sy), sOrig[2](sx, sy))) * cluster * glowFade : 0;
      const alpha = (d < 0 ? key : smooth(-3, -1, wd)) * fade * (1 - glow);
      if (alpha > 0) { vaza[o] = clamp(fr, 0, 255); vaza[o + 1] = clamp(fg, 0, 255); vaza[o + 2] = clamp(fb, 0, 255); vaza[o + 3] = Math.round(alpha * 255); }
      // Os raios passam POR CIMA da moldura: nas faixas do aro e do tubo (fixas na outra camada, com o trecho limpo da linha 1520) entra na
      // camada que pisca tudo o que difere da moldura limpa: o raio inteiro, com o brilho em volta, e não só o núcleo branco.
      const lumHere = 0.3 * sOrig[0](sx, sy) + 0.59 * sOrig[1](sx, sy) + 0.11 * sOrig[2](sx, sy);
      // Só o que é MAIS CLARO que a moldura limpa (o branco do raio): o resto do que difere (o brilho roxo mais escuro sobre o tubo, que
      // na arte vira uma faixa cinza no meio dele) fica com a moldura fixa.
      const lumRef = 0.3 * sOrig[0](sx, refY) + 0.59 * sOrig[1](sx, refY) + 0.11 * sOrig[2](sx, refY);
      const brighter = lumHere - lumRef;
      const overFrame = d < 0 && inFrame && !inCrown(sx, sy) && sx > EDGE.right - 10 && sy > 330 && sy < 1480 ? Math.min(1, smooth(5, 34, brighter) * 1.6) * Math.max(cluster, smooth(0.05, 0.3, cluster)) * glowFade : 0;
      const b = Math.max(clamp(sBolt(sx, sy)) * (d < 0 ? 1 : smooth(-1, 1, wd)), glow, overFrame);
      if (b > 0) { raios[o] = clamp(sOrig[0](sx, sy), 0, 255); raios[o + 1] = clamp(sOrig[1](sx, sy), 0, 255); raios[o + 2] = clamp(sOrig[2](sx, sy), 0, 255); raios[o + 3] = Math.round(b * 255); }
    }
  }
  await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-time-do-mes-vaza.webp`);
  await sharp(raios, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-time-do-mes-raios.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
