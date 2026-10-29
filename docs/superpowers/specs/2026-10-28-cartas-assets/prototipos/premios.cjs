// Fundos das cartas de prêmio, por prêmio e por tema do mês (evento), no formato novo.
// Uso: node premios.cjs <pasta de saída> <raiz do repo>
// Melhor Jogador: a taça ao lado do jogador (aprovada em 2026-10-29). Destaques: o ícone do
// prêmio no mesmo lugar. O tema veste a cor e a marca d'água do evento (fantasma, taça).
const path = require("path");
const fs = require("fs");
const root = process.argv[3];
const sharp = require(path.resolve(root, "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;

function icon(name) {
  const src = fs.readFileSync(path.resolve(root, `node_modules/lucide-react/dist/esm/icons/${name}.mjs`), "utf8");
  const obj = src.match(/const __iconData = (\{[\s\S]*?\n\});\n/)[1];
  return Function(`return ${obj}`)().node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
}
const grain = `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity=".08"/>`;
const watermark = (name, color) => `<g transform="translate(-30 330) scale(11)" fill="none" stroke="${color}" stroke-opacity=".16" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon(name)}</g>`;
const CUP = "M10 2h28v6h8c0 12-6 18-12 20-2 6-6 9-8 10v8h8v6H14v-6h8v-8c-2-1-6-4-8-10C8 26 2 20 2 8h8V2zm-4 10c1 7 4 11 7 12-1-4-2-8-2-12H6zm31 0c0 4-1 8-2 12 3-1 6-5 7-12h-5zM10 56h28v6H10z";

// Destaques: fundo do tema + ícone do prêmio ao lado do jogador.
const DESTAQUE_THEMES = {
  default: { top: "#0f3a8f", bottom: "#040c22", line: "#8fc2ff", glow: "#bcd8ff", mark: null },
  halloween: { top: "#3a145c", bottom: "#0d0418", line: "#b6ff5c", glow: "#d9b8ff", mark: ["ghost", "#d9b8ff"] },
};
const DESTAQUE_ICONS = {
  atacante: "flame", criativo: "lightbulb", defensor: "shield-check", goleiro: "hand", gol: "goal",
  // Cartas antigas (prêmios por atributo, até 2026-10-29).
  foguete: "rocket", garcom: "hand-platter", drible: "sparkles", motor: "cog",
};
function destaque(theme, iconName) {
  const t = DESTAQUE_THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient>
    <pattern id="sp" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><line x1="0" y1="0" x2="14" y2="0" stroke="#ffffff" stroke-opacity=".035" stroke-width="2"/></pattern>
    <radialGradient id="g" cx=".82" cy=".42" r=".32"><stop offset="0" stop-color="${t.glow}" stop-opacity=".3"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#b)"/><rect width="100%" height="100%" fill="url(#sp)"/>${t.mark ? watermark(...t.mark) : ""}<rect width="100%" height="100%" fill="url(#g)"/>
    <g transform="translate(385 250) scale(9)" fill="${t.line}" fill-opacity=".12" stroke="${t.line}" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${icon(iconName)}</g>${grain}</svg>`;
}

// Melhor Jogador: a taça ao lado, no metal e no fundo de cada tema.
const CRAQUE_THEMES = {
  default: { top: "#1b1a17", bottom: "#070706", cupTop: "#f3d27a", cupBottom: "#b8902f", glow: "#ffe7a0", mark: null },
  halloween: { top: "#2a0f3d", bottom: "#0a0410", cupTop: "#ffb04a", cupBottom: "#c2560f", glow: "#ffb04a", mark: ["ghost", "#ffb04a"] },
};
function craque(theme) {
  const t = CRAQUE_THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient>
    <pattern id="br" width="6" height="6" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="6" y2="0" stroke="${t.cupTop}" stroke-opacity=".05"/></pattern>
    <linearGradient id="cupg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.cupTop}" stop-opacity=".42"/><stop offset=".65" stop-color="${t.cupBottom}" stop-opacity=".26"/><stop offset="1" stop-color="${t.cupBottom}" stop-opacity=".05"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".3" r=".45"><stop offset="0" stop-color="${t.glow}" stop-opacity=".22"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#br)"/>${t.mark ? watermark(...t.mark) : ""}<rect width="100%" height="100%" fill="url(#glow)"/>
    <path d="${CUP}" transform="translate(250 70) scale(8.6)" fill="url(#cupg)" stroke="${t.cupTop}" stroke-opacity=".55" stroke-width="0.19" stroke-linejoin="round"/>${grain}</svg>`;
}

(async () => {
  for (const theme of Object.keys(DESTAQUE_THEMES))
    for (const [kind, ic] of Object.entries(DESTAQUE_ICONS))
      await sharp(Buffer.from(destaque(theme, ic))).webp({ quality: 86 }).toFile(`${OUT}/premio-${kind}-${theme}.webp`);
  for (const theme of Object.keys(CRAQUE_THEMES))
    await sharp(Buffer.from(craque(theme))).webp({ quality: 86 }).toFile(`${OUT}/premio-craque-${theme}.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
