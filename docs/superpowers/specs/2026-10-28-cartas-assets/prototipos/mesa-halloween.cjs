// Cenário de Halloween da mesa tática: gramado escuro com luz de vela, abóboras e velas nos cantos
// (onde o 1-2-1 não põe carta) e teias no alto. Gera public/mesa/halloween.webp.
// Uso: node docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/mesa-halloween.cjs
const path = require("node:path");
const sharp = require("sharp");

const W = 800;
const H = 1480;
const OUT = path.join(__dirname, "../../../../../public/mesa/halloween.webp");

// Gerador pseudoaleatório fixo: a arte sai igual a cada execução.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function glow(cx, cy, r, opacity) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#warm)" opacity="${opacity}"/>`;
}

function pumpkin(cx, cy, r, tilt = 0) {
  const lobes = [-0.62, -0.32, 0.32, 0.62, 0]
    .map((dx) => {
      const rx = r * (dx === 0 ? 0.5 : 0.46);
      return `<ellipse cx="${cx + dx * r}" cy="${cy}" rx="${rx}" ry="${r * 0.78}" fill="url(#pumpkin)" stroke="#3a1300" stroke-width="${r * 0.04}"/>`;
    })
    .join("");
  const s = r / 40;
  const face = `
    <g fill="#ffd36b" filter="url(#soft)">
      <path d="M${cx - 20 * s} ${cy - 4 * s} L${cx - 8 * s} ${cy - 4 * s} L${cx - 14 * s} ${cy - 16 * s} Z"/>
      <path d="M${cx + 8 * s} ${cy - 4 * s} L${cx + 20 * s} ${cy - 4 * s} L${cx + 14 * s} ${cy - 16 * s} Z"/>
      <path d="M${cx - 24 * s} ${cy + 6 * s} Q${cx} ${cy + 30 * s} ${cx + 24 * s} ${cy + 6 * s}
               L${cx + 16 * s} ${cy + 12 * s} L${cx + 10 * s} ${cy + 6 * s} L${cx + 4 * s} ${cy + 13 * s}
               L${cx - 4 * s} ${cy + 6 * s} L${cx - 10 * s} ${cy + 13 * s} L${cx - 16 * s} ${cy + 6 * s} Z"/>
    </g>`;
  const stem = `<path d="M${cx - 4 * s} ${cy - r * 0.7} q2 ${-14 * s} ${12 * s} ${-20 * s} l3 ${4 * s} q-8 ${6 * s} -7 ${18 * s} z" fill="#3d4a1a" stroke="#1c2108" stroke-width="${1.5 * s}"/>`;
  return `<g transform="rotate(${tilt} ${cx} ${cy})">${glow(cx, cy + r * 0.2, r * 3.2, 0.55)}${stem}${lobes}${face}</g>`;
}

function candle(x, y, h, w = 12) {
  const flameY = y - h - 9;
  return `
    ${glow(x, flameY, 70, 0.45)}
    <rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="2" fill="url(#wax)"/>
    <path d="M${x - w / 2} ${y - h + 2} q${w / 4} 6 ${w / 2} 0 q${w / 4} 9 ${w / 2} 0" fill="#f3e3c0" opacity=".9"/>
    <line x1="${x}" y1="${y - h}" x2="${x}" y2="${y - h - 4}" stroke="#2a1a0a" stroke-width="1.5"/>
    <ellipse cx="${x}" cy="${flameY}" rx="5" ry="11" fill="url(#flame)" filter="url(#soft)"/>
    <ellipse cx="${x}" cy="${flameY + 3}" rx="2" ry="5" fill="#fffbe6"/>`;
}

function cobweb(cx, cy, size, flipX) {
  const sx = flipX ? -1 : 1;
  const spokes = [];
  const angles = [0, 15, 32, 48, 63, 78, 90].map((a) => (a * Math.PI) / 180);
  for (const a of angles) {
    spokes.push(`<line x1="${cx}" y1="${cy}" x2="${cx + sx * Math.cos(a) * size}" y2="${cy + Math.sin(a) * size}"/>`);
  }
  const rings = [];
  for (let k = 1; k <= 6; k++) {
    const r = (size * k) / 6.4;
    let d = "";
    angles.forEach((a, i) => {
      const x = cx + sx * Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) d += `M${x} ${y}`;
      else {
        const mid = (angles[i - 1] + a) / 2;
        const sag = r * 0.86;
        d += ` Q${cx + sx * Math.cos(mid) * sag} ${cy + Math.sin(mid) * sag} ${x} ${y}`;
      }
    });
    rings.push(`<path d="${d}"/>`);
  }
  return `<g stroke="#e8e4dc" stroke-width="1.3" fill="none" opacity=".32">${spokes.join("")}${rings.join("")}</g>`;
}

function bat(x, y, s) {
  return `<path transform="translate(${x} ${y}) scale(${s})" fill="#050302" d="M0 0 q-8 -10 -22 -8 q6 4 4 10 q-6 -4 -12 0 q8 2 10 8 q10 -6 20 -2 q10 -4 20 2 q2 -6 10 -8 q-6 -4 -12 0 q-2 -6 4 -10 q-14 -2 -22 8z"/>`;
}

// Grama: listras na horizontal e textura de ruído.
const stripes = Array.from({ length: Math.ceil(H / 92) }, (_, i) =>
  i % 2 ? `<rect x="0" y="${i * 92}" width="${W}" height="92" fill="#ffffff" opacity=".028"/>` : "",
).join("");

// Folhas secas espalhadas pelas bordas.
const leaves = Array.from({ length: 70 }, () => {
  const edge = rand();
  const x = edge < 0.5 ? (rand() < 0.5 ? rand() * 90 : W - rand() * 90) : rand() * W;
  const y = edge < 0.5 ? rand() * H : rand() < 0.5 ? rand() * 80 : H - rand() * 90;
  const r = 3 + rand() * 5;
  const hue = ["#5a2a0a", "#7a3a0c", "#3d1c06", "#8a4a12"][Math.floor(rand() * 4)];
  return `<ellipse cx="${x}" cy="${y}" rx="${r * 1.6}" ry="${r}" fill="${hue}" opacity=".75" transform="rotate(${rand() * 180} ${x} ${y})"/>`;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="grass" cx="50%" cy="50%" r="70%">
      <stop offset="0" stop-color="#22331a"/>
      <stop offset=".6" stop-color="#14200f"/>
      <stop offset="1" stop-color="#070b05"/>
    </radialGradient>
    <radialGradient id="warm">
      <stop offset="0" stop-color="#ff8a24" stop-opacity=".9"/>
      <stop offset=".35" stop-color="#e2580c" stop-opacity=".35"/>
      <stop offset="1" stop-color="#e2580c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pumpkin" cx="40%" cy="35%" r="75%">
      <stop offset="0" stop-color="#ffab45"/>
      <stop offset=".55" stop-color="#d9600f"/>
      <stop offset="1" stop-color="#6a2304"/>
    </radialGradient>
    <linearGradient id="wax" x1="0" x2="1">
      <stop offset="0" stop-color="#a88c62"/>
      <stop offset=".4" stop-color="#f1e2c2"/>
      <stop offset="1" stop-color="#8d7350"/>
    </linearGradient>
    <radialGradient id="flame" cy="70%">
      <stop offset="0" stop-color="#fff6c8"/>
      <stop offset=".5" stop-color="#ffc040"/>
      <stop offset="1" stop-color="#ff6a10"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".75"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0"/>
    </filter>
    <filter id="fog"><feGaussianBlur stdDeviation="30"/></filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#grass)"/>
  ${stripes}
  <rect width="${W}" height="${H}" filter="url(#noise)" opacity=".35"/>
  <!-- névoa roxa no alto -->
  <ellipse cx="${W / 2}" cy="-40" rx="${W * 0.7}" ry="160" fill="#5b2a8a" opacity=".35" filter="url(#fog)"/>
  ${leaves}

  <!-- luz de vela derramada nas bordas -->
  ${glow(0, 0, 420, 0.25)}${glow(W, 0, 420, 0.25)}
  ${glow(0, H, 460, 0.35)}${glow(W, H, 460, 0.35)}
  ${glow(0, H * 0.48, 260, 0.18)}${glow(W, H * 0.52, 260, 0.18)}

  ${cobweb(0, 0, 210, false)}
  ${cobweb(W, 0, 180, true)}
  ${bat(W * 0.36, 44, 1.1)}${bat(W * 0.62, 70, 0.8)}${bat(W * 0.5, 30, 0.6)}

  <!-- cantos de cima -->
  ${pumpkin(70, 330, 44, -8)}
  ${candle(130, 300, 46)}${candle(30, 250, 30, 10)}
  ${pumpkin(W - 74, 260, 38, 6)}
  ${candle(W - 130, 300, 56)}${candle(W - 28, 360, 34, 10)}

  <!-- laterais, rente à borda -->
  ${candle(16, H * 0.47, 40, 10)}${candle(W - 16, H * 0.55, 44, 10)}

  <!-- cantos de baixo, onde fica o gol -->
  ${pumpkin(92, H - 210, 58, -6)}
  ${pumpkin(40, H - 330, 32, 10)}
  ${candle(170, H - 150, 62)}${candle(28, H - 120, 40, 10)}${candle(150, H - 290, 34, 10)}
  ${pumpkin(W - 96, H - 190, 62, 5)}
  ${pumpkin(W - 46, H - 330, 30, -12)}
  ${candle(W - 176, H - 130, 50)}${candle(W - 26, H - 100, 64, 12)}${candle(W - 158, H - 300, 30, 10)}

  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;

sharp(Buffer.from(svg))
  .webp({ quality: 82 })
  .toFile(OUT)
  .then((info) => console.log("ok", OUT, info.size));
