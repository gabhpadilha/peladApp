// Skin "Nuvem carregada" da Loja (referências do dono do app em 2026-10-31): nuvens de tempestade
// pintadas em poucos tons (cinza-azulado ao branco), `skin-nuvem.webp` (600 × 860). As nuvens
// vazando da carta foram testadas e descartadas pelo dono do app (aparecia a divisa da carta).
// Uso: node skin-nuvem.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const CW = 600, CH = 860; // carta
const BW = 714, BH = 1000; // caixa da carta de neon (carta / 0,84)
const OX = (BW - CW) / 2, OY = (BH - CH) / 2; // onde a carta começa dentro da caixa
const SS = 2;

const perm = new Uint8Array(512);
{
  let s = 31;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y) => { const a = (h / 256) * Math.PI * 2; return Math.cos(a) * x + Math.sin(a) * y; };
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const aa = perm[X + perm[Y]], ab = perm[X + perm[Y + 1]], ba = perm[X + 1 + perm[Y]], bb = perm[X + 1 + perm[Y + 1]];
  const u = fade(xf), v = fade(yf);
  const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
  const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
  return x1 + v * (x2 - x1);
}
// eslint-disable-next-line no-unused-vars
const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, fr = 1; for (let i = 0; i < o; i++) { s += a * noise(x * fr, y * fr); fr *= 2.03; a *= 0.52; } return s; };
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

// As nuvens são bolhas (círculos) empilhadas como couve-flor: cada bolha grande ganha bolhas
// menores na borda de cima e dos lados, em três gerações. As de baixo ficam na frente.
let seed = 12;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const puffs = [];
function grow(x, y, r, depth) {
  puffs.push({ x, y, r, depth });
  if (depth === 0) return;
  const kids = 4 + Math.floor(rnd() * 4);
  for (let k = 0; k < kids; k++) {
    const a = -Math.PI * (0.05 + rnd() * 0.9) + (rnd() - 0.5) * 0.6; // borda de cima e dos lados
    const rr = r * (0.42 + rnd() * 0.22);
    grow(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.78, rr, depth - 1);
  }
}
// Duas massas subindo pelas laterais, com um canal de céu escuro entre elas (como a referência),
// e uma camada embaixo.
for (let y = BH + 40; y > -120; y -= 150 + rnd() * 40) {
  grow(BW * (0.12 + rnd() * 0.12), y, 95 + rnd() * 45, 3);
  grow(BW * (0.82 + rnd() * 0.12), y + 70, 95 + rnd() * 45, 3);
}
for (let x = -40; x < BW + 60; x += 120 + rnd() * 40) grow(x, BH + 30 + rnd() * 30, 110 + rnd() * 40, 3);
puffs.sort((p, q) => p.y + p.r * 0.3 - (q.y + q.r * 0.3));

// Tons: do cinza-azulado da sombra ao branco da luz, em poucos degraus (pintura chapada).
const TONES = [[92, 102, 122], [120, 130, 150], [150, 159, 178], [182, 190, 205], [212, 218, 228], [240, 243, 247]];
const SKY_TOP = [70, 79, 98], SKY_BOTTOM = [86, 95, 114];
const LIGHT = (() => { const l = [-0.45, -0.75, 0.5], n = Math.hypot(...l); return l.map((c) => c / n); })();

// Pinta as bolhas na caixa (supersampling 2x): cor e cobertura da nuvem (sem o céu).
const RW = BW * SS, RH = BH * SS;
function paint(list) {
  const color = new Float32Array(RW * RH * 3);
  const cover = new Float32Array(RW * RH);
  for (let i = 0; i < RW * RH; i++) {
    const v = Math.floor(i / RW) / RH;
    for (let c = 0; c < 3; c++) color[i * 3 + c] = SKY_TOP[c] + (SKY_BOTTOM[c] - SKY_TOP[c]) * v;
  }
  for (const p of list) {
    const R = p.r * SS * 1.1, cx = p.x * SS, cy = p.y * SS;
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(RW - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(RH - 1, Math.ceil(cy + R));
    // Bolhas do alto da massa pegam mais luz.
    const lift = 0.12 * (3 - p.depth) - 0.15 * (p.y / BH);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / (p.r * SS), dy = (y - cy) / (p.r * SS);
        const ang = Math.atan2(dy, dx);
        const edge = 1 + 0.07 * noise(Math.cos(ang) * 3 + p.x * 0.01, Math.sin(ang) * 3 + p.y * 0.01) + 0.04 * noise(Math.cos(ang) * 9, Math.sin(ang) * 9 + p.r);
        const d = Math.hypot(dx, dy) / edge;
        if (d >= 1) continue;
        const nz = Math.sqrt(1 - d * d);
        const lam = clamp(dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]);
        const mottle = 0.08 * noise(x / (SS * 14), y / (SS * 14));
        const t = clamp(0.18 + lam * 0.72 + lift + mottle);
        const tone = TONES[Math.min(TONES.length - 1, Math.floor(t * TONES.length))];
        const aa = clamp((1 - d) * p.r * SS * 0.5); // borda suave de ~2px
        const i = y * RW + x;
        for (let c = 0; c < 3; c++) color[i * 3 + c] += (tone[c] - color[i * 3 + c]) * aa;
        cover[i] = Math.max(cover[i], aa);
      }
    }
  }
  return { color, cover };
}
const full = paint(puffs);
function crop({ color, cover }, x, y, width, height, alphaAt) {
  const buf = Buffer.alloc(width * SS * height * SS * 4);
  for (let yy = 0; yy < height * SS; yy++) {
    for (let xx = 0; xx < width * SS; xx++) {
      const sx = x * SS + xx, sy = y * SS + yy, i = sy * RW + sx, o = (yy * width * SS + xx) * 4;
      const a = alphaAt ? alphaAt(sx / SS, sy / SS) * cover[i] : 1;
      buf[o] = color[i * 3]; buf[o + 1] = color[i * 3 + 1]; buf[o + 2] = color[i * 3 + 2]; buf[o + 3] = Math.round(a * 255);
    }
  }
  return sharp(buf, { raw: { width: width * SS, height: height * SS, channels: 4 } }).resize(width, height);
}

(async () => {
  await crop(full, OX, OY, CW, CH, null).webp({ quality: 90 }).toFile(`${OUT}/skin-nuvem.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
