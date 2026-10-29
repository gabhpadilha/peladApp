// Fundo lapidado (aprovado na Esmeralda) nas cores das 7 skins premium.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
const GEMS = {
  esmeralda: { hue: 150, sat: 70, light: 38, base: "#03140c", glow: "#c8ffe6" },
  safira: { hue: 220, sat: 72, light: 40, base: "#040a1c", glow: "#cfe0ff" },
  ametista: { hue: 275, sat: 60, light: 40, base: "#0e0620", glow: "#ead8ff" },
  rubi: { hue: 350, sat: 72, light: 38, base: "#1a0309", glow: "#ffd6dd" },
  turquesa: { hue: 180, sat: 70, light: 38, base: "#03161a", glow: "#c8fff8" },
  onix: { hue: 220, sat: 6, light: 20, base: "#050506", glow: "#d9dde6" },
  icone: { hue: 210, sat: 18, light: 82, base: "#b8c0cc", glow: "#ffffff" },
};
function gem(g) {
  let seed = 23; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cols = 7, rows = 11, pts = [];
  for (let j = 0; j <= rows; j++) { pts.push([]); for (let i = 0; i <= cols; i++) {
    const edge = i === 0 || j === 0 || i === cols || j === rows;
    pts[j].push([i * W / cols + (edge ? 0 : (rnd() - .5) * 60), j * H / rows + (edge ? 0 : (rnd() - .5) * 60)]); } }
  let t = "";
  const light = g.light > 60;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i], d = pts[j + 1][i + 1];
    for (const tri of (rnd() > .5 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]])) {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      const dist = Math.hypot(cx - W / 2, cy - H * .36) / 520;
      const l = light ? g.light - dist * 22 + (rnd() - .5) * 10 : g.light - dist * 28 + (rnd() - .5) * 14;
      t += `<polygon points="${tri.map((p) => p.join(",")).join(" ")}" fill="${hsl(g.hue + (rnd() - .5) * 16, g.sat, Math.max(4, l))}" stroke="${hsl(g.hue, g.sat + 10, light ? 96 : 75, light ? .35 : .12)}"/>`;
      if (rnd() > .88) t += `<polygon points="${tri.map((p) => p.join(",")).join(" ")}" fill="url(#sh)" opacity=".45"/>`;
    } }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="g" cx=".5" cy=".36" r=".5"><stop offset="0" stop-color="${g.glow}" stop-opacity=".45"/><stop offset="1" stop-color="${g.glow}" stop-opacity="0"/></radialGradient>
    <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter></defs>
    <rect width="100%" height="100%" fill="${g.base}"/>${t}<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" filter="url(#gr)" opacity=".07"/></svg>`;
}
(async () => { for (const [k, g] of Object.entries(GEMS)) await sharp(Buffer.from(gem(g))).webp({ quality: 88 }).toFile(`${OUT}/gema-${k}.webp`); console.log("ok"); })()
  .catch((e) => { console.error(e); process.exit(1); });
