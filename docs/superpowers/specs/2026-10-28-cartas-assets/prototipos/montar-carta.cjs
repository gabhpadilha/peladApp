// Montador do kit de carta (2026-11-05): pega as peças do Gemini feitas no gabarito 5:7 (`gabarito-carta-5x7.png`) e gera as camadas do app,
// sem recortar à mão. Padrão fixo (a identidade): caixa da carta de 840 × 1176 na célula 1000 × 1400 (84% do meio), janela do conteúdo 64,5 px
// para dentro da caixa (`window: "ring"`, `windowInset` 7,68% e 5,48%, `windowRadius` 4,94).
//   fundo:  arte da carta inteira sobre preto → `premium-<nome>.webp` (só a janela, 600 × 860)
//   borda:  moldura sobre preto, miolo preto    → `premium-<nome>-vaza.webp` (1000 × 1400): o miolo preto (achado por inundação a partir
//           do centro) fica transparente, o que o brilho da moldura mostra fica opaco por cima de um fundo escuro da silhueta (os vãos
//           escuros do metal não viram buracos) e por fora só a luz (alfa pelo brilho).
// Moldura fina com enfeites (2026-11-05): com `holeRect` (x0,y0,x1,y1,raio do lado de dentro da faixa, em px da arte) tudo o que cai por dentro
// da faixa vira transparente, mesmo enfeite: "os enfeites ficam sempre por fora, para não atrapalhar o conteúdo". Com `artInset` (px da célula),
// o fundo sai como a arte inteira da caixa menos essa faixa fina (`premium-<nome>.webp`, 700 × 1004), para a arte chegar até a moldura.
// Gemas (2026-11-05, Rubi e Ícone com a moldura da Maré): `GEM="matiz,saturação,luz"` na variável de ambiente troca a cor dos cristais cravejados
// (os pixels mais azuis que vermelhos; o ouro fica); fundo "-" pula o fundo.
// Peças escuras (pano, ferro) viravam translúcidas pelo brilho: `OPAQUE="rampa baixa,rampa alta,limiar da silhueta"` (padrão 14,110,55; para o Destino 12,45,30) deixa opacos os pixels acima do preto.
// Uso: node montar-carta.cjs <nome> <fundo> <borda> <pasta de saída> <raiz do repo> <x0,y0,x1,y1 da caixa da carta nas imagens> [holeRect] [artInset]
const path = require("path");
const sharp = require(path.resolve(process.argv[6], "node_modules/sharp"));
const [NAME, FUNDO, BORDA, OUT, , ROOT_UNUSED] = [process.argv[2], process.argv[3], process.argv[4], process.argv[5], process.argv[6], 0];
const [BX0, BY0, BX1, BY1] = process.argv[7].split(",").map(Number); // caixa da carta (lado de fora da moldura), em px da arte
const HOLE = process.argv[8] && process.argv[8] !== "-" ? process.argv[8].split(",").map(Number) : null;
const ART_INSET = process.argv[9] ? Number(process.argv[9]) : null;
const [FX0, FY0, FX1, FY1] = (process.argv[10] || process.argv[7]).split(",").map(Number); // caixa da carta na imagem do FUNDO (se diferir da borda)
const CELL = { w: 1000, h: 1400 }, BOX = { x: 80, y: 112, w: 840, h: 1176 }, WIN = 64.5;
const [RLO, RHI, SIL] = (process.env.OPAQUE || "14,110,55").split(",").map(Number);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
const one = async (buf, w, h, fn) => (await fn(sharp(buf, { raw: { width: w, height: h, channels: 1 } })).extractChannel(0).raw().toBuffer());

(async () => {
  const sx = BOX.w / (BX1 - BX0), sy = BOX.h / (BY1 - BY0);
  // ---- fundo: a janela da caixa (pulado com "-")
  const fsx = FUNDO === "-" ? 1 : BOX.w / (FX1 - FX0), fsy = FUNDO === "-" ? 1 : BOX.h / (FY1 - FY0);
  const wl = FX0 + WIN / fsx, wt = FY0 + WIN / fsy, ww = (FX1 - FX0) - 2 * WIN / fsx, wh = (FY1 - FY0) - 2 * WIN / fsy;
  if (FUNDO === "-") {
    // sem fundo novo
  } else if (ART_INSET !== null) {
    const al = FX0 + ART_INSET / fsx, at = FY0 + ART_INSET / fsy, aw = (FX1 - FX0) - 2 * ART_INSET / fsx, ah = (FY1 - FY0) - 2 * ART_INSET / fsy;
    await sharp(FUNDO).extract({ left: Math.round(al), top: Math.round(at), width: Math.round(aw), height: Math.round(ah) }).resize(700, 1004, { fit: "fill" }).webp({ quality: 88 }).toFile(path.join(OUT, `premium-${NAME}.webp`));
  } else {
    await sharp(FUNDO).extract({ left: Math.round(wl), top: Math.round(wt), width: Math.round(ww), height: Math.round(wh) }).resize(600, 860, { fit: "fill" }).webp({ quality: 88 }).toFile(path.join(OUT, `premium-${NAME}.webp`));
  }

  // ---- borda
  const { data, info } = await sharp(BORDA).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  if (process.env.GEM) { // cristais: pixels mais azuis que vermelhos (o ouro é r > g > b)
    const [gh, gs, gl] = process.env.GEM.split(",").map(Number);
    for (let i = 0; i < N; i++) {
      const r = data[i * 3] / 255, g = data[i * 3 + 1] / 255, b = data[i * 3 + 2] / 255;
      if (b <= r + 0.05) continue;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      const S = Math.min(1, sat * gs), L = Math.min(1, l * gl), H = gh / 360;
      const q = L < 0.5 ? L * (1 + S) : L + S - L * S, pp = 2 * L - q;
      const hue = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
      data[i * 3] = hue(H + 1 / 3) * 255; data[i * 3 + 1] = hue(H) * 255; data[i * 3 + 2] = hue(H - 1 / 3) * 255;
    }
  }
  const lum = new Uint8Array(N); for (let i = 0; i < N; i++) lum[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  // miolo: o preto ligado ao centro da caixa
  const hole = new Uint8Array(N), st = [];
  const cx = Math.round((BX0 + BX1) / 2), cy = Math.round((BY0 + BY1) / 2);
  const push = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (hole[i] || lum[i] > 28) return; hole[i] = 1; st.push(i); };
  push(cx, cy);
  while (st.length) { const i = st.pop(), x = i % W, y = (i / W) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  // silhueta do metal: o que brilha, fechado (os vãos escuros do relevo ficam dentro)
  if (HOLE) { // miolo = retângulo arredondado do lado de dentro da faixa (enfeites que entram nele somem)
    const [hx0, hy0, hx1, hy1, hr] = HOLE;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const qx = Math.max(Math.abs(x - (hx0 + hx1) / 2) - ((hx1 - hx0) / 2 - hr), 0), qy = Math.max(Math.abs(y - (hy0 + hy1) / 2) - ((hy1 - hy0) / 2 - hr), 0);
      hole[y * W + x] = Math.hypot(qx, qy) <= hr ? 1 : 0;
    }
  }
  const metal = Buffer.alloc(N); for (let i = 0; i < N; i++) metal[i] = lum[i] > SIL && !hole[i] ? 255 : 0;
  const sil = await one(metal, W, H, (i) => i.blur(10).threshold(60).blur(10).threshold(150));
  const holeSoft = await one(Buffer.from(hole.map((v) => (v ? 255 : 0))), W, H, (i) => i.blur(1.4));
  const silSoft = await one(sil, W, H, (i) => i.blur(1.2));
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const l = lum[i], s = silSoft[i] / 255, hsoft = holeSoft[i] / 255;
    const glow = smooth(RLO, RHI, l);
    const x = i % W, y = (i / W) | 0;
    const edge = smooth(0, 24, x) * smooth(0, 24, W - 1 - x) * smooth(0, 24, y) * smooth(0, 24, H - 1 - y); // o que a arte do Gemini corta na borda da imagem (pano, folhas) esmaece, sem corte reto
    const a = Math.max(glow, s) * (1 - hsoft) * edge;
    // sobre a silhueta, o relevo escuro do metal fica num marrom-ouro escuro em vez de furar
    const under = s * (1 - glow);
    rgba[i * 4] = data[i * 3] * (1 - under) + 26 * under;
    rgba[i * 4 + 1] = data[i * 3 + 1] * (1 - under) + 19 * under;
    rgba[i * 4 + 2] = data[i * 3 + 2] * (1 - under) + 6 * under;
    rgba[i * 4 + 3] = Math.round(a * 255);
  }
  const tw = Math.round(W * sx), th = Math.round(H * sy);
  const placed = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).resize(tw, th, { kernel: "lanczos3" }).png().toBuffer();
  const left = Math.round(BOX.x - BX0 * sx), top = Math.round(BOX.y - BY0 * sy);
  const base = sharp({ create: { width: CELL.w, height: CELL.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  // recorta o que cair fora da célula antes de compor
  const cl = Math.max(0, -left), ct = Math.max(0, -top), cw = Math.min(tw - cl, CELL.w - Math.max(0, left)), ch = Math.min(th - ct, CELL.h - Math.max(0, top));
  const piece = await sharp(placed).extract({ left: cl, top: ct, width: cw, height: ch }).png().toBuffer();
  await base.composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }]).webp({ quality: 88, alphaQuality: 95 }).toFile(path.join(OUT, `premium-${NAME}-vaza.webp`));
  console.log("ok", { sx: sx.toFixed(4), sy: sy.toFixed(4), left, top });
})().catch((e) => { console.error(e); process.exit(1); });
