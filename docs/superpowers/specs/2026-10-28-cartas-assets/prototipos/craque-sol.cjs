// Fundos candidatos do Melhor Jogador com o sol (referências do dono do app em 2026-10-31):
// A · pôr do sol em faixas de raios, B · sol art déco gravado em metal, C · sol em chamas.
// O sol fica atrás da cabeça do jogador, como uma auréola.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860, cx = 300, cy = 300;

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f = (n) => n.toFixed(1);
const polar = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
const grain = (o) => `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity="${o}"/>`;

// Mistura de cores por posição (0..1) numa lista de paradas.
function mix(stops, t) {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i - 1], [t2, c2] = stops[i];
    if (t <= t2) {
      const k = (t - t1) / (t2 - t1);
      const a = c1.match(/\w\w/g).map((h) => parseInt(h, 16)), b = c2.match(/\w\w/g).map((h) => parseInt(h, 16));
      return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",")})`;
    }
  }
  return stops.at(-1)[1];
}

// A · Pôr do sol: anéis de blocos radiais (amarelo → laranja → vermelho → roxo) e serras embaixo.
function porDoSol() {
  seed = 7;
  const stops = [[0, "#fff3a0"], [0.12, "#ffd23f"], [0.28, "#ff9a2a"], [0.46, "#ff5a2a"], [0.62, "#d8264f"], [0.8, "#8a1a6a"], [1, "#3a1470"]];
  const rings = [];
  const steps = 200;
  for (let r = 70; r < 760; r += 17) {
    const da = (Math.PI * 2) / steps;
    let a = rnd() * da;
    while (a < Math.PI * 2) {
      const span = da * (1 + Math.floor(rnd() * 3));
      const t = r / 520 + (rnd() - 0.5) * 0.08;
      const len = 17 * (1.05 + rnd() * 0.5);
      const [x1, y1] = polar(r, a + span / 2), [x2, y2] = polar(r + len, a + span / 2);
      rings.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${mix(stops, t)}" stroke-width="${f(r * span * (0.96 + rnd() * 0.08) + 0.4)}"/>`);
      a += span;
    }
  }
  // Raios finos e claros saindo do sol.
  const thin = Array.from({ length: 120 }, (_, i) => {
    const a = (i / 120) * Math.PI * 2 + rnd() * 0.02, l = 140 + rnd() * 220;
    const [x1, y1] = polar(64, a), [x2, y2] = polar(64 + l, a);
    return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#ffe680" stroke-opacity="${(0.25 + rnd() * 0.35).toFixed(2)}" stroke-width="${f(1 + rnd() * 1.6)}"/>`;
  }).join("");
  // Serras em camadas no pé da carta.
  const ridge = (base, amp, color, s) => {
    seed = s;
    let d = `M0 ${H} L0 ${base}`;
    for (let x = 0; x <= W; x += 75) {
      const peak = base - amp * (0.5 + rnd() * 0.5);
      d += ` L${f(x + 25 + rnd() * 20)} ${f(peak)} L${f(x + 52)} ${f(peak + amp * 0.35)} L${x + 75} ${f(base - amp * rnd() * 0.3)}`;
    }
    return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <radialGradient id="sun"><stop offset="0" stop-color="#fffbe0"/><stop offset=".7" stop-color="#fff0a0"/><stop offset="1" stop-color="#ffd23f"/></radialGradient>
    <radialGradient id="halo" cx="${cx}" cy="${cy}" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff2a0" stop-opacity=".75"/><stop offset="1" stop-color="#ffb02a" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="#2a0f4a"/>${rings.join("")}
    <circle cx="${cx}" cy="${cy}" r="260" fill="url(#halo)"/>${thin}
    <circle cx="${cx}" cy="${cy}" r="70" fill="#ffd23f" opacity=".6"/><circle cx="${cx}" cy="${cy}" r="58" fill="url(#sun)"/>
    ${ridge(700, 60, "#a01e50", 3)}${ridge(750, 50, "#6a1240", 5)}${ridge(800, 40, "#320a28", 9)}${grain(0.06)}</svg>`;
}

// B · Sol art déco: metal escovado escuro com o sol gravado em sulcos acesos de ouro.
// `ink`: força do desenho (1 = aceso; abaixo de 0,5 vira marca d'água, gravado no metal).
function artDeco(ink = 1) {
  seed = 13;
  const brushed = Array.from({ length: 160 }, (_, i) =>
    `<circle cx="${cx}" cy="${cy}" r="${f(20 + i * 5.2)}" fill="none" stroke="${rnd() < 0.5 ? "#ffffff" : "#000000"}" stroke-opacity="${(0.02 + rnd() * 0.05).toFixed(3)}" stroke-width="${f(1 + rnd() * 2)}"/>`).join("");
  // Pontas da estrela: triângulos com contorno duplo.
  const spike = (a, rIn, rOut, half) => {
    const p = [polar(rIn, a - half), polar(rOut, a), polar(rIn, a + half)];
    const q = [polar(rIn + 10, a - half * 0.45), polar(rOut - 26, a), polar(rIn + 10, a + half * 0.45)];
    return [p, q].map((pts) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")}`).join(" ");
  };
  let star = "", outer = "";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    star += spike(a, 72, 250, 0.16) + " " + spike(a + Math.PI / 16, 72, 165, 0.12) + " ";
  }
  // Raios longos e angulosos até as bordas, com uma dobra.
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 + Math.PI / 32;
    const [x1, y1] = polar(270, a), [x2, y2] = polar(420, a), [x3, y3] = polar(720, a + (i % 2 ? 0.08 : -0.08));
    const [x4, y4] = polar(290, a + 0.04), [x5, y5] = polar(700, a + 0.04 + (i % 2 ? 0.08 : -0.08));
    outer += `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} M${f(x4)} ${f(y4)} L${f(x5)} ${f(y5)} `;
  }
  // Losangos com chevrons espalhados (os enfeites da referência).
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const [x, y] = polar(330, a), s = 16;
    outer += `M${f(x)} ${f(y - s)} L${f(x + s)} ${f(y)} L${f(x)} ${f(y + s)} L${f(x - s)} ${f(y)} Z M${f(x - 7)} ${f(y + 2)} L${f(x)} ${f(y - 5)} L${f(x + 7)} ${f(y + 2)} `;
  }
  const octagram = [0, Math.PI / 4].map((o) => `M${[0, 1, 2, 3].map((k) => polar(44, o + (k * Math.PI) / 2).map(f).join(" ")).join(" L")} Z`).join(" ");
  const core = `M${cx - 62} ${cy} A62 62 0 1 0 ${cx + 62} ${cy} A62 62 0 1 0 ${cx - 62} ${cy} M${cx - 52} ${cy} A52 52 0 1 0 ${cx + 52} ${cy} A52 52 0 1 0 ${cx - 52} ${cy} ${octagram} M${cx - 26} ${cy} A26 26 0 1 0 ${cx + 26} ${cy} A26 26 0 1 0 ${cx - 26} ${cy}`;
  // Um sulco aceso: sombra do corte, brilho largo e o fio quente.
  // Um sulco gravado: sombra do corte, brilho largo e o fio quente, todos na força `ink`.
  const groove = (d, o) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="${Math.min(0.7, 0.7 * ink + 0.15)}" stroke-width="5" transform="translate(1.5 2)" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#ff8a00" stroke-opacity="${0.55 * o * ink * ink}" stroke-width="9" filter="url(#bl)" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#ffb627" stroke-opacity="${0.9 * o * ink}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#fff1b0" stroke-opacity="${0.9 * o * ink * ink}" stroke-width="1" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <filter id="bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
    <radialGradient id="m" cx=".75" cy=".1" r="1"><stop offset="0" stop-color="#4a4743"/><stop offset=".5" stop-color="#1e1d1b"/><stop offset="1" stop-color="#0a0a09"/></radialGradient>
    <radialGradient id="warm" cx="${cx}" cy="${cy}" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff9a1a" stop-opacity="${0.45 * ink}"/><stop offset="1" stop-color="#ff9a1a" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#m)"/>${brushed}
    <rect width="100%" height="100%" fill="url(#warm)"/>
    ${groove(outer, 0.45)}${groove(star, 1)}${groove(core, 1.1)}
    <circle cx="${cx}" cy="${cy}" r="14" fill="#2a2724" stroke="#ffd36a" stroke-opacity="${ink}" stroke-width="1.5"/>${grain(0.05)}</svg>`;
}

// C · Sol em chamas: esfera laranja com textura, raios de circuito e labaredas douradas nas laterais.
function chamas() {
  seed = 29;
  const R = 150;
  const circuits = Array.from({ length: 170 }, () => {
    const a = rnd() * Math.PI * 2, r1 = R + 6 + rnd() * 20, r2 = r1 + 60 + rnd() * 180;
    const kink = (rnd() < 0.5 ? -1 : 1) * (0.05 + rnd() * 0.08);
    const [x1, y1] = polar(r1, a), [x2, y2] = polar(r2, a), [x3, y3] = polar(r2 + 40 + rnd() * 260, a + kink);
    const color = mix([[0, "#ffd36a"], [0.5, "#ff7a1a"], [1, "#c2300a"]], rnd());
    const o = (0.35 + rnd() * 0.55).toFixed(2);
    return `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)}" fill="none" stroke="${color}" stroke-opacity="${o}" stroke-width="${f(0.8 + rnd() * 1.4)}"/>${rnd() < 0.4 ? `<circle cx="${f(x3)}" cy="${f(y3)}" r="2" fill="${color}" opacity="${o}"/>` : ""}`;
  }).join("");
  const stars = Array.from({ length: 140 }, () => `<circle cx="${f(rnd() * W)}" cy="${f(rnd() * H)}" r="${f(0.6 + rnd() * 1.4)}" fill="#fff" opacity="${(0.25 + rnd() * 0.6).toFixed(2)}"/>`).join("");
  // Labareda: lâmina curva que afina, com farpas na borda de fora (a referência das chamas).
  const flame = (x, y, len, bend, width, rot) => {
    const n = 18, outer = [], inner = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, ang = rot + bend * t;
      const px = x + Math.cos(ang) * len * t, py = y + Math.sin(ang) * len * t;
      const w = width * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t * 0.5) + 0.5;
      const nx = -Math.sin(ang), ny = Math.cos(ang), tx = Math.cos(ang), ty = Math.sin(ang);
      outer.push([px + nx * w, py + ny * w]);
      // Farpa que volta para trás, como a lambida da chama.
      if (i % 3 === 2 && t < 0.85) outer.push([px + nx * w * 2.6 - tx * (len / n) * 1.6, py + ny * w * 2.6 - ty * (len / n) * 1.6], [px + nx * w * 1.1 + tx * 2, py + ny * w * 1.1 + ty * 2]);
      inner.push([px - nx * w * 0.5, py - ny * w * 0.5]);
    }
    const pts = [...outer, ...inner.reverse()];
    return `<path d="M${pts.map(([a, b]) => `${f(a)} ${f(b)}`).join(" L")} Z" fill="url(#gold)"/>`;
  };
  const flames = [
    flame(-10, 760, 380, -1.3, 24, -0.55), flame(-20, 640, 300, -1.2, 18, -0.5), flame(30, 860, 300, -1.0, 15, -0.7),
    flame(610, 600, 380, 1.3, 24, Math.PI + 0.55), flame(620, 480, 300, 1.2, 18, Math.PI + 0.5), flame(580, 860, 280, 1.0, 15, Math.PI + 0.75),
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
    <radialGradient id="s" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffc23a"/><stop offset=".6" stop-color="#ff7a0a"/><stop offset="1" stop-color="#e85a00"/></radialGradient>
    <radialGradient id="corona" cx="${cx}" cy="${cy}" r="${R * 1.9}" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="#ff8a1a" stop-opacity=".55"/><stop offset="1" stop-color="#ff5a00" stop-opacity="0"/></radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset=".5" stop-color="#ffcf2a"/><stop offset="1" stop-color="#e09a00"/></linearGradient>
    <clipPath id="c"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    <filter id="cells"><feTurbulence type="turbulence" baseFrequency=".045" numOctaves="3" seed="8"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .85  0 0 0 0 .25  0 0 0 2.2 -.9"/></filter></defs>
    <rect width="100%" height="100%" fill="#050302"/>${stars}${circuits}
    <circle cx="${cx}" cy="${cy}" r="${R * 1.9}" fill="url(#corona)"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#s)"/>
    <rect width="100%" height="100%" filter="url(#cells)" clip-path="url(#c)" opacity=".8"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#ffd36a" stroke-width="3" opacity=".8"/>
    <g opacity=".9">${flames}</g>${grain(0.05)}</svg>`;
}

// Aprovada pelo dono do app em 2026-10-31: a B na força cheia vira o fundo do Melhor Jogador
// fora de evento. A, C e as versões em marca d'água (ink 0,45 / 0,3 / 0,18) ficaram de fora.
// Uso: node craque-sol.cjs public/cartas/fundos <raiz do repo>
(async () => {
  await sharp(Buffer.from(artDeco())).webp({ quality: 88 }).toFile(`${OUT}/premio-craque-default.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
