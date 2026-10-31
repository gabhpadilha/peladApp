// Cenário do evento de novembro (Toró) na mesa tática: QUADRA ALAGADA, renderizada pixel a pixel
// (pedido do dono do app em 2026-10-31: textura de verdade, não desenho chapado). Uma lâmina de
// água cobre a quadra: o piso e as linhas aparecem por baixo, tremidos pela refração; as ondas
// dos pingos e um marulho leve formam o relevo da água, que reflete os refletores dos cantos.
// O meio fica escuro para as cartas lerem bem; sem linhas (cada campo da mesa desenha as suas). Gera public/mesa/temporal.webp (800 × 1480).
// Uso: node docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/mesa-temporal.cjs
const path = require("node:path");
const sharp = require("sharp");

const W = 800;
const H = 1480;
const OUT = path.join(__dirname, "../../../../../public/mesa/temporal.webp");

let seed = 9;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };

// Ruído de gradiente (marulho).
const perm = new Uint8Array(512);
{
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
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

// Relevo da água: marulho + anéis dos pingos (somados só na área de cada anel).
const height = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    height[y * W + x] = 0.6 * noise(x / 140, y / 90) + 0.25 * noise(x / 45, y / 30);
  }
}
for (let n = 0; n < 260; n++) {
  const cx = rnd() * W, cy = rnd() * H, r0 = 6 + rnd() * 34, k = 0.45 + rnd() * 0.5;
  const R = r0 * 2.2;
  for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(H, cy + R); y++) {
    for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(W, cx + R); x++) {
      // Anéis achatados (a quadra é vista meio de cima): distância com o eixo y esticado.
      const d = Math.hypot(x - cx, (y - cy) * 1.25);
      if (d > R) continue;
      const wave = Math.sin((d - r0) * 0.55) * Math.exp(-Math.abs(d - r0) / (r0 * 0.45)) * (1 - d / R);
      height[y * W + x] += wave * k;
    }
  }
}

// Piso da quadra (sob a água): azul-petróleo escuro com as faixas do piso. Sem linhas: cada campo
// da mesa já desenha as suas (`PitchLines`), e a arte estica sobre cada time.
function floor(x, y) {
  const stripe = Math.floor(y / 92) % 2 ? 0.03 : 0;
  const grain = 4 * noise(x / 6, y / 60);
  return [10 + stripe * 255 + grain, 22 + stripe * 255 + grain, 27 + stripe * 255 + grain];
}

// Refletores nos cantos (posição na "parede", para o reflexo especular).
const LIGHTS = [[-60, -80], [W + 60, -80], [-60, H + 80], [W + 60, H + 80]];

const buf = Buffer.alloc(W * H * 3);
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const hx = height[y * W + x + 1] - height[y * W + x - 1];
    const hy = height[(y + 1) * W + x] - height[(y - 1) * W + x];
    // Refração: o piso aparece deslocado pela inclinação da água.
    const [fr, fg, fb] = floor(x + hx * 26, y + hy * 26);
    let nx = -hx * 3.2, ny = -hy * 3.2, nz = 1;
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    // Reflexo do céu de tempestade (fresnel simples: mais reflexo onde a água inclina).
    const fresnel = 0.12 + 0.6 * (1 - nz);
    let r = fr * (1 - fresnel) + 26 * fresnel, g = fg * (1 - fresnel) + 40 * fresnel, b = fb * (1 - fresnel) + 64 * fresnel;
    // Brilho dos refletores: especular na direção de cada luz, mais forte perto do canto.
    for (const [lx, ly] of LIGHTS) {
      const dx = lx - x, dy = ly - y, dist = Math.hypot(dx, dy);
      const lxn = dx / dist, lyn = dy / dist;
      const hxn = lxn * 0.55, hyn = lyn * 0.55, hzn = 0.83; // meio do caminho entre luz e olho
      const spec = Math.pow(Math.max(0, nx * hxn + ny * hyn + nz * hzn), 28);
      const fall = Math.exp(-dist / 420);
      r += 230 * spec * fall + 14 * fall; g += 240 * spec * fall + 24 * fall; b += 255 * spec * fall + 42 * fall;
    }
    // Vinheta: o centro (onde ficam as cartas) mais escuro.
    const vx = (x / W - 0.5) * 2, vy = (y / H - 0.5) * 2;
    const vig = 0.45 + 0.55 * smooth(0.25, 1.15, Math.hypot(vx * 0.9, vy));
    const i = (y * W + x) * 3;
    buf[i] = Math.min(255, r * vig); buf[i + 1] = Math.min(255, g * vig); buf[i + 2] = Math.min(255, b * vig);
  }
}

sharp(buf, { raw: { width: W, height: H, channels: 3 } })
  .webp({ quality: 84 })
  .toFile(OUT)
  .then((info) => console.log("ok", OUT, info.size));
