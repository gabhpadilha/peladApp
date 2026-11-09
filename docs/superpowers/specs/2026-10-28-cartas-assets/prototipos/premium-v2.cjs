// Skins premium com cristais, versão do Gemini (2026-11-01): uma arte só do dono do app
// (`premium-v2-dono.jpg`, 1342 × 2000: safira com fio de ouro, neon azul e um aglomerado de cristais
// que passa por cima da moldura, sobre preto), reaproveitada em todas as pedras girando só o tom dos
// azuis (o ouro fica). Ajustes feitos aqui, sem gastar mais geração: o espaço preto entre o fio de ouro
// e o neon é redesenhado (concêntrico ao ouro, com o mesmo respiro nos quatro lados e nos cantos: o da
// arte tem o canto mais fechado que o do ouro), mantendo o neon original só ao lado do aglomerado de
// cristais, onde eles passam por cima; e a altura da carta vai para 5:7.
// Saem `premium-<pedra>.webp` (fundo, na janela da carta) e `premium-<pedra>-vaza.webp` (moldura e
// cristais por fora da carta, mais uma beirada por dentro, por cima da carta).
// Uso: node premium-v2.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "premium-v2-dono.jpg");

// Borda de fora do fio de ouro (medida) = borda da carta, e o vão preto até o neon em cada lado.
const EDGE = { left: 212, right: 1129, top: 342, bottom: 1658 };
const GAP = { left: 34, right: 31, top: 35, bottom: 35 };
const GAP_AFTER = 14; // vão que sobra entre o ouro e o neon (px da arte; o original tinha ~34)
const RADIUS = 54; // raio do canto de fora do fio de ouro (medido, px da arte)
const BG = 12; // o preto da arte não é puro

const BW = 714, BH = 1000; // caixa da carta de neon: a carta nos 84% do meio
// O aglomerado de cristais passa da sobra de 8% da caixa: a imagem de fora é mais larga, só para a direita
// (`overflowWidth` = OUT_W / BW na roupa, em `components/cancha-card.tsx`).
const OUT_W = 774;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const SX = CW / (EDGE.right - EDGE.left), SY = CH / (EDGE.bottom - EDGE.top);
const CORNER = RADIUS * SX; // raio do canto do fio de ouro na caixa (px)
const BAND = CW * 0.029; // por dentro da borda: cobre o ouro e o cantinho que a janela arredondada deixa
const FADE = 6;

const GEMS = {
  safira: { hue: 222, sat: 1, light: 1, neon: "#36a6ff" },
  esmeralda: { hue: 150, sat: 0.95, light: 0.95, neon: "#2dffa0" },
  ametista: { hue: 278, sat: 0.95, light: 1.05, neon: "#c46bff" },
  rubi: { hue: 348, sat: 1, light: 1, neon: "#ff2f66" },
  // Ícone (2026-11-09): a mesma arte, com os azuis viram marfim e prata-claro (quase sem cor, bem mais claros); o ouro fica.
  marfim: { hue: 42, sat: 0.25, light: 3, neon: "#ffcf4d" },
};
// Trecho do lado direito em que o aglomerado de cristais passa pelo neon (na arte, px): ali fica o neon dela.
const CRYSTAL_ZONE = { top: 420, bottom: 1340 };
const NEON_THICK = 12; // espessura do tubo de neon na arte (px)
const SOURCE_HUE = 222;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
/** Gira só os azuis (fundo, cristais, neon); o ouro e os brancos ficam. */
function recolor(r, g, b, gem) {
  if (gem.hue === SOURCE_HUE) return [r, g, b];
  const [h, s, l] = rgbToHsl(r, g, b);
  const blueness = smooth(150, 175, h) * (1 - smooth(275, 300, h)) * smooth(0.08, 0.2, s);
  if (blueness === 0) return [r, g, b];
  const [nr, ng, nb] = hslToRgb(h + (gem.hue - SOURCE_HUE), clamp(s * gem.sat), clamp(l * gem.light));
  return [r + (nr - r) * blueness, g + (ng - g) * blueness, b + (nb - b) * blueness];
}

/** Distância (px da arte) a partir da borda da carta para fora, com o vão preto encolhido. */
const warp = (d, gap) => (d < GAP_AFTER ? (d * gap) / GAP_AFTER : d + (gap - GAP_AFTER));
/**
 * Ponto da arte que vai para (x, y) da caixa. Por dentro da carta é só a escala; por fora, a distância
 * até o fio de ouro é medida pela curva (cantos redondos) e o vão preto encolhe nessa direção.
 */
function mapPoint(x, y) {
  const u = EDGE.left + (x - CX0) / SX, v = EDGE.top + (y - CY0) / SY;
  const cx = clamp(u, EDGE.left + RADIUS, EDGE.right - RADIUS), cy = clamp(v, EDGE.top + RADIUS, EDGE.bottom - RADIUS);
  const dx = u - cx, dy = v - cy, dist = Math.hypot(dx, dy), d = dist - RADIUS;
  if (d <= 0) return [u, v];
  const nx = dx / dist, ny = dy / dist;
  const gap = Math.abs(nx) * (nx < 0 ? GAP.left : GAP.right) + Math.abs(ny) * (ny < 0 ? GAP.top : GAP.bottom);
  const r = RADIUS + warp(d, gap);
  return [cx + nx * r, cy + ny * r, d, gap, u, v];
}

/** Peso do neon da arte no ponto (d = distância ao ouro): 1 no tubo e no brilho perto dele, 0 fora; no brilho longe só o que é fraco e azulado. */
function neonWeight(d, gap, r, g, b) {
  if (d < 1.5) return 0; // o miolo do fio de ouro; o vão até o neon é preto (nos cantos a arte põe o neon mais perto)
  if (d <= gap + 45) return 1;
  return d <= gap + 120 && Math.max(r, g, b) < 120 && b > r ? 1 : 0;
}

/** O neon novo em volta do ouro: tubo, brilho e miolo claro (por baixo dos cristais). */
function ringSvg(gem) {
  const off = (GAP_AFTER + NEON_THICK / 2) * SX;
  const mix = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `rgb(${[16, 8, 0].map((sh) => Math.round(((n >> sh) & 255) * (1 - k) + 255 * k)).join(",")})`; };
  const rect = `x="${CX0 - off}" y="${CY0 - off}" width="${CW + 2 * off}" height="${CH + 2 * off}" rx="${CORNER + off}" fill="none"`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${BH}">
    <defs><filter id="a" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6"/></filter></defs>
    <rect ${rect} stroke="${gem.neon}" stroke-opacity="0.45" stroke-width="18" filter="url(#a)"/>
    <rect ${rect} stroke="${gem.neon}" stroke-opacity="0.8" stroke-width="8" filter="url(#b)"/>
    <rect ${rect} stroke="${gem.neon}" stroke-width="4.4"/>
    <rect ${rect} stroke="${mix(gem.neon, 0.75)}" stroke-width="2.2"/>
  </svg>`);
}
/** Some o neon novo ao lado do aglomerado (ali vale o da arte). */
function ringMask(x, y) {
  const y0 = CY0 + (CRYSTAL_ZONE.top - EDGE.top) * SY, y1 = CY0 + (CRYSTAL_ZONE.bottom - EDGE.top) * SY;
  const inV = smooth(y0 - 14, y0 + 2, y) * (1 - smooth(y1 - 2, y1 + 14, y));
  const inH = smooth(CX0 + CW * 0.5, CX0 + CW * 0.5 + 40, x);
  return 1 - inV * inH;
}
/** Profundidade para dentro da carta (negativa fora), com cantos arredondados. */
function depth(x, y) {
  const lx = x - CX0, ly = y - CY0;
  if (lx <= 0 || ly <= 0 || lx >= CW || ly >= CH) return -1;
  const cx = Math.min(Math.max(lx, CORNER), CW - CORNER), cy = Math.min(Math.max(ly, CORNER), CH - CORNER);
  const d = Math.hypot(lx - cx, ly - cy);
  return d > CORNER ? -1 : d > 0 ? CORNER - d : Math.min(lx, ly, CW - lx, CH - ly);
}

(async () => {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const at = (x, y, k) => data[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 3 + k];
  const sample = (fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    return [0, 1, 2].map((k) => at(x0, y0, k) * (1 - tx) * (1 - ty) + at(x0 + 1, y0, k) * tx * (1 - ty) + at(x0, y0 + 1, k) * (1 - tx) * ty + at(x0 + 1, y0 + 1, k) * tx * ty);
  };

  for (const [name, gem] of Object.entries(GEMS)) {
    // Fundo: a janela da carta (1,7% da largura e 1,21% da altura para dentro).
    const w = (EDGE.right - EDGE.left), h = (EDGE.bottom - EDGE.top);
    const win = { left: EDGE.left + w * 0.017, top: EDGE.top + h * 0.0121, width: w * 0.966, height: h * 0.9758 };
    const FW = 600, FH = 860;
    const bg = Buffer.alloc(FW * FH * 3);
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < FW; x++) {
        const [r, g, b] = sample(win.left + ((x + 0.5) / FW) * win.width, win.top + ((y + 0.5) / FH) * win.height);
        const [nr, ng, nb] = recolor(r, g, b, gem);
        const o = (y * FW + x) * 3;
        bg[o] = clamp(nr, 0, 255); bg[o + 1] = clamp(ng, 0, 255); bg[o + 2] = clamp(nb, 0, 255);
      }
    }
    await sharp(bg, { raw: { width: FW, height: FH, channels: 3 } }).webp({ quality: 92 }).toFile(`${OUT}/premium-${name}.webp`);

    // Moldura e cristais: tudo por fora da carta (preto da arte vira transparente) e uma beirada por dentro.
    const vaza = Buffer.alloc(OUT_W * BH * 4);
    for (let y = 0; y < BH; y++) {
      for (let x = 0; x < OUT_W; x++) {
        const d = depth(x, y);
        if (d > BAND + FADE) continue;
        const [sx, sy, dRaw, gap, u, v] = mapPoint(x + 0.5, y + 0.5);
        const [r, g, b] = sample(sx, sy);
        // O neon da arte some (aos poucos) onde o novo aparece; ao lado do aglomerado vale o da arte.
        const keepArt = d < 0 ? 1 - neonWeight(dRaw, gap, r, g, b) * ringMask(x, y) : 1;
        const key = smooth(10, 45, Math.max(Math.abs(r - BG), Math.abs(g - BG), Math.abs(b - BG)));
        const alpha = (d < 0 ? key : 1 - smooth(BAND, BAND + FADE, d)) * keepArt;
        if (alpha <= 0) continue;
        const [nr, ng, nb] = recolor(r, g, b, gem);
        const o = (y * OUT_W + x) * 4;
        vaza[o] = clamp(nr, 0, 255); vaza[o + 1] = clamp(ng, 0, 255); vaza[o + 2] = clamp(nb, 0, 255); vaza[o + 3] = Math.round(alpha * 255);
      }
    }
    const ring = await sharp(ringSvg(gem)).ensureAlpha().raw().toBuffer();
    for (let y = 0; y < BH; y++) for (let x = 0; x < OUT_W; x++) { const o = (y * OUT_W + x) * 4 + 3; ring[o] = Math.round(ring[o] * ringMask(x, y)); }
    const art = await sharp(vaza, { raw: { width: OUT_W, height: BH, channels: 4 } }).png().toBuffer();
    await sharp(ring, { raw: { width: OUT_W, height: BH, channels: 4 } }).composite([{ input: art }]).webp({ quality: 90, alphaQuality: 95 }).toFile(`${OUT}/premium-${name}-vaza.webp`);
  }
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
