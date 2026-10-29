// Fundos dos Destaques: o ícone do prêmio grande ao lado do jogador (mesma linguagem da taça do Melhor
// Jogador), em cada tema do mês (Clássica, Halloween, Brasileirão).
const path = require("path");
const fs = require("fs");
const root = process.argv[3];
const sharp = require(path.resolve(root, "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
function icon(name) {
  const src = fs.readFileSync(path.resolve(root, `node_modules/lucide-react/dist/esm/icons/${name}.mjs`), "utf8");
  const obj = src.match(/const __iconData = (\{[\s\S]*?\n\});\n/)[1];
  const nodes = Function(`return ${obj}`)().node;
  return nodes.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
}
const grain = `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity=".08"/>`;
const THEMES = {
  classica: { top: "#0f3a8f", bottom: "#040c22", line: "#8fc2ff", glow: "#bcd8ff", extra: "" },
  halloween: { top: "#3a145c", bottom: "#0d0418", line: "#b6ff5c", glow: "#d9b8ff",
    extra: `<g transform="translate(-30 330) scale(11)" fill="none" stroke="#d9b8ff" stroke-opacity=".16" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon("ghost")}</g>` },
  brasileirao: { top: "#1645a8", bottom: "#071a4a", line: "#ffd400", glow: "#fff2a0",
    extra: `<g transform="translate(-20 340) scale(10)" fill="none" stroke="#ffd400" stroke-opacity=".16" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon("trophy")}</g>` },
};
function bg(theme, iconName) {
  const t = THEMES[theme];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.top}"/><stop offset="1" stop-color="${t.bottom}"/></linearGradient>
    <pattern id="sp" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><line x1="0" y1="0" x2="14" y2="0" stroke="#ffffff" stroke-opacity=".035" stroke-width="2"/></pattern>
    <radialGradient id="g" cx=".82" cy=".42" r=".32"><stop offset="0" stop-color="${t.glow}" stop-opacity=".3"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#b)"/><rect width="100%" height="100%" fill="url(#sp)"/>${t.extra}<rect width="100%" height="100%" fill="url(#g)"/>
    <g transform="translate(385 250) scale(9)" fill="${t.line}" fill-opacity=".12" stroke="${t.line}" stroke-opacity=".75" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${icon(iconName)}</g>${grain}</svg>`;
}
const ICONS = { foguete: "rocket", drible: "sparkles", goleiro: "hand", gol: "goal" };
(async () => {
  for (const theme of Object.keys(THEMES)) for (const [k, ic] of Object.entries(ICONS))
    await sharp(Buffer.from(bg(theme, ic))).webp({ quality: 88 }).toFile(`${OUT}/destaque-${theme}-${k}.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
