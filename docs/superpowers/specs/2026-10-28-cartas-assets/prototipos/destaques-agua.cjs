// Fundos candidatos dos destaques com a água (referências do dono do app em 2026-10-31), em azul
// escuro: A · cáusticas (a rede de luz no fundo da piscina), B · mármore líquido, C · topografia.
// Pintados pixel a pixel com ruído distorcido (domain warping).
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;

// Ruído de gradiente 2D com permutação fixa: a arte sai igual a cada execução.
const perm = new Uint8Array(512);
{
  let s = 42;
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y) {
  const a = (h / 256) * Math.PI * 2;
  return Math.cos(a) * x + Math.sin(a) * y;
}
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const X = xi & 255, Y = yi & 255;
  const aa = perm[X + perm[Y]], ab = perm[X + perm[Y + 1]], ba = perm[X + 1 + perm[Y]], bb = perm[X + 1 + perm[Y + 1]];
  const u = fade(xf), v = fade(yf);
  const x1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
  const x2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
  return x1 + v * (x2 - x1);
}
function fbm(x, y, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    freq *= 2;
    amp *= 0.5;
  }
  return sum;
}
// Distorção em duas camadas: é o que dá o ar de líquido.
function warped(x, y, strength, octaves = 4) {
  const qx = fbm(x + 1.7, y + 9.2, octaves), qy = fbm(x + 8.3, y + 2.8, octaves);
  const rx = fbm(x + strength * qx + 4.1, y + strength * qy + 7.3, octaves), ry = fbm(x + strength * qx + 1.2, y + strength * qy + 5.5, octaves);
  return fbm(x + strength * rx, y + strength * ry, octaves);
}

const hex = (c) => c.match(/\w\w/g).map((h) => parseInt(h, 16));
const lerp = (a, b, t) => a + (b - a) * t;
const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp = (v) => Math.max(0, Math.min(1, v));

function paint(pixel) {
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = pixel(x / W, y / H);
      const i = (y * W + x) * 3;
      buf[i] = Math.round(clamp(r / 255) * 255);
      buf[i + 1] = Math.round(clamp(g / 255) * 255);
      buf[i + 2] = Math.round(clamp(b / 255) * 255);
    }
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 3 } });
}

// A · Cáusticas: rede de linhas de luz que acende de cima para baixo.
const causticas = () => {
  const top = hex("020611"), bottom = hex("0a2c66"), light = hex("37c8ff");
  return paint((u, v) => {
    // Linhas onde o ruído cruza o zero: uma rede fina, como a luz no fundo da piscina.
    const n = warped(u * 6, v * 8.4, 1.4, 3);
    const ridge = Math.pow(clamp(1 - Math.abs(n) / 0.035), 2) + Math.pow(clamp(1 - Math.abs(n) / 0.12), 3) * 0.25;
    const base = mixRgb(top, bottom, Math.pow(v, 1.4));
    const k = clamp(ridge * (0.25 + 0.75 * Math.pow(v, 1.2)));
    return mixRgb(base, light, k);
  });
};

// B · Mármore líquido: faixas de dois azuis com o fio claro na borda de cada uma.
const marmore = () => {
  const deep = hex("040e2c"), mid = hex("0d2a6e"), edge = hex("5fb0ff"), shine = hex("bfe2ff");
  return paint((u, v) => {
    const n = warped(u * 1.6, v * 2.1, 2.6, 2) * 6;
    const f = n - Math.floor(n);
    const band = f < 0.5 ? deep : mid;
    const d = Math.min(Math.abs(f - 0.5), f, 1 - f);
    const line = Math.pow(clamp(1 - d / 0.035), 2);
    const gloss = Math.pow(clamp(1 - Math.abs(f - 0.75) / 0.12), 3) * 0.18;
    let c = mixRgb(band, edge, line * 0.75);
    c = mixRgb(c, shine, gloss);
    return mixRgb(c, hex("01040d"), Math.pow(1 - v, 2) * 0.45);
  });
};

// C · Topografia: curvas de nível finas e acesas, algumas mais fortes.
const topografia = () => {
  const top = hex("030a24"), bottom = hex("0a2470"), line = hex("4aa8ff"), strong = hex("a9d8ff");
  return paint((u, v) => {
    const n = warped(u * 1.4, v * 1.8, 1.1, 2) * 40;
    const f = n - Math.floor(n);
    const d = Math.min(f, 1 - f);
    const thin = Math.pow(clamp(1 - d / 0.09), 3);
    const isMajor = ((Math.floor(n + 0.5) % 5) + 5) % 5 === 0;
    const base = mixRgb(top, bottom, 0.25 + 0.6 * Math.sin(Math.PI * v * 0.9));
    return mixRgb(base, isMajor ? strong : line, thin * (isMajor ? 0.9 : 0.55));
  });
};

// Aprovada pelo dono do app em 2026-10-31: a B (mármore líquido) vira o fundo dos destaques,
// com a nuvem chovendo em neon no topo (`NEON_TRIMS.chuva`). A e C ficaram de fora.
// Uso: node destaques-agua.cjs public/cartas/fundos <raiz do repo>
(async () => {
  await marmore().webp({ quality: 88 }).toFile(`${OUT}/premio-destaque-agua.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
