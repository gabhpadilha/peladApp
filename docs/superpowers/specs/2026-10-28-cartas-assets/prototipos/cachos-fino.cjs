// Aglomerado que vaza na moldura fina (2026-11-05, Rubi e Ícone): o dono pediu o aglomerado de cristais de volta, por cima da moldura fina da Maré.
// Mesma arte e MESMO mapeamento de antes (a caixa da carta é o lado de fora do painel da arte esticada para 5:7; `premium-v2.cjs` e
// `premium-icone.cjs`), então o aglomerado fica no tamanho e no lugar que o dono já aprovou, e o fundo (miolo da mesma arte, sem o fio) bate
// com a parte que passa por cima da moldura: o que está dentro da janela fica no fundo (atrás do jogador) e o que passa da borda da janela
// vai numa camada de cima, junto da moldura (`premium-<nome>-fino-vaza.webp`, 1150 × 1400, `overflowWidth` 1,15).
// Uso: node cachos-fino.cjs <rubi|icone> <pasta de saída> <raiz do repo>   (a moldura `premium-<nome>-fino-vaza.webp` já precisa estar na pasta)
const path = require("path");
const sharp = require(path.resolve(process.argv[4], "node_modules/sharp"));
const NAME = process.argv[2], OUT = process.argv[3];
const CONF = {
  rubi: { src: "premium-v2-dono.jpg", edge: { l: 212, r: 1129, t: 342, b: 1658 }, hue: 348, sat: 1, light: 1, kind: "navy", region: { x0: 760, x1: 1342, y0: 380, y1: 1360 } },
  icone: { src: "premium-icone-dono.jpg", edge: { l: 160, r: 1181, t: 298, b: 1701 }, hue: null, kind: "black", region: { x0: 720, x1: 1342, y0: 400, y1: 1360 } },
}[NAME];
const BOX = { x: 80, y: 112, w: 840, h: 1176 }, INSET = 31, OUT_W = 1150, CELL_H = 1400, WR = 38;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
function rgbToHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; if (max === min) return [0, 0, l]; const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min); const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hslToRgb(h, s, l) { h = (((h % 360) + 360) % 360) / 360; if (s === 0) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
function recolor(r, g, b) { // gira só os azuis (como em `premium-v2.cjs`); o ouro e os brancos ficam
  if (CONF.hue === null) return [r, g, b];
  const [h, s, l] = rgbToHsl(r, g, b);
  const k = smooth(150, 175, h) * (1 - smooth(275, 300, h)) * smooth(0.08, 0.2, s);
  if (k === 0) return [r, g, b];
  const [nr, ng, nb] = hslToRgb(h + (CONF.hue - 222), clamp(s * CONF.sat), clamp(l * CONF.light));
  return [r + (nr - r) * k, g + (ng - g) * k, b + (nb - b) * k];
}
function morph(m, w, h, r, grow) {
  const tmp = new Uint8Array(m.length), out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = grow ? 0 : 1; for (let d = -r; d <= r; d++) { const t = m[y * w + clamp(x + d, 0, w - 1)]; if (grow ? t : !t) { v = grow ? 1 : 0; break; } } tmp[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = grow ? 0 : 1; for (let d = -r; d <= r; d++) { const t = tmp[clamp(y + d, 0, h - 1) * w + x]; if (grow ? t : !t) { v = grow ? 1 : 0; break; } } out[y * w + x] = v; }
  return out;
}

(async () => {
  const { data, info } = await sharp(path.join(__dirname, CONF.src)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const AW = info.width, AH = info.height, E = CONF.edge;
  const sx = BOX.w / (E.r - E.l), sy = BOX.h / (E.b - E.t); // px da célula por px da arte
  const px = (x, y, k) => data[(y * AW + x) * 3 + k];

  // ---- fundo: o miolo da arte menos a faixa da moldura (mesma conta do mapeamento)
  const cl = E.l + INSET / sx, ct = E.t + INSET / sy, cw = (E.r - E.l) - 2 * INSET / sx, ch = (E.b - E.t) - 2 * INSET / sy;
  const crop = await sharp(data, { raw: { width: AW, height: AH, channels: 3 } }).extract({ left: Math.round(cl), top: Math.round(ct), width: Math.round(cw), height: Math.round(ch) }).raw().toBuffer({ resolveWithObject: true });
  const rc = Buffer.alloc(crop.data.length); for (let i = 0; i < crop.data.length; i += 3) { const c = recolor(crop.data[i], crop.data[i + 1], crop.data[i + 2]); rc[i] = c[0]; rc[i + 1] = c[1]; rc[i + 2] = c[2]; }
  await sharp(rc, { raw: { width: crop.info.width, height: crop.info.height, channels: 3 } }).resize(700, 1004, { fit: "fill" }).webp({ quality: 90 }).toFile(path.join(OUT, `premium-${NAME}-fino.webp`));

  // ---- aglomerado: máscara na região do lado direito
  const R = CONF.region, rw = R.x1 - R.x0, rh = R.y1 - R.y0;
  const XW = E.r - INSET / sx; // borda direita da janela, na arte
  const m = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
    const ax = x + R.x0, ay = y + R.y0, r = px(ax, ay, 0), g = px(ax, ay, 1), b = px(ax, ay, 2), mx = Math.max(r, g, b);
    let on = 0;
    if (CONF.kind === "navy") {
      const gold = r > 110 && r - b > 55 && g > b + 25 && ax > E.r - 30 && ax < E.r + 12; // o fio de ouro da arte
      on = x > 24 && (mx > 85 || (ay > 470 && b > 62 && b - Math.max(r, g) > 40)) && !gold ? 1 : 0;
      if (ax > E.r - 30 && ax < E.r + 75 && (ay < 515 || ay > 1265)) on = 0; // fio e neon da arte onde o aglomerado não cobre
    } else {
      on = ax > E.r + 14 && mx > 60 ? 1 : 0; // no preto de fora do painel, pelo brilho
      if (ax > E.r + 8 && ax < E.r + 60 && (ay < 560 || ay > 1290)) on = 0; // os fios de ouro da arte onde o aglomerado não cobre
    }
    m[y * rw + x] = on;
  }
  if (CONF.kind === "black") {
    // os fios de ouro finos da arte (linhas verticais de poucos px) saem; as pepitas de ouro do aglomerado são largas e ficam
    const isGold = (ax, ay) => Math.max(px(ax, ay, 0), px(ax, ay, 1), px(ax, ay, 2)) > 60; // qualquer brilho: linhas finas saem, corpo largo fica
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const ax = x + R.x0, ay = y + R.y0;
      if (ax < E.r + 6 || ax > E.r + 60 || !isGold(ax, ay)) continue;
      let l = ax, rr = ax; while (l > ax - 20 && isGold(l - 1, ay)) l--; while (rr < ax + 20 && isGold(rr + 1, ay)) rr++;
      if (rr - l < 16) m[y * rw + x] = 0;
    }
    // a beirada de dentro (mármore claro): vale a linha logo ao lado, no preto
    for (let y = 0; y < rh; y++) {
      let n = 0, t = 0; for (let ax = E.r + 16; ax < E.r + 40; ax++) { t++; if (m[y * rw + ax - R.x0]) n++; }
      if (y + R.y0 > 540 && y + R.y0 < 1290 && n / t > 0.5) for (let ax = Math.floor(XW - 6); ax <= E.r + 14; ax++) m[y * rw + ax - R.x0] = 1;
    }
  }
  const oneCh = async (buf, fn) => (await fn(sharp(buf, { raw: { width: rw, height: rh, channels: 1 } })).extractChannel(0).raw().toBuffer());
  const to255 = (a) => { const b = Buffer.alloc(a.length); for (let i = 0; i < a.length; i++) b[i] = a[i] ? 255 : 0; return b; };
  const closed = await oneCh(to255(morph(morph(m, rw, rh, 12, true), rw, rh, 12, false)), (i) => i.blur(5).threshold(128));
  let c = new Uint8Array(rw * rh); for (let i = 0; i < c.length; i++) c[i] = closed[i] > 127 ? 1 : 0;
  // preenche vãos
  const hole = new Uint8Array(rw * rh), st = [];
  const push = (x, y) => { if (x < 0 || y < 0 || x >= rw || y >= rh) return; const i = y * rw + x; if (hole[i] || c[i]) return; hole[i] = 1; st.push(i); };
  for (let x = 0; x < rw; x++) { push(x, 0); push(x, rh - 1); } for (let y = 0; y < rh; y++) { push(0, y); push(rw - 1, y); }
  while (st.length) { const i = st.pop(), x = i % rw, y = (i / rw) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  for (let i = 0; i < c.length; i++) if (!hole[i]) c[i] = 1;
  const core = morph(morph(c, rw, rh, 9, false), rw, rh, 9, true), near = morph(core, rw, rh, 8, true);
  const keep = new Uint8Array(rw * rh); for (let i = 0; i < keep.length; i++) keep[i] = near[i] && c[i] ? 1 : 0;
  // estilhaços soltos com área
  const seen = new Uint8Array(rw * rh);
  for (let i = 0; i < c.length; i++) if (c[i] && !keep[i] && !seen[i]) {
    const comp = [i]; seen[i] = 1;
    for (let q = 0; q < comp.length; q++) { const k = comp[q], x = k % rw, y = (k / rw) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= rw || ny >= rh) continue; const j = ny * rw + nx; if (c[j] && !keep[j] && !seen[j]) { seen[j] = 1; comp.push(j); } } }
    if (comp.length > 70) comp.forEach((k) => (keep[k] = 1));
  }
  // só o que passa da borda da janela (o resto já está no fundo), com uma rampa de 6 px de arte
  const alpha = Buffer.alloc(rw * rh);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) alpha[y * rw + x] = keep[y * rw + x] ? Math.round(255 * smooth(XW - 6, XW + 2, x + R.x0)) : 0;
  const aSoft = await oneCh(alpha, (i) => i.blur(1.6).linear(1.4, -40));
  const rgba = Buffer.alloc(rw * rh * 4);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { const o = (y * rw + x) * 4, cc = recolor(px(x + R.x0, y + R.y0, 0), px(x + R.x0, y + R.y0, 1), px(x + R.x0, y + R.y0, 2)); rgba[o] = cc[0]; rgba[o + 1] = cc[1]; rgba[o + 2] = cc[2]; rgba[o + 3] = aSoft[y * rw + x]; }
  const tw = Math.round(rw * sx), th = Math.round(rh * sy);
  const piece = await sharp(rgba, { raw: { width: rw, height: rh, channels: 4 } }).resize(tw, th, { kernel: "lanczos3" }).png().toBuffer();
  // sombra suave embaixo
  const aSmall = await sharp(aSoft, { raw: { width: rw, height: rh, channels: 1 } }).resize(tw, th).blur(8).linear(0.45, 0).extractChannel(0).raw().toBuffer();
  const sh = Buffer.alloc(tw * th * 4); for (let i = 0; i < tw * th; i++) { sh[i * 4 + 1] = 6; sh[i * 4 + 2] = 12; sh[i * 4 + 3] = aSmall[i]; }
  const shadow = await sharp(sh, { raw: { width: tw, height: th, channels: 4 } }).png().toBuffer();
  const left = Math.round(BOX.x + (R.x0 - E.l) * sx), top = Math.round(BOX.y + (R.y0 - E.t) * sy);
  const frame = await sharp(path.join(OUT, `premium-${NAME}-fino-vaza.webp`)).extend({ right: OUT_W - 1000, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  // `frame` pode já ter vindo larga de uma rodada anterior: recorta para 1000 antes
  const base = await sharp(frame).extract({ left: 0, top: 0, width: Math.min(OUT_W, (await sharp(frame).metadata()).width), height: CELL_H }).png().toBuffer();
  const clipL = Math.max(0, -left), clipT = Math.max(0, -top);
  const cwid = Math.min(tw - clipL, OUT_W - Math.max(0, left)), chei = Math.min(th - clipT, CELL_H - Math.max(0, top));
  const cut = (buf) => sharp(buf).extract({ left: clipL, top: clipT, width: cwid, height: chei }).png().toBuffer();
  await sharp({ create: { width: OUT_W, height: CELL_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: base, left: 0, top: 0 }, { input: await cut(shadow), left: Math.max(0, left) - 5, top: Math.max(0, top) + 9 }, { input: await cut(piece), left: Math.max(0, left), top: Math.max(0, top) }])
    .webp({ quality: 88, alphaQuality: 95 }).toFile(path.join(OUT, `premium-${NAME}-fino-vaza.webp`));
  console.log("ok", { left, top, tw, th });
})().catch((e) => { console.error(e); process.exit(1); });
