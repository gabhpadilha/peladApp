// Skin Aurora (2026-11-04, feita só em código, sem IA de imagem: os créditos do Gemini do dono acabaram).
// Aurora boreal renderizada pixel a pixel: cortinas de luz (ruído fractal esticado na vertical, com dobras
// e franja violeta), céu estrelado com a Via Láctea, cadeia de montanhas em névoa, neve caindo e,
// por cima, o cartão do estilo da Loja: fio de ouro fino por dentro, respiro preto e tubo de neon
// verde-água por fora, com a Estrela Polar no topo. A luz da aurora vaza um pouco por cima da moldura.
// Saem `premium-aurora.webp` (a janela da carta, onde ficam a foto e o texto) e `premium-aurora-vaza.webp`
// (moldura, estrela e a luz que sai da carta; caixa inteira de 714 × 1000) e `premium-aurora-luz.webp` (só as cortinas, para deslizar).
// Uso: node premium-aurora.cjs <pasta de saída> <raiz do repo> [pasta da prévia da cena]
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];

// Caixa da carta (a carta ocupa os 84% do meio, 8% de sobra por lado) e janela do conteúdo (`window: "ring"`).
const BW = 714, BH = 1000;
const CW = BW * 0.84, CH = BH * 0.84, CX0 = BW * 0.08, CY0 = BH * 0.08;
const CARD_R = 0.09 * CW; // raio do canto da carta (9% da largura)
const WIN_INSET_X = CW * 0.009, WIN_INSET_Y = CH * 0.0065;
const WIN = { l: CX0 + WIN_INSET_X, t: CY0 + WIN_INSET_Y, r: CX0 + CW - WIN_INSET_X, b: CY0 + CH - WIN_INSET_Y };
const WIN_R = CARD_R - WIN_INSET_X; // concêntrico com a carta (windowRadius = WIN_R / CW * 100)

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

let seed = 20261104;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Ruído de gradiente + fractal.
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
  return (x1 + v * (x2 - x1)) * 1.4;
}
function fbm(x, y, oct = 4) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { sum += amp * noise(x * f + i * 17.3, y * f - i * 9.1); amp *= 0.5; f *= 2.03; }
  return sum;
}

// ---------------------------------------------------------------- aurora
// u e v: coordenadas da carta (0..1; fora dela, a luz que vaza). Cada cortina tem uma curva de base
// (a franja de baixo, mais brilhante) e sobe esmaecendo; as raias verticais vêm de ruído com a
// frequência alta em x e baixa em y; as dobras, de uma senoide sobre ruído (a cortina "pregueada").
const CURTAINS = [
  { b0: 0.54, f: 1.2, ph: 0.4, n: 2.0, s: 3.1, h: 0.17, rf: 17, gain: 1.7, violet: 0.0, gate: 0.26 },
  { b0: 0.40, f: 1.8, ph: 2.1, n: 2.4, s: 8.7, h: 0.13, rf: 24, gain: 1.35, violet: 0.5, gate: 0.32 },
  { b0: 0.27, f: 1.0, ph: 4.4, n: 1.7, s: 14.2, h: 0.14, rf: 14, gain: 1.1, violet: 0.9, gate: 0.36 },
];
// Curva de base de cada cortina, calculada uma vez por coluna.
const baseCurve = CURTAINS.map((c) => {
  const arr = new Float32Array(BW);
  for (let x = 0; x < BW; x++) {
    const u = (x - CX0) / CW;
    arr[x] = c.b0 + 0.035 * Math.sin(u * c.f * 6.283 + c.ph) + 0.05 * fbm(u * c.n + c.s, c.s * 1.7, 3);
  }
  return arr;
});

function aurora(x, y, out) {
  const u = (x - CX0) / CW, v = (y - CY0) / CH;
  let R = 0, G = 0, B = 0;
  for (let k = 0; k < CURTAINS.length; k++) {
    const c = CURTAINS[k];
    const base = baseCurve[k][x];
    const d = base - v;
    if (d < -0.05 || d > c.h * 5) continue;
    const prof = smooth(-0.02, 0.012, d) * Math.exp(-Math.max(d, 0) / c.h);
    // As raias se inclinam e ondulam com a altura.
    const uw = u + 0.05 * Math.sin(v * 5.5 + c.ph) + 0.035 * fbm(u * 3 + c.s, v * 1.2, 2);
    const r1 = noise(uw * c.rf, v * 1.4 + c.s) * 0.5 + 0.5;
    const r2 = noise(uw * c.rf * 2.9 + 9, v * 0.8) * 0.5 + 0.5;
    const r3 = noise(uw * c.rf * 0.35 + 3, v * 0.5 + c.s) * 0.5 + 0.5;
    const rays = Math.pow(clamp(r1 * 0.45 + r2 * 0.2 + r3 * 0.35), 2.2);
    const pleat = 0.62 + 0.38 * Math.sin(fbm(u * 2.3 + c.s, c.s, 3) * 15 + v * 3);
    const env = smooth(c.gate, c.gate + 0.3, fbm(u * 1.7 + c.s * 3, c.s, 3) * 0.5 + 0.5);
    const I = prof * (0.1 + 1.5 * rays) * (0.45 + 0.8 * pleat) * (0.04 + 1.1 * env) * c.gain;
    if (I < 0.003) continue;
    // Cor pela altura acima da franja: verde quente → verde-água → violeta (a franja de cima).
    const t = clamp(d / (c.h * 2.6));
    let cr, cg, cb;
    if (t < 0.3) { const w = t / 0.3; cr = mix(0.3, 0.04, w); cg = 1.0; cb = mix(0.45, 0.5, w); }
    else if (t < 0.7) { const w = (t - 0.3) / 0.4; cr = mix(0.04, 0.12, w); cg = mix(1.0, 0.5, w); cb = mix(0.5, 1.0, w); }
    else { const w = (t - 0.7) / 0.3; cr = mix(0.12, 0.6, w); cg = mix(0.5, 0.1, w); cb = mix(1.0, 0.9, w); }
    // Algumas cortinas puxam mais para o violeta/magenta.
    cr = mix(cr, 0.72, c.violet * smooth(0.2, 0.9, t) * 0.8);
    cg = mix(cg, 0.2, c.violet * smooth(0.2, 0.9, t) * 0.6);
    // Borda de baixo quase branca (a franja quente).
    const hot = Math.exp(-Math.max(d, 0) / 0.012) * smooth(-0.01, 0.004, d) * 0.3;
    R += I * (cr + hot * 0.7); G += I * (cg + hot); B += I * (cb + hot * 0.8);
  }
  out[0] = R; out[1] = G; out[2] = B;
}

// ---------------------------------------------------------------- céu, estrelas, montanhas
const SKY = (v) => {
  // topo quase preto-azulado → azul-petróleo no horizonte (brilho do ar).
  const t = smooth(-0.1, 0.8, v);
  return [mix(0.0002, 0.0014, t * t), mix(0.0005, 0.004, t * t), mix(0.003, 0.012, t)];
};
const MOUNT_FAR = new Float32Array(BW), MOUNT_NEAR = new Float32Array(BW);
for (let x = 0; x < BW; x++) {
  const u = (x - CX0) / CW;
  const ridge = (f, sd, o) => { let sum = 0, amp = 0.5, fr = f; for (let i = 0; i < 5; i++) { sum += amp * (1 - Math.abs(noise(u * fr + sd + i * 7, o))); amp *= 0.5; fr *= 2.1; } return sum; };
  MOUNT_FAR[x] = 0.735 - 0.07 * ridge(2.4, 3, 1.3) + 0.012 * noise(u * 30, 4);
  MOUNT_NEAR[x] = 0.80 - 0.05 * ridge(3.1, 11, 2.2) + 0.006 * noise(u * 44, 9);
}

const frame = new Float32Array(BW * BH * 3); // luz linear 0..1+
const auroraBuf = new Float32Array(BW * BH * 3);
const tmp = [0, 0, 0];

// Estrelas (somadas em um buffer separado, para a aurora apagar as que ficam atrás dela).
const stars = new Float32Array(BW * BH * 3);
function stamp(cx, cy, sigma, r, g, b, radius) {
  const rad = Math.ceil(radius ?? sigma * 3.2);
  for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(BH - 1, cy + rad); y++) {
    for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(BW - 1, cx + rad); x++) {
      const dd = ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) / (2 * sigma * sigma);
      if (dd > 8) continue;
      const w = Math.exp(-dd);
      const o = (y * BW + x) * 3;
      stars[o] += r * w; stars[o + 1] += g * w; stars[o + 2] += b * w;
    }
  }
}
for (let i = 0; i < 520; i++) {
  const x = rnd() * BW, y = CY0 - 70 + rnd() * (CH * 0.84 + 70);
  const m = Math.pow(rnd(), 3.2); // poucas fortes, muitas fracas
  const tint = rnd();
  const [r, g, b] = tint < 0.55 ? [0.85, 0.92, 1] : tint < 0.85 ? [1, 1, 1] : [1, 0.88, 0.7];
  const sigma = 0.55 + m * 1.1;
  const amp = 0.25 + m * 1.6;
  stamp(x, y, sigma, r * amp, g * amp, b * amp);
  if (m > 0.55) stamp(x, y, sigma * 5, r * amp * 0.07, g * amp * 0.07, b * amp * 0.09, sigma * 12); // halo
}
// Via Láctea: faixa difusa na diagonal, com poeira fina.
const milky = (x, y) => {
  const u = (x - CX0) / CW, v = (y - CY0) / CH;
  const dist = (u * 0.55 - v * 0.8 + 0.28) / 0.28; // distância à diagonal
  const band = Math.exp(-dist * dist);
  return band * (0.35 + 0.65 * (fbm(u * 6, v * 6, 4) * 0.5 + 0.5)) * 0.07;
};

for (let y = 0; y < BH; y++) {
  for (let x = 0; x < BW; x++) {
    const v = (y - CY0) / CH, u = (x - CX0) / CW;
    const o = (y * BW + x) * 3;
    aurora(x, y, tmp);
    auroraBuf[o] = tmp[0]; auroraBuf[o + 1] = tmp[1]; auroraBuf[o + 2] = tmp[2];
    const [sr, sg, sb] = SKY(v);
    const mk = milky(x, y);
    // Tom do mapa de luz: a aurora clareia o céu em volta (brilho do ar).
    const lum = tmp[0] * 0.3 + tmp[1] * 0.6 + tmp[2] * 0.1;
    const cover = 1 - clamp(lum * 1.6);
    let r = sr + stars[o] * cover + mk * 0.1;
    let g = sg + stars[o + 1] * cover + mk * 0.22;
    let b = sb + stars[o + 2] * cover + mk * 0.5;
    // Aurora (soma de luz com compressão suave, para não estourar o verde).
    // Compressão que preserva a cor (pelo canal mais forte): sem ela o verde estoura em branco-menta.
    const mc = Math.max(tmp[0], tmp[1], tmp[2], 1e-6), kc = (1 - Math.exp(-mc * 1.7)) / mc;
    const tr = tmp[0] * kc, tg = tmp[1] * kc, tb = tmp[2] * kc;
    r = r + tr * (1 - r); g = g + tg * (1 - g); b = b + tb * (1 - b);

    // Montanhas: a de trás em névoa, a da frente quase preta com a borda iluminada pela aurora.
    const far = MOUNT_FAR[x], near = MOUNT_NEAR[x];
    if (v > far) {
      const fogMix = 0.9 - smooth(far, far + 0.08, v) * 0.15;
      const tone = [0.004 + tr * 0.03, 0.012 + tg * 0.05, 0.02 + tb * 0.04];
      r = mix(r, tone[0], fogMix); g = mix(g, tone[1], fogMix); b = mix(b, tone[2], fogMix);
      const rim = Math.exp(-(v - far) / 0.004) * 0.35;
      r += tr * rim * 0.7; g += tg * rim; b += tb * rim * 0.8;
    }
    if (v > near) {
      // Neve escura azulada com luz verde-água refletida da aurora.
      const deep = smooth(near, 0.98, v);
      const snow = 0.5 + 0.5 * fbm(u * 14, v * 22, 4);
      const rr = mix(0.003, 0.002, deep) + 0.004 * snow, gg = mix(0.008, 0.005, deep) + 0.008 * snow, bb = mix(0.012, 0.008, deep) + 0.012 * snow;
      const reflect = 0.05 * (1 - deep * 0.7);
      r = rr + tr * reflect * 0.4; g = gg + tg * reflect; b = bb + tb * reflect * 0.9;
      const rim = Math.exp(-(v - near) / 0.0035) * 0.4;
      r += tr * rim * 0.6; g += tg * rim; b += tb * rim * 0.7;
    }
    frame[o] = r; frame[o + 1] = g; frame[o + 2] = b;
  }
}

// Neve caindo (bolinhas de foco), na frente da cena.
function bokeh(cx, cy, rad, alpha) {
  const soft = 0.45 + rad * 0.06;
  for (let y = Math.max(0, Math.floor(cy - rad - 3)); y <= Math.min(BH - 1, cy + rad + 3); y++) {
    for (let x = Math.max(0, Math.floor(cx - rad - 3)); x <= Math.min(BW - 1, cx + rad + 3); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const a = (1 - smooth(rad - soft * rad * 0.5, rad + 0.8, d)) * alpha;
      if (a <= 0) continue;
      const o = (y * BW + x) * 3;
      frame[o] = mix(frame[o], 0.9, a); frame[o + 1] = mix(frame[o + 1], 0.96, a); frame[o + 2] = mix(frame[o + 2], 1, a);
    }
  }
}
for (let i = 0; i < 90; i++) {
  const big = rnd() < 0.18;
  const rad = big ? 4 + rnd() * 5 : 0.9 + rnd() * 2.2;
  bokeh(CX0 + rnd() * CW, CY0 + rnd() * CH * 0.88, rad, big ? 0.08 + rnd() * 0.1 : 0.35 + rnd() * 0.45);
}
// Brilho de neve no chão (pontinhos).
for (let i = 0; i < 160; i++) {
  const x = CX0 + rnd() * CW, y = CY0 + CH * (0.78 + rnd() * 0.2);
  const o0 = Math.floor(y) * BW + Math.floor(x);
  const a = 0.25 + rnd() * 0.6;
  frame[o0 * 3] += a * 0.7; frame[o0 * 3 + 1] += a; frame[o0 * 3 + 2] += a;
}

// A faixa das estatísticas fica escura e lisa (a carta desenha a barra por cima): a cena escurece embaixo.
const BAR = [0.0003, 0.0048, 0.0045];
for (let y = 0; y < BH; y++) {
  const v = (y - CY0) / CH;
  const k = smooth(0.80, 0.9, v) * 0.92;
  for (let x = 0; x < BW; x++) {
    const o = (y * BW + x) * 3;
    frame[o] = mix(frame[o], BAR[0], k); frame[o + 1] = mix(frame[o + 1], BAR[1], k); frame[o + 2] = mix(frame[o + 2], BAR[2], k);
  }
}

// ---------------------------------------------------------------- moldura (estilo da Loja)
function roundedSd(x, y, l, t, r, b, rad) {
  const cx = clamp(x, l + rad, r - rad), cy = clamp(y, t + rad, b - rad);
  return Math.hypot(x - cx, y - cy) - rad; // negativo dentro
}
const NEON = [0.12, 1.0, 0.78]; // verde-água
const NEON_HALO = [0.1, 0.95, 0.72];
const GOLD_DARK = [0.36, 0.25, 0.07], GOLD_LIGHT = [1.0, 0.86, 0.5];

// Estrela Polar no topo: estrela de 4 pontas côncavas + 4 menores na diagonal, com halo.
const STAR = { x: BW / 2, y: CY0 - 19, a: 33 };
function starLight(x, y) {
  const dx = Math.abs(x - STAR.x), dy = Math.abs(y - STAR.y);
  const big = Math.pow(dx / STAR.a, 0.5) + Math.pow(dy / STAR.a, 0.5);
  const rx = (dx + dy) * 0.7071, ry = Math.abs(dx - dy) * 0.7071;
  const small = Math.pow(rx / (STAR.a * 0.5), 0.5) + Math.pow(ry / (STAR.a * 0.5), 0.5);
  const core = 1 - smooth(0.92, 1.08, big);
  const core2 = (1 - smooth(0.92, 1.08, small)) * 0.7;
  const r = Math.hypot(dx, dy);
  const halo = Math.exp(-r / 7) * 0.6 + Math.exp(-r / 24) * 0.22;
  return { core: Math.max(core, core2), halo };
}

const vaza = Buffer.alloc(BW * BH * 4);
for (let y = 0; y < BH; y++) {
  for (let x = 0; x < BW; x++) {
    const px = x + 0.5, py = y + 0.5;
    const sd = roundedSd(px, py, CX0, CY0, CX0 + CW, CY0 + CH, CARD_R); // <0 dentro da carta
    const wd = roundedSd(px, py, WIN.l, WIN.t, WIN.r, WIN.b, WIN_R); // <0 dentro da janela
    const o = (y * BW + x) * 4;
    const f = (y * BW + x) * 3;
    if (wd < -3.2) continue; // bem dentro da janela: é o fundo (e a foto) que aparece

    // Luz somada: tubo de neon, halo e a aurora que vaza.
    const tubeC = 7.5;
    const w = Math.abs(sd - tubeC);
    const core = 1 - smooth(0.9, 2.5, w);
    let L = [0, 0, 0];
    const reach = sd > tubeC ? 1 - smooth(26, 50, sd) : 1; // o brilho some antes da borda da caixa (57 px)
    const halo = (Math.exp(-w / 6.5) * 0.5 + Math.exp(-w / 20) * 0.17) * reach;
    const haloSide = sd > tubeC ? 1 : 0.55; // dentro (no respiro) o halo é mais fraco
    for (let k = 0; k < 3; k++) L[k] = NEON_HALO[k] * halo * haloSide;
    // Centro do tubo: quase branco, com a cor do neon nas bordas.
    for (let k = 0; k < 3; k++) L[k] += mix(NEON[k], 1, Math.pow(core, 1.6)) * core * 0.95;
    // Aurora que vaza (só fora da carta, perto da borda).
    if (sd > -1) {
      const spill = smooth(-1, 4, sd) * (1 - smooth(4, 24, sd)) * 0.9;
      for (let k = 0; k < 3; k++) L[k] += auroraBuf[f + k] * spill * 0.85;
    }
    // Estrela Polar.
    const st = starLight(px, py);
    if (st.core > 0 || st.halo > 0.01) {
      const wht = [1, 1, 1];
      for (let k = 0; k < 3; k++) L[k] += mix(NEON[k] * 0.8, wht[k], 0.85) * st.core * 1.05 + NEON_HALO[k] * st.halo * 0.75;
    }

    // Base opaca do anel: respiro preto e fio de ouro por dentro.
    let base = [0, 0, 0], ring = 0;
    if (sd < 4.8 && wd >= -3.2) {
      ring = 1 - smooth(4.2, 4.8, sd);
      // Fio de ouro: de sd -5.4 a -2.4, brilho no centro, reflexo que corre pela diagonal.
      const gl = 1 - smooth(0.6, 1.6, Math.abs(sd + 3.9));
      if (gl > 0) {
        const s = 0.5 + 0.5 * Math.sin((px * 0.9 + py) * 0.021 + 1.3) * 0.8 + 0.25 * noise(px / 40, py / 40);
        const hl = clamp(s) * (0.55 + 0.45 * (1 - Math.abs(sd + 3.9) / 1.6));
        for (let k = 0; k < 3; k++) base[k] = mix(GOLD_DARK[k], GOLD_LIGHT[k], clamp(hl)) * gl;
      }
    }
    // Dentro da janela (rampa): a cor da própria cena, para não haver emenda com o fundo.
    let sceneMix = 0;
    if (wd < -1 && wd >= -3.2) sceneMix = 1;

    const maxL = Math.max(L[0], L[1], L[2]);
    let outR, outG, outB, outA;
    if (sceneMix) {
      const alpha = smooth(-3.2, -1, wd); // 0 bem dentro → 1 perto da borda da janela
      outA = alpha; outR = frame[f]; outG = frame[f + 1]; outB = frame[f + 2];
    } else {
      const pr = base[0] * ring + L[0], pg = base[1] * ring + L[1], pb = base[2] * ring + L[2];
      outA = Math.max(ring, Math.min(1, maxL));
      if (outA <= 0.002) continue;
      outR = pr / outA; outG = pg / outA; outB = pb / outA;
    }
    vaza[o] = Math.round(255 * Math.pow(clamp(outR), 1 / 2.2));
    vaza[o + 1] = Math.round(255 * Math.pow(clamp(outG), 1 / 2.2));
    vaza[o + 2] = Math.round(255 * Math.pow(clamp(outB), 1 / 2.2));
    vaza[o + 3] = Math.round(clamp(outA) * 255);
  }
}


// ---------------------------------------------------------------- neve acumulada (o que vaza por cima da moldura)
// Um monte de neve no canto de cima à direita, descendo um pouco pela lateral: mapa de altura (perfil de meia-elipse
// com ruído fractal e micro-relevo), normais pelo gradiente e luz de duas fontes: o céu azul de cima e a aurora
// verde de baixo e da direita; sombras azuladas (a neve deixa a luz passar) e cristais de gelo brilhando.
const SNOW = { Tmax: 74, ends: [-(CARD_R * Math.PI / 2) - 175, 215] };
const cxIn0 = CX0 + CARD_R, cxIn1 = CX0 + CW - CARD_R, cyIn0 = CY0 + CARD_R;
function edgeCoord(px, py) {
  if (py < cyIn0 && px >= cxIn0 && px <= cxIn1) return cxIn1 - px; // reta de cima
  if (px > cxIn1 && py < cyIn0) { const phi = Math.atan2(px - cxIn1, cyIn0 - py); return -CARD_R * clamp(phi, 0, Math.PI / 2); } // canto
  if (px > cxIn1 && py >= cyIn0) return -(CARD_R * Math.PI / 2) - (py - cyIn0); // lateral direita
  return null;
}
const thick = (rho) => {
  const [lo, hi] = SNOW.ends;
  const env = smooth(lo, lo + 120, rho) * (1 - smooth(hi - 150, hi, rho));
  const peak = (0.45 + 0.55 * Math.exp(-Math.pow((rho - 35) / 105, 2))) * mix(0.66, 1, smooth(-70, 10, rho)); // na lateral a sobra é menor (57 px)
  const lumps = 0.9 + 0.5 * fbm(rho / 38 + 40, 3.3, 3) + 0.22 * Math.sin(rho / 23);
  return SNOW.Tmax * env * peak * clamp(lumps, 0.25, 1.35);
};
const zbuf = new Float32Array(BW * BH);
const cover = new Float32Array(BW * BH);
for (let y = 0; y < BH; y++) {
  for (let x = 0; x < BW; x++) {
    const px = x + 0.5, py = y + 0.5;
    const rho = edgeCoord(px, py);
    if (rho === null || rho < SNOW.ends[0] || rho > SNOW.ends[1]) continue;
    const sd = roundedSd(px, py, CX0, CY0, CX0 + CW, CY0 + CH, CARD_R);
    const T = thick(rho);
    if (T < 2 || sd < -2.6) continue;
    // O contorno do monte ondula (pequenos montinhos na borda de fora).
    const edge = T * (0.8 + 0.3 * fbm(px / 17, py / 17, 3));
    const u = (sd + 2.6) / (edge + 2.6);
    if (u >= 1) continue;
    const dome = Math.pow(Math.max(0, 1 - Math.pow(2 * u - 0.55, 2) / 0.9), 0.55);
    const detail = 1 + 0.12 * fbm(px / 9, py / 9, 3) + 0.05 * noise(px / 3, py / 3);
    zbuf[y * BW + x] = T * 0.95 * dome * detail + 0.5;
    cover[y * BW + x] = smooth(1, 0.93, u) * smooth(-2.6, -1.6, sd);
  }
}
const L1 = [-0.45, -0.62, 0.64], L2 = [0.55, 0.25, 0.8];
const norm = (v) => { const m = Math.hypot(...v); return v.map((c) => c / m); };
const l1 = norm(L1), l2 = norm(L2);
for (let y = 1; y < BH - 1; y++) {
  for (let x = 1; x < BW - 1; x++) {
    const i = y * BW + x;
    const a = cover[i];
    if (a <= 0.002) continue;
    const dzx = (zbuf[i + 1] - zbuf[i - 1]) * 0.5, dzy = (zbuf[i + BW] - zbuf[i - BW]) * 0.5;
    const n = norm([-dzx * 1.5, -dzy * 1.5, 1]);
    const d1 = Math.max(0, n[0] * l1[0] + n[1] * l1[1] + n[2] * l1[2]);
    const d2 = Math.max(0, n[0] * l2[0] + n[1] * l2[1] + n[2] * l2[2]);
    const thin = 1 - smooth(0, 16, zbuf[i]); // onde é fina a luz atravessa: azul-esverdeado
    // albedo da neve + céu azul (luz 1), aurora verde-água (luz 2) e ambiente azulado.
    let r = 1.0 * (0.1 + 0.95 * d1) + 0.08 * d2;
    let g = 1.0 * (0.14 + 0.95 * d1) + 0.3 * d2;
    let b = 1.0 * (0.26 + 0.95 * d1) + 0.22 * d2;
    r = mix(r, 0.35, thin * 0.2); g = mix(g, 0.62, thin * 0.15); b = mix(b, 0.8, thin * 0.1);
    // Cristais de gelo: pontinhos que brilham onde o ruído passa do limite e a superfície encara a luz.
    const sp = noise(x / 1.7, y / 1.7) + 0.6 * noise(x / 0.9 + 5, y / 0.9);
    if (sp > 1.0 && d1 > 0.35) { const k = smooth(1.0, 1.35, sp); r += k * 0.9; g += k * 0.95; b += k; }
    const o = i * 4;
    const sr = Math.round(255 * Math.pow(clamp(r), 1 / 2.2)), sg = Math.round(255 * Math.pow(clamp(g), 1 / 2.2)), sb = Math.round(255 * Math.pow(clamp(b), 1 / 2.2));
    // composição "por cima" no que já está no pixel (moldura, neon e brilho), em 8 bits
    const ea = vaza[o + 3] / 255, oa = a + ea * (1 - a);
    if (oa <= 0) continue;
    vaza[o] = Math.round((sr * a + vaza[o] * ea * (1 - a)) / oa);
    vaza[o + 1] = Math.round((sg * a + vaza[o + 1] * ea * (1 - a)) / oa);
    vaza[o + 2] = Math.round((sb * a + vaza[o + 2] * ea * (1 - a)) / oa);
    vaza[o + 3] = Math.round(oa * 255);
  }
}
// Flocos soltos em volta do monte (fora da carta).
for (let i = 0; i < 26; i++) {
  const rho = SNOW.ends[0] * 0.2 + rnd() * (SNOW.ends[1] * 0.9 - SNOW.ends[0] * 0.2);
  const cx = cxIn1 + CARD_R + 6 + rnd() * 34, cy = CY0 - 8 + rnd() * 160;
  void rho;
  const rad = 0.9 + rnd() * 1.7, al = 0.5 + rnd() * 0.45;
  for (let y = Math.floor(cy - 4); y <= cy + 4; y++) for (let x = Math.floor(cx - 4); x <= cx + 4; x++) {
    if (x < 0 || y < 0 || x >= BW || y >= BH) continue;
    const sdp = roundedSd(x + 0.5, y + 0.5, CX0, CY0, CX0 + CW, CY0 + CH, CARD_R);
    if (sdp < 3) continue;
    const a = (1 - smooth(rad * 0.4, rad + 0.7, Math.hypot(x + 0.5 - cx, y + 0.5 - cy))) * al;
    if (a <= 0) continue;
    const o = (y * BW + x) * 4, ea = vaza[o + 3] / 255, oa = a + ea * (1 - a);
    vaza[o] = Math.round((235 * a + vaza[o] * ea * (1 - a)) / oa);
    vaza[o + 1] = Math.round((248 * a + vaza[o + 1] * ea * (1 - a)) / oa);
    vaza[o + 2] = Math.round((255 * a + vaza[o + 2] * ea * (1 - a)) / oa);
    vaza[o + 3] = Math.round(oa * 255);
  }
}

// Fundo em sRGB 8 bits, com um grão fino contra o degradê em faixas.
const rgb = Buffer.alloc(BW * BH * 3);
for (let i = 0; i < BW * BH; i++) {
  const g = (rnd() - 0.5) * (1.6 / 255);
  for (let k = 0; k < 3; k++) {
    rgb[i * 3 + k] = Math.round(255 * Math.pow(clamp(frame[i * 3 + k] + g), 1 / 2.2));
  }
}

(async () => {
  const left = Math.round(WIN.l), top = Math.round(WIN.t), width = Math.round(WIN.r - WIN.l), height = Math.round(WIN.b - WIN.t);
  const FW = 600, FH = Math.round((600 * height) / width);
  await sharp(rgb, { raw: { width: BW, height: BH, channels: 3 } })
    .extract({ left, top, width, height })
    .resize(FW, FH, { kernel: "lanczos3" })
    .webp({ quality: 84 })
    .toFile(`${OUT}/premium-aurora.webp`);
  await sharp(vaza, { raw: { width: BW, height: BH, channels: 4 } }).webp({ quality: 88, alphaQuality: 95 }).toFile(`${OUT}/premium-aurora-vaza.webp`);
  // Camada de luz que desliza: só as cortinas da aurora (alfa pelo brilho, sobre o céu), 12% mais larga que a janela
  // para poder correr ±4% sem mostrar borda. A roupa a põe atrás do jogador e a move com `transform` (`cc-aurora-drift`).
  const padX = Math.round(width * 0.06), LW = width + padX * 2;
  const luz = Buffer.alloc(LW * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < LW; x++) {
      const f = ((top + y) * BW + (left - padX + x)) * 3;
      const mc = Math.max(auroraBuf[f], auroraBuf[f + 1], auroraBuf[f + 2], 1e-6), kc = (1 - Math.exp(-mc * 1.7)) / mc;
      const c = [auroraBuf[f] * kc, auroraBuf[f + 1] * kc, auroraBuf[f + 2] * kc];
      const a = clamp(Math.max(c[0], c[1], c[2]) * 1.15);
      const o = (y * LW + x) * 4;
      if (a < 0.004) continue;
      for (let k = 0; k < 3; k++) luz[o + k] = Math.round(255 * Math.pow(clamp(c[k] / a), 1 / 2.2));
      luz[o + 3] = Math.round(a * 255);
    }
  }
  await sharp(luz, { raw: { width: LW, height, channels: 4 } }).resize(Math.round((LW * FH) / height), FH).webp({ quality: 80, alphaQuality: 80 }).toFile(`${OUT}/premium-aurora-luz.webp`);
  // Prévia da cena inteira (fora do app): só com um 3º argumento, a pasta onde salvar.
  if (process.argv[4]) await sharp(rgb, { raw: { width: BW, height: BH, channels: 3 } }).png().toFile(`${process.argv[4]}/_aurora-cena.png`);
  console.log("ok", { windowRadiusCqw: (WIN_R / CW) * 100, FW, FH });
})().catch((e) => { console.error(e); process.exit(1); });
