// Fundos das skins de Halloween no formato novo (Lobisomem com o lobo desenhado pelo dono do app).
const path = require("path");
const fs = require("fs");
const root = process.argv[3];
const sharp = require(path.resolve(root, "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
const card = fs.readFileSync(path.resolve(root, "components/player-card.tsx"), "utf8");
const WOLF = card.match(/const WEREWOLF_HEAD =\s*"([^"]+)"/)[1];
const grain = `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity=".08"/>`;
let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stars = Array.from({ length: 40 }, () => `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H * .55).toFixed(0)}" r="${(.6 + rnd() * 1.4).toFixed(1)}" fill="#fff" opacity="${(.2 + rnd() * .5).toFixed(2)}"/>`).join("");

const lobisomem = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c4866"/><stop offset=".6" stop-color="#0c1a2a"/><stop offset="1" stop-color="#03070d"/></linearGradient>
  <radialGradient id="moon" cx=".42" cy=".38" r=".62"><stop offset="0" stop-color="#f4f8ff"/><stop offset=".85" stop-color="#c9dcf5"/><stop offset="1" stop-color="#9fb6d6"/></radialGradient>
  <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset=".45" stop-color="#cfe2ff" stop-opacity=".35"/><stop offset="1" stop-color="#cfe2ff" stop-opacity="0"/></radialGradient>
  <linearGradient id="wolf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1a2a" stop-opacity=".8"/><stop offset=".7" stop-color="#0c1a2a" stop-opacity=".7"/><stop offset="1" stop-color="#0c1a2a" stop-opacity="0"/></linearGradient>
  <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb6d6" stop-opacity="0"/><stop offset="1" stop-color="#9fb6d6" stop-opacity=".22"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#sky)"/>${stars}
  <circle cx="300" cy="300" r="300" fill="url(#halo)"/>
  <circle cx="300" cy="300" r="175" fill="url(#moon)" opacity=".85"/>
  <circle cx="250" cy="260" r="20" fill="#7f96b6" opacity=".25"/><circle cx="345" cy="340" r="28" fill="#7f96b6" opacity=".2"/><circle cx="330" cy="225" r="12" fill="#7f96b6" opacity=".25"/><circle cx="270" cy="380" r="10" fill="#7f96b6" opacity=".22"/>
  <path d="${WOLF}" transform="translate(360 150) scale(3.6)" fill="url(#wolf)" fill-rule="evenodd"/>
  <g stroke="#e6edf5" stroke-opacity=".28" stroke-width="5" stroke-linecap="round" fill="none">
    <path d="M560 520 Q520 580 492 650"/><path d="M582 540 Q542 600 514 670"/><path d="M604 560 Q564 620 536 690"/></g>
  <rect y="${H * .55}" width="${W}" height="${H * .45}" fill="url(#mist)"/>${grain}</svg>`;

const bat = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0,0 Q1.2,-1.4 2.6,-0.6 Q3.4,-1.8 4.2,-0.4 L4.6,-1.2 L5,-0.4 Q5.8,-1.8 6.6,-0.6 Q8,-1.4 9.2,0 Q7.6,0 6.8,1.2 Q5.8,0.6 4.6,1.6 Q3.4,0.6 2.4,1.2 Q1.6,0 0,0 Z"/>`;
const vampiro = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <radialGradient id="vel" cx=".5" cy=".35" r=".9"><stop offset="0" stop-color="#6a0f22"/><stop offset=".55" stop-color="#2a0510"/><stop offset="1" stop-color="#0d0105"/></radialGradient>
  <pattern id="dam" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M30 6 Q42 18 30 30 Q18 18 30 6 Z M30 30 Q42 42 30 54 Q18 42 30 30 Z M6 30 Q18 18 30 30 Q18 42 6 30 Z M54 30 Q42 18 30 30 Q42 42 54 30 Z" fill="#ff8090" opacity=".045"/></pattern>
  <radialGradient id="bm" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7a8a"/><stop offset=".6" stop-color="#c41a32"/><stop offset="1" stop-color="#c41a32" stop-opacity="0"/></radialGradient>
  <linearGradient id="drip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a0f22"/><stop offset="1" stop-color="#c41a32"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#vel)"/><rect width="100%" height="100%" fill="url(#dam)"/>
  <circle cx="470" cy="220" r="150" fill="url(#bm)" opacity=".75"/>
  <circle cx="470" cy="220" r="78" fill="#ff8090" opacity=".25"/>
  <g fill="#050001" opacity=".92">${bat(400, 210, 9)}${bat(480, 150, 6)}${bat(500, 270, 4.5)}${bat(380, 120, 3.6)}${bat(120, 180, 3)}</g>
  <g fill="url(#drip)"><path d="M70 0 H100 L98 60 Q104 90 85 94 Q66 90 72 60 Z"/><path d="M118 0 H136 L135 34 Q139 52 127 55 Q115 52 119 34 Z"/><path d="M160 0 H172 L171 22 Q174 34 166 36 Q158 34 161 22 Z"/></g>${grain}</svg>`;

(async () => {
  await sharp(Buffer.from(lobisomem)).webp({ quality: 88 }).toFile(`${OUT}/skin-lobisomem.webp`);
  await sharp(Buffer.from(vampiro)).webp({ quality: 88 }).toFile(`${OUT}/skin-vampiro.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
