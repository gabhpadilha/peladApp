// Fundos candidatos do Melhor Jogador.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860, cx = 300, cy = 300;
const grain = `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity=".08"/>`;
const rays = Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2, b = a + Math.PI / 24;
  return `<polygon points="${cx},${cy} ${cx + 1200 * Math.cos(a)},${cy + 1200 * Math.sin(a)} ${cx + 1200 * Math.cos(b)},${cy + 1200 * Math.sin(b)}" fill="#e9c86a" opacity=".13"/>`; }).join("");
const raios = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <radialGradient id="b" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#3a2a08"/><stop offset=".6" stop-color="#120c02"/><stop offset="1" stop-color="#050400"/></radialGradient>
  <radialGradient id="f" cx=".5" cy=".35" r=".4"><stop offset="0" stop-color="#ffe7a0" stop-opacity=".35"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#b)"/>${rays}<rect width="100%" height="100%" fill="url(#f)"/>${grain}</svg>`;
const cup = "M10 2h28v6h8c0 12-6 18-12 20-2 6-6 9-8 10v8h8v6H14v-6h8v-8c-2-1-6-4-8-10C8 26 2 20 2 8h8V2zm-4 10c1 7 4 11 7 12-1-4-2-8-2-12H6zm31 0c0 4-1 8-2 12 3-1 6-5 7-12h-5zM10 56h28v6H10z";
const trofeu = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1a17"/><stop offset="1" stop-color="#070706"/></linearGradient>
  <pattern id="br" width="6" height="6" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="6" y2="0" stroke="#e9c86a" stroke-opacity=".05"/></pattern></defs>
  <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#br)"/>
  <path d="${cup}" transform="translate(60 120) scale(10)" fill="#e9c86a" opacity=".09"/>${grain}</svg>`;
// Troféu mais visível: taça grande, alta (a boca e as alças aparecem acima e ao lado da cabeça),
// ouro mais forte com contorno, e um brilho atrás. Duas posições para comparar.
const trofeuV = (tx, ty, sc) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1a17"/><stop offset="1" stop-color="#070706"/></linearGradient>
  <pattern id="br" width="6" height="6" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="6" y2="0" stroke="#e9c86a" stroke-opacity=".05"/></pattern>
  <linearGradient id="cupg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d27a" stop-opacity=".42"/><stop offset=".65" stop-color="#b8902f" stop-opacity=".26"/><stop offset="1" stop-color="#b8902f" stop-opacity=".05"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".3" r=".45"><stop offset="0" stop-color="#ffe7a0" stop-opacity=".22"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#br)"/><rect width="100%" height="100%" fill="url(#glow)"/>
  <path d="${cup}" transform="translate(${tx} ${ty}) scale(${sc})" fill="url(#cupg)" stroke="#f3d27a" stroke-opacity=".55" stroke-width="${(1.6 / sc * 10).toFixed(2)}" stroke-linejoin="round"/>${grain}</svg>`;
(async () => {
  await sharp(Buffer.from(trofeuV(-36, 90, 14))).webp({ quality: 88 }).toFile(`${OUT}/craque-trofeu-centro.webp`);
  await sharp(Buffer.from(trofeuV(250, 70, 8.6))).webp({ quality: 88 }).toFile(`${OUT}/craque-trofeu-lado.webp`);
  await sharp(Buffer.from(raios)).webp({ quality: 88 }).toFile(`${OUT}/craque-raios.webp`); await sharp(Buffer.from(trofeu)).webp({ quality: 88 }).toFile(`${OUT}/craque-trofeu.webp`); console.log("ok"); })().catch((e) => { console.error(e); process.exit(1); });
