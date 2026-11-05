// Carta "Escudo" (2026-11-05): borda de escudo ao estilo do EA FC (topo com entalhe, ombros chanfrados, ponta embaixo e asas de neon),
// a partir da moldura que o dono do app montou (`escudo-referencia-dono.jpg`, 1200 × 1677: fio duplo de ouro pálido e asas de neon
// ciano e azul sobre preto). O script separa a moldura do miolo da arte dele:
//   - acha o fio amarelo e enche o escudo por inundação (o que não alcança a borda da imagem sem cruzar o amarelo);
//   - o miolo (dentro do fio de dentro) fica transparente; o fio é opaco; por fora do escudo, só a luz (alfa pelo brilho);
//   - o contorno do escudo vira um polígono em % da caixa da carta (`lib/card-shield.ts`), que recorta o conteúdo (`clip-path`).
// A caixa da carta (5:7, 1064 × 1490 da arte, de x 68 a 1132 e de y 65 a 1555) cobre o escudo e as asas; a arte de fora ocupa a célula
// toda (a caixa fica nos 84% do meio) e o fundo é o da Safira, girado para o ciano, como a referência de cristal do EA.
// Saem `premium-escudo.webp` (fundo, 600 × 860) e `premium-escudo-vaza.webp` (moldura, 1000 × 1400) em <pasta de saída>
// e `card-shield.ts` com o polígono. Uso: node escudo.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const fs = require("fs");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const dir = __dirname;

const BOX = { x: 68, y: 65, w: 1064, h: 1490 }; // a caixa 5:7 em volta do escudo e das asas, na arte
const CW = 1000, CH = 1400; // a célula de saída; a caixa ocupa os 84% do meio
const S = (CW * 0.84) / BOX.w; // px de saída por px da arte
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

(async () => {
  const { data, info } = await sharp(path.join(dir, "escudo-referencia-dono.jpg")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const yel = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]; if (r > 170 && g > 165 && r - b > 55 && g - b > 45) yel[i] = 1; }
  // O fio amarelo é fechado e o escudo é "estrelado" a partir do centro: por raios, de fora para dentro, o primeiro amarelo é o lado de
  // FORA do fio (o neon é ciano e o miolo da arte do dono tem ouro, que fica mais para dentro); o fio acaba quando passam 6 px sem amarelo.
  const CX = 600, CY = 810, NA = 3600, RMAX = 900, GAP = 6, BAND = 25;
  const rOut = new Float32Array(NA), rIn = new Float32Array(NA);
  for (let k = 0; k < NA; k++) {
    const a = (k / NA) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const at = (r) => { const x = Math.round(CX + ca * r), y = Math.round(CY + sa * r); return x < 0 || y < 0 || x >= W || y >= H ? 0 : yel[y * W + x]; };
    let r = RMAX; while (r > 0 && !at(r)) r--;
    rOut[k] = r;
    let gap = 0; while (r > 0 && gap < GAP) { if (at(r)) gap = 0; else gap++; r--; }
    rIn[k] = Math.max(r + gap, rOut[k] - BAND * 1.2); // o fio mede ~24 px; o ouro do miolo da arte do dono não pode engordá-lo
  }
  // tira os picos de um raio só (borda do JPEG, pepitas de ouro encostadas no fio): mediana e depois média, em volta do círculo
  const med = (arr, w) => { const o = new Float32Array(NA); for (let k = 0; k < NA; k++) { const v = []; for (let j = -w; j <= w; j++) v.push(arr[(k + j + NA) % NA]); v.sort((a, b) => a - b); o[k] = v[w]; } return o; };
  const avg = (arr, w) => { const o = new Float32Array(NA); for (let k = 0; k < NA; k++) { let t = 0; for (let j = -w; j <= w; j++) t += arr[(k + j + NA) % NA]; o[k] = t / (2 * w + 1); } return o; };
  const rOutS = avg(med(rOut, 6), 2), rInS = avg(med(rIn, 6), 2);
  rOut.set(rOutS); rIn.set(rInS);
  const polar = (x, y) => { const dx = x - CX, dy = y - CY; let f = (Math.atan2(dy, dx) / (Math.PI * 2)) * NA; if (f < 0) f += NA; const k0 = Math.floor(f) % NA, k1 = (k0 + 1) % NA, t = f - Math.floor(f); return [Math.hypot(dx, dy), rOut[k0] * (1 - t) + rOut[k1] * t, rIn[k0] * (1 - t) + rIn[k1] * t]; };

  // contorno do escudo (polígono do clip): 3 px da arte por dentro do fio de fora
  const N = 220, INSET = 3, pts = [];
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2 - Math.PI / 2, idx = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * NA) % NA;
    const r = rOut[idx] - INSET;
    const px = ((CX + Math.cos(a) * r - BOX.x) / BOX.w) * 100, py = ((CY + Math.sin(a) * r - BOX.y) / BOX.h) * 100;
    pts.push(`${px.toFixed(2)}% ${py.toFixed(2)}%`);
  }
  fs.writeFileSync(path.join(OUT, "card-shield.ts"), `/**\n * Contorno do escudo da carta Escudo (em % da caixa da carta), para o \`clip-path\` do conteúdo.\n * Gerado por \`docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/escudo.cjs\`: não edite à mão.\n */\nexport const SHIELD_CLIP = "polygon(${pts.join(", ")})";\n`);

  // moldura: fio opaco, miolo transparente, e por fora só a luz das asas
  const bilinear = (buf, ch, fx, fy, k) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (x, y) => buf[(clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)) * ch + k];
    return at(x0, y0) * (1 - tx) * (1 - ty) + at(x0 + 1, y0) * tx * (1 - ty) + at(x0, y0 + 1) * (1 - tx) * ty + at(x0 + 1, y0 + 1) * tx * ty;
  };
  const frame = Buffer.alloc(CW * CH * 4);
  const X0 = (CW - CW * 0.84) / 2, Y0 = (CH - CH * 0.84) / 2;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const rx = BOX.x + (x + 0.5 - X0) / S, ry = BOX.y + (y + 0.5 - Y0) / S;
    if (rx < 1 || ry < 1 || rx >= W - 2 || ry >= H - 2) continue;
    const c = [0, 1, 2].map((k) => bilinear(data, 3, rx - 0.5, ry - 0.5, k));
    const [rr, ro, ri] = polar(rx, ry);
    const s = clamp((ro - rr) / 1.6 + 0.5), core = clamp((ri - rr) / 1.6 + 0.5);
    const lum = smooth(14, 120, Math.max(c[0], c[1], c[2]));
    const a = s * (1 - core) + (1 - s) * lum;
    if (a > 0.004) { const o = (y * CW + x) * 4; frame[o] = clamp(c[0], 0, 255); frame[o + 1] = clamp(c[1], 0, 255); frame[o + 2] = clamp(c[2], 0, 255); frame[o + 3] = Math.round(a * 255); }
  }
  await sharp(frame, { raw: { width: CW, height: CH, channels: 4 } }).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(OUT, "premium-escudo-vaza.webp"));

  // fundo: o da Safira, sem a fina borda dourada, girado para o ciano
  const base = path.resolve(process.argv[3], "public/cartas/fundos/premium-safira.webp");
  await sharp(base).extract({ left: 14, top: 14, width: 572, height: 832 }).resize(600, 860, { fit: "fill" }).modulate({ hue: -28, saturation: 1.15, brightness: 1.08 }).webp({ quality: 90 }).toFile(path.join(OUT, "premium-escudo.webp"));
  console.log("ok", pts.length);
})().catch((e) => { console.error(e); process.exit(1); });
