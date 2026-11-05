// Carta "Voltagem" (2026-11-05): só o ESTILO da borda que o dono do app montou (`voltagem-referencia-dono.jpg`) no nosso retângulo
// arredondado: fio duplo de ouro pálido por dentro e, por fora, linhas de neon (ciano no topo, azul embaixo) com o degrau diagonal onde
// a linha se divide em duas nos lados. Nada de escudo, ponta ou chanfro. A moldura é desenhada em SVG e assada em WebP (brilho incluso,
// sem `filter` na carta). O miolo fica transparente (janela `ring`); a faixa entre o neon e o fio é um painel azul-noite opaco.
// Saem `premium-voltagem.webp` (fundo, os cristais da Safira girados para o ciano) e `premium-voltagem-vaza.webp` (moldura, 1000 × 1400,
// com a caixa da carta nos 84% do meio: 840 × 1176). Uso: node voltagem.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

const CW = 1000, CH = 1400, BW = 840, BH = 1176, OX = 80, OY = 112;
const R = (d) => 40 + (66 - d); // raios concêntricos: 40 na borda de dentro do fio
const rr = (d, extra = 0) => { // retângulo arredondado a `d` px da borda da caixa, como subcaminho
  const x = d, y = d, w = BW - 2 * d, h = BH - 2 * d, r = R(d) + extra;
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`;
};
const Y1 = 700, STEP = 22; // onde a linha de neon se divide
const IN = 31, OUT_ = 13; // recuos da linha de dentro e da de fora
const rIn = R(IN), rOut = R(OUT_);
// linha de dentro, parte de cima: do degrau, subindo, pelo topo e descendo até o degrau do outro lado
const topLine = `M${IN},${Y1}V${IN + rIn}A${rIn},${rIn} 0 0 1 ${IN + rIn},${IN}H${BW - IN - rIn}A${rIn},${rIn} 0 0 1 ${BW - IN},${IN + rIn}V${Y1}`;
// linha de fora, parte de baixo: do degrau (diagonal para fora), descendo, pelo fundo e subindo até o outro degrau
const botOuter = `M${IN},${Y1}L${OUT_},${Y1 + STEP}V${BH - OUT_ - rOut}A${rOut},${rOut} 0 0 0 ${OUT_ + rOut},${BH - OUT_}H${BW - OUT_ - rOut}A${rOut},${rOut} 0 0 0 ${BW - OUT_},${BH - OUT_ - rOut}V${Y1 + STEP}L${BW - IN},${Y1}`;
// linha de dentro, parte de baixo: recomeça logo depois do degrau e dá a volta embaixo
const botInner = `M${IN},${Y1 + 42}V${BH - IN - rIn}A${rIn},${rIn} 0 0 0 ${IN + rIn},${BH - IN}H${BW - IN - rIn}A${rIn},${rIn} 0 0 0 ${BW - IN},${BH - IN - rIn}V${Y1 + 42}`;
const stubY0 = Y1 - 230;
const stub = (side) => { const x = side === "l" ? OUT_ : BW - OUT_, s = side === "l" ? 1 : -1; return `M${x - 3.2},${stubY0 + 7 * s * 0 + 8}L${x + 3.2},${stubY0}V${Y1 - 22}L${x - 3.2},${Y1 - 14}Z`; };

const W = 6.5;
const lines = (extra) => `
  <g fill="none" stroke-linejoin="round" ${extra}>
    <path d="${topLine}" stroke-width="W_"/><path d="${botOuter}" stroke-width="W_"/><path d="${botInner}" stroke-width="W_"/>
  </g>
  <g ${extra.replace("stroke", "fill")} stroke="none"><path d="${stub("l")}"/><path d="${stub("r")}"/></g>`.replace(/W_/g, String(W));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">
<defs>
  <linearGradient id="neon" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${BH}"><stop offset="0" stop-color="#5ff2d6"/><stop offset=".55" stop-color="#46c9ff"/><stop offset="1" stop-color="#2f8dff"/></linearGradient>
  <linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${BW}" y2="${BH}"><stop offset="0" stop-color="#fffbc8"/><stop offset=".5" stop-color="#efe686"/><stop offset="1" stop-color="#fff7b0"/></linearGradient>
  <linearGradient id="panel" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${BH}"><stop offset="0" stop-color="#05172a"/><stop offset="1" stop-color="#030c18"/></linearGradient>
  <filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>
<g transform="translate(${OX} ${OY})">
  <path fill="url(#panel)" fill-rule="evenodd" d="${rr(7)}${rr(63)}"/>
  <g opacity=".75" filter="url(#glow)">${lines('stroke="url(#neon)"')}</g>
  <g>${lines('stroke="url(#neon)"')}</g>
  <g opacity=".85">${lines('stroke="#eaffff"').replace(new RegExp(`stroke-width="${W}"`, "g"), 'stroke-width="2.2"')}</g>
  <path d="${rr(52.5)}" fill="none" stroke="url(#gold)" stroke-width="11"/>
  <path d="${rr(52.5)}" fill="none" stroke="#fffde0" stroke-opacity=".55" stroke-width="1.6"/>
  <path d="${rr(62.5)}" fill="none" stroke="url(#gold)" stroke-width="6"/>
</g></svg>`;

// Render que vaza (2026-11-05, pedido do dono do app: "manter o render 3D vazando para fora da carta, por cima da borda"): o aglomerado de
// cristais da arte do Gemini da Safira (`premium-v2-dono.jpg`) é recortado do fundo (o que é mais claro que o azul-noite ou o preto, com os
// vãos preenchidos e sem o fio de ouro nem o neon da arte), girado para o ciano, ganha uma sombra suave e fica POR CIMA da moldura, passando
// do fio de ouro e do neon do lado direito. O fundo vira o miolo da mesma arte sem o aglomerado (o lado esquerdo espelhado no direito).
const SRC = path.join(__dirname, "premium-v2-dono.jpg");
const RENDER = { x0: 760, x1: 1342, y0: 380, y1: 1360 }, K = 0.72, PLACE = { x: 680, y: 400 }, OUT_W = 1250;
const clampI = (v, a, b) => Math.max(a, Math.min(b, v));
function morph(m, w, h, r, grow) { // dilata (grow) ou erode, separável
  const tmp = new Uint8Array(m.length), out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = grow ? 0 : 1; for (let d = -r; d <= r; d++) { const t = m[y * w + clampI(x + d, 0, w - 1)]; if (grow ? t : !t) { v = grow ? 1 : 0; break; } } tmp[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = grow ? 0 : 1; for (let d = -r; d <= r; d++) { const t = tmp[clampI(y + d, 0, h - 1) * w + x]; if (grow ? t : !t) { v = grow ? 1 : 0; break; } } out[y * w + x] = v; }
  return out;
}

(async () => {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const AW = info.width;
  const rw = RENDER.x1 - RENDER.x0, rh = RENDER.y1 - RENDER.y0;
  // 1) máscara do aglomerado: mais claro que o fundo, sem o ouro do fio (fino e amarelo), fechada e com os vãos preenchidos
  let m = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
    const o = ((y + RENDER.y0) * AW + x + RENDER.x0) * 3, r = data[o], g = data[o + 1], b = data[o + 2];
    const gold = r > 110 && r - b > 55 && g > b + 25 && x + RENDER.x0 > 1100 && x + RENDER.x0 < 1140;
    m[y * rw + x] = x > 24 && (Math.max(r, g, b) > 85 || (y + RENDER.y0 > 470 && b > 62 && b - Math.max(r, g) > 40)) && !gold ? 1 : 0; // claro, ou azul-escuro mais azul que o fundo
  }
  // o neon da arte (coluna fina de x ≈ 1170) e o fio de ouro (x ≈ 1123), onde o aglomerado não cobre sai; fecha frestas e facetas escuras (cristal escuro quase some no azul-noite)
  for (let y = 0; y < rh; y++) for (let x = 1100 - RENDER.x0; x < 1190 - RENDER.x0; x++) { const ay = y + RENDER.y0; if (ay < 515 || ay > 1265) m[y * rw + x] = 0; }
  const oneCh = async (buf, fn) => (await fn(sharp(buf, { raw: { width: rw, height: rh, channels: 1 } })).extractChannel(0).raw().toBuffer());
  const m255 = Buffer.alloc(rw * rh); for (let i = 0; i < m255.length; i++) m255[i] = m[i] ? 255 : 0;
  // fecha frestas e facetas escuras com cantos redondos (desfoque + limiar, em vez de caixa, que deixava degraus)
  const closedBox = morph(morph(m, rw, rh, 12, true), rw, rh, 12, false);
  const cb = Buffer.alloc(rw * rh); for (let i = 0; i < cb.length; i++) cb[i] = closedBox[i] ? 255 : 0;
  const closed = await oneCh(cb, (i) => i.blur(5).threshold(128)); // tira os degraus da caixa
  let c = new Uint8Array(rw * rh); for (let i = 0; i < c.length; i++) c[i] = closed[i] > 127 ? 1 : 0;
  const hole = new Uint8Array(rw * rh), st = [];
  const push = (x, y) => { if (x < 0 || y < 0 || x >= rw || y >= rh) return; const i = y * rw + x; if (hole[i] || c[i]) return; hole[i] = 1; st.push(i); };
  for (let x = 0; x < rw; x++) { push(x, 0); push(x, rh - 1); } for (let y = 0; y < rh; y++) { push(0, y); push(rw - 1, y); }
  while (st.length) { const i = st.pop(), x = i % rw, y = (i / rw) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  for (let i = 0; i < c.length; i++) if (!hole[i]) c[i] = 1; // o que o fundo não alcança é cristal
  // tira o que sobrou de fio e neon: componentes pequenos e finos (abertura) que não encostam no miolo grande
  const core = morph(morph(c, rw, rh, 9, false), rw, rh, 9, true);
  // volta até a silhueta do miolo, no máximo 8 px para fora dele: o neon da arte (fino e mais longe) fica de fora
  const near = morph(core, rw, rh, 8, true), keep = new Uint8Array(rw * rh);
  for (let i = 0; i < keep.length; i++) keep[i] = near[i] && c[i] ? 1 : 0;
  // estilhaços soltos (componentes pequenos mas com área) também ficam
  const seen = new Uint8Array(rw * rh);
  for (let i = 0; i < c.length; i++) if (c[i] && !keep[i] && !seen[i]) {
    const comp = [i]; seen[i] = 1; for (let q = 0; q < comp.length; q++) { const k = comp[q], x = k % rw, y = (k / rw) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= rw || ny >= rh) continue; const j = ny * rw + nx; if (c[j] && !keep[j] && !seen[j]) { seen[j] = 1; comp.push(j); } } }
    if (comp.length > 70) comp.forEach((k) => (keep[k] = 1));
  }
  const alphaRaw = Buffer.alloc(rw * rh); for (let i = 0; i < rw * rh; i++) alphaRaw[i] = keep[i] ? 255 : 0;
  const oneChannel = async (buf, w, h, fn) => { const r = await fn(sharp(buf, { raw: { width: w, height: h, channels: 1 } })).extractChannel(0).raw().toBuffer({ resolveWithObject: true }); if (r.info.channels !== 1) throw new Error("canais"); return r.data; };
  const alphaSoft = await oneChannel(alphaRaw, rw, rh, (i) => i.blur(2.2).linear(1.5, -60));
  const rgb = await sharp(data, { raw: { width: AW, height: info.height, channels: 3 } }).extract({ left: RENDER.x0, top: RENDER.y0, width: rw, height: rh }).modulate({ hue: -28, saturation: 1.15, brightness: 1.08 }).raw().toBuffer();
  const rgba = Buffer.alloc(rw * rh * 4); for (let i = 0; i < rw * rh; i++) { rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = alphaSoft[i]; }
  const tw = Math.round(rw * K), th = Math.round(rh * K);
  const cluster = await sharp(rgba, { raw: { width: rw, height: rh, channels: 4 } }).resize(tw, th, { kernel: "lanczos3" }).png().toBuffer();
  const th2 = th, tw2 = tw;
  const aSmall = await oneChannel(alphaRaw, rw, rh, (i) => i.resize(tw2, th2).blur(9).linear(0.5, 0));
  const shBuf = Buffer.alloc(tw2 * th2 * 4); for (let i = 0; i < tw2 * th2; i++) { shBuf[i * 4] = 0; shBuf[i * 4 + 1] = 6; shBuf[i * 4 + 2] = 13; shBuf[i * 4 + 3] = aSmall[i]; }
  const shadowRgba = await sharp(shBuf, { raw: { width: tw2, height: th2, channels: 4 } }).png().toBuffer();
  // O jogador fica POR CIMA do render (pedido do dono do app, 2026-11-05): a parte do aglomerado que cai dentro da janela vai para uma camada
  // ATRÁS da foto (`premium-voltagem-dentro.webp`, do tamanho da janela, parada: `innerBolts` + `still`) e a de fora da janela (sobre o fio,
  // o neon e a sobra) fica na camada de cima junto com a moldura.
  const WIN = 64.5, WR = 41.5, wx = OX + WIN, wy = OY + WIN, ww = BW - 2 * WIN, wh = BH - 2 * WIN;
  const clusterCanvas = await sharp({ create: { width: OUT_W, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([...(shadowRgba ? [{ input: shadowRgba, left: PLACE.x - 6, top: PLACE.y + 10 }] : []), { input: cluster, left: PLACE.x, top: PLACE.y }]).png().toBuffer();
  const winMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${CH}"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="${WR}" fill="#fff"/></svg>`);
  const outer = await sharp(clusterCanvas).composite([{ input: winMask, blend: "dest-out" }]).png().toBuffer();
  const frame = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp({ create: { width: OUT_W, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: frame, left: 0, top: 0 }, { input: outer, left: 0, top: 0 }]).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(OUT, "premium-voltagem-vaza.webp"));
  await sharp(clusterCanvas).extract({ left: Math.round(wx), top: Math.round(wy), width: Math.round(ww), height: Math.round(wh) }).webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(OUT, "premium-voltagem-dentro.webp"));

  // fundo: o miolo da arte sem o aglomerado (o lado esquerdo espelhado sobre o direito, com a emenda esmaecida)
  const IW = 886, IH = 1284, IX = 228, IY = 358, MIRROR = 760 - IX;
  const inner = Buffer.alloc(IW * IH * 3);
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
    const o = ((y + IY) * AW + x + IX) * 3, t = clamp((x - MIRROR + 20) / 70), mx = Math.max(0, 2 * MIRROR - x), mo = ((y + IY) * AW + mx + IX) * 3, d = (y * IW + x) * 3;
    for (let k = 0; k < 3; k++) inner[d + k] = data[o + k] * (1 - t) + data[mo + k] * t;
  }
  await sharp(inner, { raw: { width: IW, height: IH, channels: 3 } }).resize(600, 860, { fit: "fill" }).modulate({ hue: -28, saturation: 1.15, brightness: 1.08 }).webp({ quality: 90 }).toFile(path.join(OUT, "premium-voltagem.webp"));
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
