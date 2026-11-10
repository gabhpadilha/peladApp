// Aguaceiro e Chuva Violeta (raras do conjunto de novembro de 2026, tema Toró; 2026-11-10): o dono pediu para eu mesmo fazer as raras e as comuns por aqui, sem o Gemini.
// Regra da rara: borda trabalhada de leve e fundo com pattern próprio (2 peças). Fundo = chuva forte em diagonal sobre um vidro azul-noite, com gotas escorrendo, luzes frias
// desfocadas e um clarão de relâmpago distante; moldura = aço azul-petróleo escovado de ~3% da carta, fio de prata por dentro, suportes de canto com raio e gota
// em relevo e uma gota pendente no meio de baixo. Tudo desenhado em SVG e assado em WebP (sem `filter` na carta, por causa do iPhone).
// Saem `premium-aguaceiro.webp` (fundo, 700 x 1004, como a Maré) e `premium-aguaceiro-vaza.webp` (moldura, 1000 x 1400 com a caixa da carta nos 84% do meio: 840 x 1176),
// e as mesmas duas peças com o tom girado: Chuva Violeta, Chuva Esmeralda e Chuva Rubi (`premium-chuva<cor>.webp` e `-vaza.webp`).
// Uso: node aguaceiro.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
let seed = 5;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const f = (v, d = 1) => Number(v).toFixed(d);

// ---------- fundo ----------
const FW = 700, FH = 1004;
const bokeh = Array.from({ length: 16 }, () => ({ x: rnd() * FW, y: rnd() * FH * 0.7, r: 26 + rnd() * 52, o: 0.08 + rnd() * 0.16, c: rnd() > 0.5 ? "#9fd0ff" : "#dcecff" }));
const bokehSvg = bokeh.map((b) => `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${f(b.r)}" fill="${b.c}" opacity="${f(b.o, 2)}"/>`).join("");
const rainLayer = (n, lenMin, lenMax, wMin, wMax, oMin, oMax) => Array.from({ length: n }, () => {
  const x = -140 + rnd() * (FW + 280), y = -160 + rnd() * (FH + 120), l = lenMin + rnd() * (lenMax - lenMin), w = wMin + rnd() * (wMax - wMin), o = oMin + rnd() * (oMax - oMin);
  return `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - l * 0.3)}" y2="${f(y + l)}" stroke="#cfe6ff" stroke-opacity="${f(o, 3)}" stroke-width="${f(w, 2)}" stroke-linecap="round"/>`;
}).join("");
const drops = Array.from({ length: 58 }, () => ({ x: 24 + rnd() * (FW - 48), y: 30 + rnd() * (FH - 70), r: 6 + rnd() * rnd() * 24 }));
const dropSvg = drops.map((d) => {
  const trail = d.r > 9 && rnd() > 0.35 ? `<line x1="${f(d.x)}" y1="${f(d.y - d.r * 1.3)}" x2="${f(d.x + 1.5)}" y2="${f(d.y - d.r * (4 + rnd() * 7))}" stroke="url(#trail)" stroke-width="${f(Math.max(1.4, d.r * 0.18), 1)}" stroke-linecap="round"/>` : "";
  return `${trail}<g opacity="${f(0.7 + rnd() * 0.3, 2)}">
    <ellipse cx="${f(d.x + d.r * 0.12)}" cy="${f(d.y + d.r * 0.95)}" rx="${f(d.r * 0.8)}" ry="${f(d.r * 0.22)}" fill="#000" opacity=".28"/>
    <ellipse cx="${f(d.x)}" cy="${f(d.y)}" rx="${f(d.r * 0.82)}" ry="${f(d.r * 1.12)}" fill="url(#drop)" stroke="rgba(205,232,255,.45)" stroke-width="${f(Math.max(0.8, d.r * 0.06), 1)}"/>
    <ellipse cx="${f(d.x - d.r * 0.28)}" cy="${f(d.y - d.r * 0.38)}" rx="${f(d.r * 0.2)}" ry="${f(d.r * 0.34)}" fill="#fff" opacity=".9"/>
    <ellipse cx="${f(d.x + d.r * 0.3)}" cy="${f(d.y + d.r * 0.52)}" rx="${f(d.r * 0.32)}" ry="${f(d.r * 0.16)}" fill="#8fd0ff" opacity=".55"/>
  </g>`;
}).join("");

const fundoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FW}" height="${FH}" viewBox="0 0 ${FW} ${FH}">
<defs>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173659"/><stop offset=".5" stop-color="#0f2742"/><stop offset="1" stop-color="#091729"/></linearGradient>
  <radialGradient id="flash" cx=".8" cy=".12" r=".6"><stop offset="0" stop-color="#d4e8ff" stop-opacity=".5"/><stop offset=".5" stop-color="#7fb4f0" stop-opacity=".16"/><stop offset="1" stop-color="#7fb4f0" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".78"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>
  <radialGradient id="drop" cx=".4" cy=".34" r=".85"><stop offset="0" stop-color="#9ccdf5" stop-opacity=".42"/><stop offset=".7" stop-color="#1c4673" stop-opacity=".22"/><stop offset="1" stop-color="#050f1c" stop-opacity=".5"/></radialGradient>
  <linearGradient id="trail" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#bfe0ff" stop-opacity=".4"/><stop offset="1" stop-color="#bfe0ff" stop-opacity="0"/></linearGradient>
  <filter id="mist" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.008" numOctaves="4" seed="9"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.62  0 0 0 0 0.78  0 0 0 0 0.96  1.8 0 0 0 -0.78"/>
  </filter>
  <filter id="b10"><feGaussianBlur stdDeviation="11"/></filter>
  <filter id="b14"><feGaussianBlur stdDeviation="1.5"/></filter>
  <filter id="b04"><feGaussianBlur stdDeviation="0.5"/></filter>
</defs>
<rect width="${FW}" height="${FH}" fill="url(#glass)"/>
<g filter="url(#b10)">${bokehSvg}</g>
<rect width="${FW}" height="${FH}" fill="url(#flash)"/>
<rect width="${FW}" height="${FH}" filter="url(#mist)" opacity=".5"/>
<g filter="url(#b14)">${rainLayer(520, 90, 260, 1, 2, 0.05, 0.16)}</g>
<g filter="url(#b04)">${rainLayer(150, 140, 340, 1.6, 3, 0.1, 0.26)}</g>
${dropSvg}
<rect width="${FW}" height="${FH}" fill="url(#vig)"/>
</svg>`;

// ---------- moldura ----------
const CW = 1000, CH = 1400, BW = 840, BH = 1176, OX = 80, OY = 112, RO = 76;
const R = (d) => Math.max(8, RO - d);
const rr = (d) => { const x = d, y = d, w = BW - 2 * d, h = BH - 2 * d, r = R(d);
  return `M${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h - r}A${r},${r} 0 0 1 ${x + w - r},${y + h}H${x + r}A${r},${r} 0 0 1 ${x},${y + h - r}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}Z`; };
const band = (d0, d1) => `${rr(d0)}${rr(d1)}`;
const BR = 150; // lado do quadrado de cada suporte de canto
// suporte de canto: o quadrado do canto com a ponta cortada na diagonal (só a ponta, onde a faixa engrossa)
const corner = (id, sx, sy) => { const pts = [[0, 0], [BR, 0], [BR - 36, 46], [46, BR - 36], [0, BR]].map(([a, b]) => `${sx < 0 ? BW + sx * a : a},${sy < 0 ? BH + sy * b : b}`).join(" "); return `<clipPath id="${id}"><polygon points="${pts}"/></clipPath>`; };
const bolt = `M10,0L2,15H8L4,30L16,11H9.5L14,0Z`;
const dropShape = `M0,-13C6,-4 9,1 9,5A9,9 0 0 1 -9,5C-9,1 -6,-4 0,-13Z`;
const frameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}">
<defs>
  <linearGradient id="steel" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${BW}" y2="${BH}"><stop offset="0" stop-color="#365269"/><stop offset=".2" stop-color="#a6c2d6"/><stop offset=".38" stop-color="#4e6b82"/><stop offset=".55" stop-color="#2b4155"/><stop offset=".76" stop-color="#8fb0c6"/><stop offset="1" stop-color="#34506a"/></linearGradient>
  <linearGradient id="steelHi" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${BW}" y2="${BH}"><stop offset="0" stop-color="#6e8ea6"/><stop offset=".25" stop-color="#d4e6f3"/><stop offset=".5" stop-color="#6b8aa1"/><stop offset=".75" stop-color="#bcd5e6"/><stop offset="1" stop-color="#5a7890"/></linearGradient>
  <linearGradient id="silver" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${BW}" y2="${BH}"><stop offset="0" stop-color="#f4fbff"/><stop offset=".5" stop-color="#b9d0e0"/><stop offset="1" stop-color="#f1f9ff"/></linearGradient>
  <linearGradient id="inlay" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset="1" stop-color="#8fb4cf"/></linearGradient>
  ${corner("cTL", 1, 1)}${corner("cTR", -1, 1)}${corner("cBL", 1, -1)}${corner("cBR", -1, -1)}
</defs>
<g transform="translate(${OX} ${OY})">
  <path fill="#071019" fill-rule="evenodd" d="${band(0, 3)}"/>
  <path fill="url(#steel)" fill-rule="evenodd" d="${band(3, 21)}"/>
  <path d="${rr(8)}" fill="none" stroke="url(#steelHi)" stroke-width="1.6" opacity=".6"/>
  <path d="${rr(15)}" fill="none" stroke="#0a1620" stroke-width="1.2" opacity=".55"/>
  <path fill="url(#silver)" fill-rule="evenodd" d="${band(21, 24)}"/>
  <path fill="#000" fill-opacity=".5" fill-rule="evenodd" d="${band(24, 27.5)}"/>
  <!-- suportes de canto, um pouco mais largos que a faixa, com fio de prata -->
  ${["cTL", "cTR", "cBL", "cBR"].map((id) => `<g clip-path="url(#${id})"><path fill="url(#steelHi)" fill-rule="evenodd" d="${band(3, 36)}"/><path fill="url(#silver)" fill-rule="evenodd" d="${band(36, 38.5)}"/><path fill="#000" fill-opacity=".45" fill-rule="evenodd" d="${band(38.5, 42)}"/><path fill="#0a1620" fill-opacity=".35" fill-rule="evenodd" d="${band(3, 4.6)}"/></g>`).join("")}
  <!-- raios em relevo nos cantos de cima e gotas nos de baixo -->
  <g transform="translate(56 56) scale(1.5)"><path d="${bolt}" fill="#07121b" opacity=".55" transform="translate(1.4 1.6)"/><path d="${bolt}" fill="url(#inlay)"/></g>
  <g transform="translate(${BW - 56 - 24} 56) scale(1.5)"><path d="${bolt}" fill="#07121b" opacity=".55" transform="translate(1.4 1.6)"/><path d="${bolt}" fill="url(#inlay)"/></g>
  <g transform="translate(62 ${BH - 62}) scale(1.6)"><path d="${dropShape}" fill="#07121b" opacity=".55" transform="translate(1.4 1.6)"/><path d="${dropShape}" fill="url(#inlay)"/></g>
  <g transform="translate(${BW - 62} ${BH - 62}) scale(1.6)"><path d="${dropShape}" fill="#07121b" opacity=".55" transform="translate(1.4 1.6)"/><path d="${dropShape}" fill="url(#inlay)"/></g>
  <!-- gota pendente no meio de baixo -->
  <g transform="translate(${BW / 2} ${BH - 38}) scale(1.9)"><path d="${dropShape}" fill="#07121b" opacity=".6" transform="translate(1.2 1.4)"/><path d="${dropShape}" fill="url(#steelHi)" stroke="url(#silver)" stroke-width="1.3"/><ellipse cx="-2.6" cy="2" rx="1.6" ry="3" fill="#fff" opacity=".75"/></g>
</g></svg>`;

(async () => {
  const fundo = await sharp(Buffer.from(fundoSvg)).png().toBuffer();
  const moldura = await sharp(Buffer.from(frameSvg)).png().toBuffer();
  await sharp(fundo).webp({ quality: 90 }).toFile(path.join(OUT, "premium-aguaceiro.webp"));
  await sharp(moldura).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, "premium-aguaceiro-vaza.webp"));
  // outras cores: o mesmo desenho com o tom girado (violeta, esmeralda e rubi); a moldura de aço gira junto
  const tones = { chuvavioleta: { hue: 30, saturation: 1.05 }, chuvaesmeralda: { hue: -85, saturation: 1.15 }, chuvarubi: { hue: 110, saturation: 1.15 } };
  for (const [name, tone] of Object.entries(tones)) {
    await sharp(fundo).modulate(tone).webp({ quality: 90 }).toFile(path.join(OUT, `premium-${name}.webp`));
    await sharp(moldura).modulate(tone).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, `premium-${name}-vaza.webp`));
  }
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
