// Carta "Voltagem" (2026-11-05): só o ESTILO da borda que o dono do app montou (`voltagem-referencia-dono.jpg`) no nosso retângulo
// arredondado: fio duplo de ouro pálido por dentro e, por fora, linhas de neon (ciano no topo, azul embaixo) com o degrau diagonal onde
// a linha se divide em duas nos lados. Nada de escudo, ponta ou chanfro. A moldura é desenhada em SVG e assada em WebP (brilho incluso,
// sem `filter` na carta). O miolo fica transparente (janela `ring`); a faixa entre o neon e o fio é um painel azul-noite opaco.
// Saem `premium-voltagem.webp` (fundo, os cristais da Safira girados para o ciano) e `premium-voltagem-vaza.webp` (moldura, 1000 × 1400,
// com a caixa da carta nos 84% do meio: 840 × 1176). Uso: node voltagem.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];

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

(async () => {
  await sharp(Buffer.from(svg)).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, "premium-voltagem-vaza.webp"));
  const base = path.resolve(process.argv[3], "public/cartas/fundos/premium-safira.webp");
  await sharp(base).extract({ left: 14, top: 14, width: 572, height: 832 }).resize(600, 860, { fit: "fill" }).modulate({ hue: -28, saturation: 1.15, brightness: 1.08 }).webp({ quality: 90 }).toFile(path.join(OUT, "premium-voltagem.webp"));
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
