// Lenda do Trovão, versão 4 (2026-11-01): `lenda-v4-leonardo-dono.jpg` (2000 × 2000, gerada no Leonardo/Dreamina
// pelo dono do app: céu azul-noite liso, moldura de ouro envelhecido com faixa azul-marinho e neon ciano por dentro
// do fio, filigranas nos cantos, raio dourado no topo e uma nuvem de tempestade com raios que passa por cima da
// moldura pelo lado ESQUERDO). Mesmo caminho da v3 (`skin-lenda-v3.cjs`): raios separados em `innerBolts` e
// `overflowBolts`, filigranas e raio do topo na camada de fora. Diferenças: o neon fica DENTRO do fio de ouro (a
// borda da carta é o fio de dentro; a faixa e o fio de fora vão na sobra), a nuvem sai ~350 px da arte (a distância
// fora da moldura é comprimida de forma suave para caber em `LEFT_EXT`), e a marca do gerador (canto de baixo) fica fora.
// Saem `skin-lenda.webp`, `skin-lenda-raios-dentro.webp`, `skin-lenda-vaza.webp` e `skin-lenda-raios.webp`.
// Uso: node skin-lenda-v4.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "lenda-v4-leonardo-dono.jpg");

const EDGE = { left: 507, right: 1494, top: 265, bottom: 1741 }; // borda de fora do fio de ouro de DENTRO (medida)
const RADIUS = 45;
const BG = 0;
const BAND_ART = 42; // faixa azul-marinho e fio de fora (px da arte), que não encolhem
const L_WARP = 450; // o que passa da faixa (a nuvem) encolhe suave: dist_saída = e / (1 + e / L)
const BW = 714, BH = 1000, LEFT_EXT = 85, OUT_W = LEFT_EXT + BW; // a nuvem sai pela esquerda
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
const WIN = { l: CX0 + CW * 0.017, t: CY0 + CH * 0.0121, r: CX0 + CW * 0.983, b: CY0 + CH * 0.9879 };
const WIN_RADIUS = CW * 0.073;
const FW = 600, FH = 860;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
function mapPoint(x, y) {
  let u = EDGE.left + (x - CX0) / SX;
  const v = EDGE.top + (y - CY0) / SY;
  const edge = EDGE.left - BAND_ART;
  if (u < edge) { const q = edge - u; u = edge - q / Math.max(0.04, 1 - q / L_WARP); }
  return [u, v];
}
const inCorner = (sx, sy, pad) => Math.min(Math.abs(sx - EDGE.left), Math.abs(sx - EDGE.right)) < pad && Math.min(Math.abs(sy - EDGE.top), Math.abs(sy - EDGE.bottom)) < pad;
const onEmblem = (sx, sy) => sx > 840 && sx < 1170 && sy > 215 && sy < 440; // o raio do topo e os arremates do fio
// Ouro ou cobre-rosado das filigranas (o azul da arte e o neon ciano têm b > r): o de baixo é mais pálido que o de cima.
const gold = (r, g, b) => smooth(0.03, 0.14, (r - b) / 255) * smooth(45, 90, 0.3 * r + 0.59 * g + 0.11 * b);
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

  // Linhas em que a nuvem passa por cima da moldura à esquerda: ali o painel de dentro está coberto pela nuvem (não há fio
  // para apagar, e apagar a faixa recortaria a nuvem).
  const cloudRow = new Uint8Array(H);
  for (let y = 0; y < H; y++) { for (let x = 250; x < 430; x += 2) { const i = y * W + x; if (Math.max(ch[0][i], ch[1][i], ch[2][i]) > 28) { cloudRow[y] = 1; break; } } }
  const cloudNear = new Uint8Array(H);
  for (let y = 0; y < H; y++) if (cloudRow[y]) for (let k = -14; k <= 14; k++) if (y + k >= 0 && y + k < H) cloudNear[y + k] = 1;
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
      // O fio de ouro fino de dentro (contas) a ~27 px da borda também brilha e seria tomado por raio: fora da nuvem, a faixa
      // de 9 a 62 px para dentro da borda não tem raio (os de dentro estão mais ao centro).
      const beaded = d > -62 && d < -9 && !(x < EDGE.left + 150 && cloudNear[y]);
      if ((d > -16 && d < 46) || beaded || inCorner(x, y, 240) || onEmblem(x, y) || y > 1860) m = 0; // neon, fios, faixa, filigranas, raio do topo e marca do gerador
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

  // Filigranas dos cantos (e o miolo preto delas): apagadas do fundo. A região é preenchida por interpolação suave
  // (equação de Laplace, relaxando numa grade de 4 px): o brilho azul que entra pelas bordas continua para dentro, sem
  // deixar um retângulo mais escuro. O fio do painel (~28 px da borda) e o neon ficam.
  const CORNER_CUT = -31.5, CS = 4;
  // O raio dourado do topo e os arremates do fio (ouro forte), com uma folga de 6 px para o contorno claro: ficam intactos.
  const goldCore = new Float32Array(N);
  for (let y = 215; y < 440; y++) for (let x = 840; x < 1170; x++) { const i = y * W + x; if (ch[0][i] > 150 && ch[1][i] > 110 && ch[2][i] < 110 && ch[0][i] > ch[2][i] + 60) goldCore[i] = 1; }
  const goldKeep = dilate(goldCore, W, H, 6);
  const cornerHard = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = panelDistance(x, y);
    // As filigranas e, bem no cantinho (130 px), também a pontinha de folha onde os dois fios do painel se encontram (130 px: os fios recomeçam depois).
    // Também o painel de dentro em toda a volta (o fio fino de ouro a ~28 px da borda e a segunda linha de neon, a 12 a 16 px): era a borda em
    // que os enfeites se apoiavam, e sem eles sobrava um fio solto.
    if ((inCorner(x, y, 215) && d < CORNER_CUT) || (inCorner(x, y, 130) && d < -19) || (d < -9 && d > -62 && !(x < EDGE.left + 150 && cloudNear[y]) && !(goldKeep[y * W + x] > 0))) cornerHard[y * W + x] = 1;
  }
  const cornerSoft = boxBlur(cornerHard, W, H, 7, 2); // borda suave: sem degrau onde acaba a área apagada
  const cw = Math.ceil(W / CS), chh = Math.ceil(H / CS), cn = cw * chh;
  const cSum = [new Float32Array(cn), new Float32Array(cn), new Float32Array(cn)], cValid = new Float32Array(cn), cCorner = new Float32Array(cn);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, j = Math.floor(y / CS) * cw + Math.floor(x / CS);
    if (cornerHard[i] > 0) cCorner[j]++;
    else if (cornerSoft[i] < 0.02 && grow[i] < 0.02 && panelDistance(x, y) < -70) { cValid[j]++; for (let c = 0; c < 3; c++) cSum[c][j] += ch[c][i]; }
  }
  // 2 = a preencher, 1 = conhecida (azul-noite de dentro do painel), 0 = ignorada (moldura, fora)
  const cType = new Uint8Array(cn), cVal = [new Float32Array(cn), new Float32Array(cn), new Float32Array(cn)];
  for (let j = 0; j < cn; j++) {
    if (cCorner[j] >= 4) cType[j] = 2;
    else if (cValid[j] >= 4) { cType[j] = 1; for (let c = 0; c < 3; c++) cVal[c][j] = cSum[c][j] / cValid[j]; }
  }
  for (let j = 0; j < cn; j++) if (cType[j] === 2) { // chute inicial: a média das conhecidas à volta
    const cx = j % cw, cy = Math.floor(j / cw); let acc = [0, 0, 0], n = 0;
    for (let dy = -30; dy <= 30; dy += 3) for (let dx = -30; dx <= 30; dx += 3) { const xx = cx + dx, yy = cy + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= chh) continue; const k = yy * cw + xx; if (cType[k] === 1) { for (let c = 0; c < 3; c++) acc[c] += cVal[c][k]; n++; } }
    for (let c = 0; c < 3; c++) cVal[c][j] = n ? acc[c] / n : 20;
  }
  for (let it = 0; it < 500; it++) for (let j = 0; j < cn; j++) {
    if (cType[j] !== 2) continue;
    const cx = j % cw, cy = Math.floor(j / cw); let acc = [0, 0, 0], n = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = cx + dx, yy = cy + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= chh) continue; const k = yy * cw + xx; if (cType[k] === 0) continue; for (let c = 0; c < 3; c++) acc[c] += cVal[c][k]; n++; }
    if (n) for (let c = 0; c < 3; c++) cVal[c][j] = acc[c] / n;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = cornerSoft[i];
    if (m <= 0.001) continue;
    const gx = (x + 0.5) / CS - 0.5, gy = (y + 0.5) / CS - 0.5, x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
    let acc = [0, 0, 0], wsum = 0;
    for (const [ox, oy, wgt] of [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)], [0, 1, (1 - tx) * ty], [1, 1, tx * ty]]) {
      const xx = x0 + ox, yy = y0 + oy; if (xx < 0 || yy < 0 || xx >= cw || yy >= chh) continue;
      const k = yy * cw + xx; if (cType[k] === 0) continue;
      for (let c = 0; c < 3; c++) acc[c] += cVal[c][k] * wgt; wsum += wgt;
    }
    if (wsum > 0.05) for (let c = 0; c < 3; c++) fill[c][i] = fill[c][i] * (1 - m) + (acc[c] / wsum) * m;
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
      // No topo, a segunda linha de neon (e as pontas do arremate do raio) fica logo abaixo da borda da janela:
      // a camada de fora desce mais 14 px ali (onde só há a barra do nome, nunca a foto) e some aos poucos.
      const ext = 14 * (1 - smooth(CY0 + 24, CY0 + 44, y)), inner = -3 - ext;
      if (d >= 0 && (wd < inner || (onEmblem(sx, sy) && wd < inner + 2))) {
        // Dentro da janela só ficam as filigranas dos cantos e o raio do topo (ouro), por cima da barra do nome e das
        // estatísticas, como parte da moldura. O resto da janela é o fundo.
        // Só o raio do topo (e os arremates do fio). As filigranas dos cantos saíram da arte (o dono pediu só a borda).
        if (!onEmblem(sx, sy)) continue;
        const a = gold(sOrig[0](sx, sy), sOrig[1](sx, sy), sOrig[2](sx, sy));
        if (a <= 0) continue;
        for (let c = 0; c < 3; c++) vaza[o + c] = clamp(sOrig[c](sx, sy), 0, 255);
        vaza[o + 3] = Math.round(a * 255);
        continue;
      }
      const fr = sFill[0](sx, sy), fg = sFill[1](sx, sy), fb = sFill[2](sx, sy);
      const key = smooth(10, 45, Math.max(Math.abs(fr - BG), Math.abs(fg - BG), Math.abs(fb - BG)));
      const alpha = (d < 0 ? key : smooth(inner, inner + 2 + ext * 0.6, wd)) * smooth(0, 24, x) * (sy > 1860 ? 0 : 1); // borda de fora da imagem e marca do gerador
      if (alpha > 0) { vaza[o] = clamp(fr, 0, 255); vaza[o + 1] = clamp(fg, 0, 255); vaza[o + 2] = clamp(fb, 0, 255); vaza[o + 3] = Math.round(alpha * 255); }
      const b = clamp(sBolt(sx, sy)) * (d < 0 ? 1 : smooth(-1, 1, wd)) * smooth(0, 24, x);
      if (b > 0) { raios[o] = clamp(sOrig[0](sx, sy), 0, 255); raios[o + 1] = clamp(sOrig[1](sx, sy), 0, 255); raios[o + 2] = clamp(sOrig[2](sx, sy), 0, 255); raios[o + 3] = Math.round(b * 255); }
    }
  }
  await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-vaza.webp`);
  await sharp(raios, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/skin-lenda-raios.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
