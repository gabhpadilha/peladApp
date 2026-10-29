// Fundos foscos para a carta padrão: sem brilho, só textura de papel.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
const paper = (o, seed) => `<filter id="p${seed}"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="${seed}"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#p${seed})" opacity="${o}"/>`;
const make = (top, bottom, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${extra}${paper(.07, 4)}</svg>`;
const cx = W / 2, cy = H * .36;
const courtLines = `<g fill="none" stroke="#c6f24e" stroke-opacity=".10" stroke-width="3"><line x1="0" y1="${cy}" x2="${W}" y2="${cy}"/><circle cx="${cx}" cy="${cy}" r="110"/></g>`;
(async () => {
  await sharp(Buffer.from(make("#1d2420", "#121714"))).webp({ quality: 88 }).toFile(`${OUT}/bg-fosco-grafite.webp`);
  await sharp(Buffer.from(make("#1b2b21", "#0f1913", courtLines))).webp({ quality: 88 }).toFile(`${OUT}/bg-fosco-quadra.webp`);
  await sharp(Buffer.from(make("#26241f", "#171612"))).webp({ quality: 88 }).toFile(`${OUT}/bg-fosco-papel.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
