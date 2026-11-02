// Melhor Jogador fora de evento, versão em camadas (2026-11-02): o dono do app pediu as três peças separadas ao Gemini,
// que vieram na mesma proporção 2:3 e com a carta na mesma posição (a de 1342 × 2000 e duas de 687 × 1024):
//   `craque-fogo-fundo-dono.jpg`  o sol com circuitos dourados num cartão com contorno branco;
//   `craque-fogo-borda-dono.jpg`  o tubo de neon dourado com fogo, o fio fino de dentro e a estrela do topo (fundo preto);
//   `craque-fogo-render-dono.jpg` a coroa em chamas, com faíscas, que passa da carta pela direita (fundo preto).
// Sem separar nem preencher nada: a ordem é fundo → borda → render → foto e informações. A coroa (render) fica POR CIMA da borda e
// a tapa (alfa próprio, pelo brilho: o preto sai, o metal e as chamas ficam). O CONTEÚDO da carta (foto, nome e estatísticas) fica
// dentro do fio fino de dentro da borda (`window: "inner"` na roupa: 5,8% da largura e 4,2% da altura para dentro); a borda e a faixa
// entre ela e o conteúdo (com o fundo por baixo) são a camada por cima (`-vaza`), e só o render passa para fora da carta.
// Sem animação (o dono achou horrível a coroa acendendo). Saem `premio-craque-fogo.webp` (a janela do conteúdo, 600 × 871, com a
// parte da coroa que cai dentro) e `premio-craque-fogo-vaza.webp` (a borda, a faixa e a coroa por fora, 824 × 1000;
// `overflowWidth` 824/714 na roupa, porque a coroa sai uns 17% da largura da carta pela direita).
// Uso: node premio-craque-fogo.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const dir = __dirname;

const W = 1342, H = 2000;
// Borda do cartão (centro do tubo de fora = borda do contorno branco do fundo), medida em px da arte de 1342 × 2000.
const EDGE = { left: 173, right: 1169, top: 302, bottom: 1697 };
const RADIUS = 80; // raio do canto do cartão
const IX = 0.058, IY = 0.042; // a janela do conteúdo: por dentro do fio fino da borda (o lado de dentro dele fica a 5,6% e 4,1%)
const BW = 714, BH = 1000, OUT_W = 824;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX;
const WIN = { l: CX0 + CW * IX, t: CY0 + CH * IY, r: CX0 + CW * (1 - IX), b: CY0 + CH * (1 - IY) };
const WIN_RADIUS = CW * 0.036;
const FW = 600, FH = 871;

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

const load = async (name) => (await sharp(path.join(dir, name)).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer());
const screen = (a, b) => 255 - ((255 - a) * (255 - b)) / 255;
// Alfa da coroa: pelo brilho (o preto sai; o que tem corpo, como o metal e as chamas, fica). A fumaça cinza (pouca cor) sai, menos o
// clarão branco do centro, e o rastro de faíscas e chamas de baixo também: o dono pediu só a coroa (a fumaça deixava o corte do ombro
// à mostra). A coroa e as chamas dela vão até ~65% da altura da arte.
const renderAlpha = (r, g, b, sy, sx) => {
  const mx = Math.max(r, g, b), sat = mx > 0 ? (mx - Math.min(r, g, b)) / mx : 0;
  // Só o que é quente (r bem acima de b: as chamas, o metal e as faíscas) e tem corpo (a neblina escura de fumaça fica de fora).
  return smooth(45, 140, mx) * Math.max(smooth(0.32, 0.55, sat), smooth(205, 240, mx)) * Math.max(smooth(18, 60, r - b), smooth(205, 240, mx)) * (1 - smooth(0.64 * H, 0.72 * H, sy)) * (1 - smooth(1105, 1175, sy) * smooth(1020, 1080, sx)); // e a fumaça cinza de baixo à direita da coroa
};
// O render é a coroa sobre PRETO (já "pré-multiplicada" pelo brilho): ao tirar a fumaça pelo alfa, a cor dele tem de sair junto, na
// mesma proporção, senão o tom frio da fumaça vazava como pontinhos azulados. `keepRatio` = quanto do pixel sobrou depois da limpeza.
const keepRatio = (r, g, b, a) => Math.min(1, a / Math.max(smooth(10, 80, Math.max(r, g, b)), 0.02));
// A estrela do topo (2,4% da largura de cada lado do eixo): inteira na camada de cima, não pela metade na janela.
const inStar = (sx, sy) => sx > 590 && sx < 755 && sy > 292 && sy < 425;

(async () => {
  const [bg, frame, render] = await Promise.all([load("craque-fogo-fundo-dono.jpg"), load("craque-fogo-borda-dono.jpg"), load("craque-fogo-render-dono.jpg")]);
  const sample = (buf, fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (x, y, k) => buf[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 3 + k];
    return [0, 1, 2].map((k) => at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  };

  // A janela do conteúdo: o fundo com a parte da coroa que cai dentro, por cima.
  const w = EDGE.right - EDGE.left, h = EDGE.bottom - EDGE.top;
  const win = { left: EDGE.left + w * IX, top: EDGE.top + h * IY, width: w * (1 - 2 * IX), height: h * (1 - 2 * IY) };
  const bgOut = Buffer.alloc(FW * FH * 3);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const fx = win.left + ((x + 0.5) / FW) * win.width, fy = win.top + ((y + 0.5) / FH) * win.height;
    const b = sample(bg, fx, fy), r = sample(render, fx, fy), a = renderAlpha(r[0], r[1], r[2], fy, fx);
    const o = (y * FW + x) * 3;
    const kr = keepRatio(r[0], r[1], r[2], a);
    for (let c = 0; c < 3; c++) bgOut[o + c] = clamp(r[c] * kr + b[c] * (1 - a), 0, 255);
  }
  await sharp(bgOut, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premio-craque-fogo.webp`);

  // Por fora da janela: dentro do cartão, o fundo por baixo da borda (opaco); fora do cartão, só a borda e a coroa, com o preto virando
  // transparência pelo brilho. A coroa fica sempre por cima (alfa próprio), tapando a borda.
  const vaza = Buffer.alloc(OUT_W * BH * 4);
  for (let y = 0; y < BH; y++) {
    for (let x = 0; x < OUT_W; x++) {
      const d = depth(x, y);
      const wd = d < 0 ? 0 : windowDistance(x + 0.5, y + 0.5);
      const [sx, sy] = mapPoint(x + 0.5, y + 0.5);
      if (sx >= W - 2 || sy >= H - 2 || sx < 1 || sy < 1) continue;
      if (d >= 0 && wd < -3) {
        // Dentro da janela só a estrela (e o neon dela), por cima do nome: a janela cobria metade dela.
        if (!inStar(sx, sy)) continue;
        const fs = sample(frame, sx, sy), a = clamp(Math.max(fs[0], fs[1], fs[2]) / 255 * 1.25) * (1 - smooth(0, 7, Math.min(Math.abs(sx - 590), Math.abs(sx - 755), Math.abs(sy - 292), Math.abs(sy - 425))) * 0 );
        const edge = Math.min(smooth(590, 606, sx), 1 - smooth(739, 755, sx), smooth(292, 306, sy), 1 - smooth(411, 425, sy));
        if (a * edge <= 0.004) continue;
        const o2 = (y * OUT_W + x) * 4, k2 = 1 / Math.max(a, 0.05);
        vaza[o2] = clamp(fs[0] * k2, 0, 255); vaza[o2 + 1] = clamp(fs[1] * k2, 0, 255); vaza[o2 + 2] = clamp(fs[2] * k2, 0, 255); vaza[o2 + 3] = Math.round(a * edge * 255);
        continue;
      }
      const f = sample(frame, sx, sy), r = sample(render, sx, sy);
      const aR = renderAlpha(r[0], r[1], r[2], sy, sx) * (1 - smooth(W - 90, W - 2, sx));
      const edgeFade = smooth(0, 26, x) * smooth(0, 26, y) * smooth(0, 26, BH - y);
      const o = (y * OUT_W + x) * 4;
      let premult, alpha;
      if (d >= 0) {
        const b = sample(bg, sx, sy);
        const kr = keepRatio(r[0], r[1], r[2], aR);
        premult = [0, 1, 2].map((c) => r[c] * kr + screen(b[c], f[c]) * (1 - aR));
        alpha = smooth(-3, -1, wd);
        if (inStar(sx, sy)) {
          // A estrela vai por cima da camada de baixo, com o brilho dela e a transparência dela, e não é coberta pela faixa de
          // transição da janela (2 px parcialmente escuros que cortavam a estrela). Fora da estrela nada muda.
          const a = clamp(Math.max(f[0], f[1], f[2]) / 255 * 1.25);
          premult = [0, 1, 2].map((c) => clamp(f[c] + premult[c] * (1 - a), 0, 255));
          alpha = Math.max(alpha, a);
        }
      } else {
        const aF = clamp(Math.max(f[0], f[1], f[2]) / 255 * 1.1);
        const kr = keepRatio(r[0], r[1], r[2], aR);
        premult = [0, 1, 2].map((c) => r[c] * kr + f[c] * (1 - aR));
        alpha = clamp(aR + aF * (1 - aR)) * edgeFade;
      }
      if (alpha <= 0.004) continue;
      const k = d >= 0 ? 1 : 1 / Math.max(alpha / edgeFade, 0.05);
      vaza[o] = clamp(premult[0] * k, 0, 255); vaza[o + 1] = clamp(premult[1] * k, 0, 255); vaza[o + 2] = clamp(premult[2] * k, 0, 255); vaza[o + 3] = Math.round(alpha * 255);
    }
  }
  await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premio-craque-fogo-vaza.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
