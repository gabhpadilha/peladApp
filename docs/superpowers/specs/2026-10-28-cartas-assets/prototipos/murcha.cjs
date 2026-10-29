// Fundos candidatos da Bola Murcha: bronze e terra, foscos, "sem vida", com a bola murcha ao lado.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
const grain = (o) => `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="7"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity="${o}"/>`;
// Bola murcha: achatada embaixo, com um vinco e gomos tortos.
const ball = (x, y, s, stroke, fill) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${stroke}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 30 C2 18 8 6 20 5 C32 4 39 14 37 26 C36 32 31 34 20 34 C11 34 5 34 4 30 Z" fill="${fill}"/>
  <path d="M15 14 L21 11 L26 15 L24 21 L17 21 Z" fill="${stroke}" fill-opacity=".35"/>
  <path d="M15 14 L9 12 M26 15 L32 13 M24 21 L28 27 M17 21 L12 27 M21 11 L21 6"/>
  <path d="M8 31 Q14 27 20 31 Q27 27 34 31" stroke-opacity=".8"/>
  <path d="M30 22 Q33 24 32 28" stroke-opacity=".6"/></g>
  <ellipse cx="${x + 20.5 * s}" cy="${y + 35.5 * s}" rx="${17 * s}" ry="${2.2 * s}" fill="#000" opacity=".35"/>`;
const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${body}</svg>`;

// A · Bronze fosco: bronze apagado, liso, só a textura do metal.
const bronze = svg(`<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3d26"/><stop offset="1" stop-color="#1c120a"/></linearGradient>
  <pattern id="br" width="5" height="5" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="5" y2="0" stroke="#c08a5a" stroke-opacity=".05"/></pattern>`,
  `<rect width="100%" height="100%" fill="url(#b)"/><rect width="100%" height="100%" fill="url(#br)"/>${ball(372, 300, 5.6, "#b78a5e", "#2a1b10")}${grain(.1)}`);

// B · Barro rachado: terra seca com rachaduras.
let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let cracks = "";
for (let i = 0; i < 26; i++) { let x = rnd() * W, y = rnd() * H, d = `M${x.toFixed(0)} ${y.toFixed(0)}`;
  for (let k = 0; k < 5; k++) { x += (rnd() - .5) * 90; y += (rnd() - .5) * 90; d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; }
  cracks += `<path d="${d}" fill="none" stroke="#1a0f08" stroke-opacity=".55" stroke-width="${(1 + rnd() * 2).toFixed(1)}"/>`; }
const barro = svg(`<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b5038"/><stop offset="1" stop-color="#2a1d12"/></linearGradient>`,
  `<rect width="100%" height="100%" fill="url(#b)"/>${cracks}${ball(372, 300, 5.6, "#c2a27e", "#3a2a1b")}${grain(.12)}`);

// C · Bronze oxidado: bronze com manchas de azinhavre (verde-acinzentado), como estátua esquecida.
const oxidado = svg(`<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f3a28"/><stop offset="1" stop-color="#18110b"/></linearGradient>
  <filter id="ox"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 .42  0 0 0 0 .55  0 0 0 0 .46  0 0 0 2.2 -1.1"/></filter>`,
  `<rect width="100%" height="100%" fill="url(#b)"/><rect width="100%" height="100%" filter="url(#ox)" opacity=".55"/>${ball(372, 300, 5.6, "#a8b5a0", "#24201a")}${grain(.1)}`);

(async () => {
  await sharp(Buffer.from(bronze)).webp({ quality: 88 }).toFile(`${OUT}/murcha-bronze.webp`);
  await sharp(Buffer.from(barro)).webp({ quality: 88 }).toFile(`${OUT}/murcha-barro.webp`);
  await sharp(Buffer.from(oxidado)).webp({ quality: 88 }).toFile(`${OUT}/murcha-oxidado.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
