// Fundos candidatos do Time do Mês (sem tema do mês): a coroa como símbolo.
const path = require("path");
const fs = require("fs");
const root = process.argv[3];
const sharp = require(path.resolve(root, "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
function icon(name) {
  const src = fs.readFileSync(path.resolve(root, `node_modules/lucide-react/dist/esm/icons/${name}.mjs`), "utf8");
  const obj = src.match(/const __iconData = (\{[\s\S]*?\n\});\n/)[1];
  return Function(`return ${obj}`)().node.map(([t, a]) => `<${t} ${Object.entries(a).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
}
const grain = `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity=".08"/>`;
const crown = (x, y, s, stroke, op) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${stroke}" fill-opacity=".12" stroke="${stroke}" stroke-opacity="${op}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${icon("crown")}</g>`;
const base = (top, bottom, extra) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
  <radialGradient id="g" cx=".8" cy=".38" r=".34"><stop offset="0" stop-color="#ffe7a0" stop-opacity=".28"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#b)"/>${extra}<rect width="100%" height="100%" fill="url(#g)"/>${grain}</svg>`;

// A · Coroa ao lado: roxo real liso, coroa dourada grande ao lado do jogador.
const coroa = base("#3b1670", "#0e0420", crown(375, 230, 9.5, "#f3d27a", .8));

// B · Veludo real: roxo com padrão de flor-de-lis bem apagado e a coroa ao lado.
const lis = `<pattern id="lis" width="70" height="70" patternUnits="userSpaceOnUse"><path d="M35 14 Q41 26 35 36 Q29 26 35 14 Z M35 36 Q48 30 52 40 Q44 44 35 38 Z M35 36 Q22 30 18 40 Q26 44 35 38 Z M28 46 H42" fill="#f3d27a" opacity=".07" stroke="#f3d27a" stroke-opacity=".07"/></pattern>`;
const veludo = base("#2f0f5c", "#0b0318", `<defs>${lis}</defs><rect width="100%" height="100%" fill="url(#lis)"/>` + crown(375, 230, 9.5, "#f3d27a", .8));

// C · O mês em destaque: "OUT" gigante em contorno dourado atrás do jogador e uma coroa pequena.
const mesTxt = base("#2a0f52", "#0a0316", `<text x="-20" y="430" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="300" letter-spacing="-18" fill="none" stroke="#f3d27a" stroke-opacity=".32" stroke-width="3">OUT</text>` + crown(430, 120, 5.5, "#f3d27a", .85));

(async () => {
  await sharp(Buffer.from(coroa)).webp({ quality: 88 }).toFile(`${OUT}/mes-coroa.webp`);
  await sharp(Buffer.from(veludo)).webp({ quality: 88 }).toFile(`${OUT}/mes-veludo.webp`);
  await sharp(Buffer.from(mesTxt)).webp({ quality: 88 }).toFile(`${OUT}/mes-texto.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
