// Fundos de "energia" e luz de contorno (rim light) para a prévia rica.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function energy(name, c) {
  seed = c.seed; let streaks = "", shards = "", sparks = "";
  for (let i = 0; i < 38; i++) { const x = -200 + rnd() * (W + 400), len = 200 + rnd() * 700, w = .6 + rnd() * 3.4;
    streaks += `<line x1="${x}" y1="${H + 50}" x2="${x + len * .55}" y2="${H + 50 - len}" stroke="url(#st)" stroke-width="${w.toFixed(1)}" opacity="${(.15 + rnd() * .6).toFixed(2)}"/>`; }
  for (let i = 0; i < 14; i++) { const cx = W * (.55 + rnd() * .5), cy = H * (rnd() * .45), s = 40 + rnd() * 120, a = rnd() * 6.28;
    const P = [0, 2.1, 3.6].map((o, k) => `${(cx + s * (k === 1 ? .35 : 1) * Math.cos(a + o)).toFixed(1)},${(cy + s * (k === 1 ? .35 : 1) * Math.sin(a + o)).toFixed(1)}`).join(" ");
    shards += `<polygon points="${P}" fill="url(#gd)" opacity="${(.35 + rnd() * .55).toFixed(2)}"/>`; }
  for (let i = 0; i < 60; i++) { const x = rnd() * W, y = rnd() * H * .8, r = .6 + rnd() * 2.4;
    sparks += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" opacity="${(.3 + rnd() * .7).toFixed(2)}"/>`; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="base" cx=".55" cy=".3" r=".9"><stop offset="0" stop-color="${c.mid}"/><stop offset=".55" stop-color="${c.deep}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
      <linearGradient id="st" x1="0" y1="1" x2=".55" y2="0"><stop offset="0" stop-color="${c.streak}" stop-opacity="0"/><stop offset=".6" stop-color="${c.streak}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d0"/><stop offset=".5" stop-color="${c.gold}"/><stop offset="1" stop-color="${c.goldDark}"/></linearGradient>
      <radialGradient id="burst" cx=".52" cy=".3" r=".42"><stop offset="0" stop-color="${c.burst}" stop-opacity=".95"/><stop offset=".35" stop-color="${c.burst}" stop-opacity=".45"/><stop offset="1" stop-color="${c.burst}" stop-opacity="0"/></radialGradient>
      <filter id="bl"><feGaussianBlur stdDeviation="2.2"/></filter>
      <filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#base)"/>
    <g>${Array.from({length: 18}, (_, i) => `<polygon points="${W * .52},${H * .3} ${W * .52 + 900 * Math.cos(i / 18 * 6.28)},${H * .3 + 900 * Math.sin(i / 18 * 6.28)} ${W * .52 + 900 * Math.cos(i / 18 * 6.28 + .07)},${H * .3 + 900 * Math.sin(i / 18 * 6.28 + .07)}" fill="${c.ray}" opacity=".10"/>`).join("")}</g>
    <g filter="url(#bl)">${streaks}</g>${shards}
    <rect width="100%" height="100%" fill="url(#burst)"/>${sparks}
    <rect width="100%" height="100%" filter="url(#gr)" opacity=".09"/>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(`${OUT}/en-${name}.webp`);
}

async function rim(name, color) {
  const src = path.resolve(process.argv[3], "public/cartas/exemplo-jogador.webp");
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info; const A = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) A[i] = data[i * 4 + 3] / 255;
  const out = Buffer.alloc(w * h);
  const shifts = [[13, 10, 1], [-12, 10, .8]];          // luz vinda de cima à esquerda e (mais fraca) à direita
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0;
    for (const [dx, dy, k] of shifts) { const sx = x + dx, sy = y + dy;
      const s = sx >= 0 && sy >= 0 && sx < w && sy < h ? A[sy * w + sx] : 0; v = Math.max(v, A[y * w + x] * (1 - s) * k); }
    out[y * w + x] = Math.round(Math.min(1, v) * 255); }
  const soft = await sharp(out, { raw: { width: w, height: h, channels: 1 } }).blur(2.4).raw().toBuffer();
  for (let i = 0; i < w * h; i++) soft[i] = Math.min(255, Math.round(soft[i] * A[i] * 1.35));   // fica só dentro da silhueta
  const [r, g, b] = color;
  await sharp({ create: { width: w, height: h, channels: 3, background: { r, g, b } } })
    .joinChannel(soft, { raw: { width: w, height: h, channels: 1 } }).webp({ quality: 90 }).toFile(`${OUT}/rim-${name}.webp`);
}

(async () => {
  await energy("turquesa", { seed: 3, mid: "#1fb5a6", deep: "#0b5a63", dark: "#04161c", streak: "#9ffff0", gold: "#f2c94c", goldDark: "#8a6110", burst: "#fff3c4", ray: "#e9fff9" });
  await energy("rubi", { seed: 8, mid: "#e0324b", deep: "#6d0b24", dark: "#16030a", streak: "#ffc2cc", gold: "#f2c94c", goldDark: "#8a6110", burst: "#ffe2b8", ray: "#fff0f0" });
  await energy("ametista", { seed: 5, mid: "#8b5cf6", deep: "#3b1a7a", dark: "#0c0620", streak: "#e4d4ff", gold: "#9fe7ff", goldDark: "#3b6ea8", burst: "#f3e8ff", ray: "#f5efff" });
  await rim("turquesa", [170, 255, 240]);
  await rim("rubi", [255, 205, 160]);
  await rim("ametista", [210, 230, 255]);
  console.log("ok");
})().catch(e => { console.error(e); process.exit(1); });
