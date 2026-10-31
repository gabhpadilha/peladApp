// Cenário Temporal da mesa tática (novembro de 2026): quadra molhada à noite, poças refletindo
// os refletores dos cantos, chuva e raios no alto. Gera public/mesa/temporal.webp.
// Uso: node docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/mesa-temporal.cjs
const path = require("node:path");
const sharp = require("sharp");

const W = 800;
const H = 1480;
const OUT = path.join(__dirname, "../../../../../public/mesa/temporal.webp");

// Gerador pseudoaleatório fixo: a arte sai igual a cada execução.
let seed = 5;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function rain(count, opacity) {
  return Array.from({ length: count }, () => {
    const x = rand() * (W + 300) - 150;
    const y = rand() * H;
    const l = 26 + rand() * 46;
    return `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - l * 0.25).toFixed(0)}" y2="${(y + l).toFixed(0)}" stroke="#d8ecff" stroke-opacity="${(opacity * (0.35 + rand() * 0.65)).toFixed(2)}" stroke-width="${(0.8 + rand() * 1.1).toFixed(1)}" stroke-linecap="round"/>`;
  }).join("");
}

// Pingos batendo no chão: anéis achatados.
function splashes(count) {
  return Array.from({ length: count }, () => {
    const x = rand() * W;
    const y = rand() * H;
    const r = 4 + rand() * 9;
    return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(1)}" ry="${(r * 0.38).toFixed(1)}" fill="none" stroke="#cfe6ff" stroke-opacity="${(0.08 + rand() * 0.12).toFixed(2)}" stroke-width="1"/>`;
  }).join("");
}

// Poças: manchas escuras com o reflexo azulado dos refletores.
function puddle(cx, cy, rx, ry) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#puddle)" opacity=".9"/>
    <ellipse cx="${cx - rx * 0.2}" cy="${cy - ry * 0.15}" rx="${rx * 0.5}" ry="${ry * 0.25}" fill="#bfe0ff" opacity=".07"/>`;
}

function boltPath(x, y, len, spread) {
  let d = `M${x} ${y}`;
  const branches = [];
  let cx = x;
  let cy = y;
  const steps = 9;
  for (let i = 0; i < steps; i++) {
    cx += (rand() - 0.5) * spread;
    cy += len / steps;
    d += ` L${cx.toFixed(1)} ${cy.toFixed(1)}`;
    if (i > 0 && i < steps - 2 && rand() < 0.4) {
      let bx = cx;
      let by = cy;
      let bd = `M${bx.toFixed(1)} ${by.toFixed(1)}`;
      const dir = rand() < 0.5 ? -1 : 1;
      for (let k = 0; k < 3; k++) {
        bx += dir * (10 + rand() * spread * 0.6);
        by += (len / steps) * 0.7;
        bd += ` L${bx.toFixed(1)} ${by.toFixed(1)}`;
      }
      branches.push(bd);
    }
  }
  return [d, ...branches];
}
function bolt(x, y, len, spread, strength) {
  return boltPath(x, y, len, spread)
    .map((d, i) => {
      const w = i === 0 ? 1 : 0.55;
      return `<path d="${d}" fill="none" stroke="#9fd2ff" stroke-width="${16 * w}" stroke-opacity="${0.14 * strength}" stroke-linejoin="round" filter="url(#bl)"/>
        <path d="${d}" fill="none" stroke="#9fd2ff" stroke-width="${5 * w}" stroke-opacity="${0.4 * strength}" stroke-linejoin="round"/>
        <path d="${d}" fill="none" stroke="#ffffff" stroke-width="${1.8 * w}" stroke-opacity="${0.9 * strength}" stroke-linejoin="round"/>`;
    })
    .join("");
}

// Refletor do canto: luz fria que derrama na quadra.
function floodlight(cx, cy, r, opacity) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#flood)" opacity="${opacity}"/>`;
}

const stripes = Array.from({ length: Math.ceil(H / 92) }, (_, i) =>
  i % 2 ? `<rect x="0" y="${i * 92}" width="${W}" height="92" fill="#ffffff" opacity=".03"/>` : "",
).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="court" cx="50%" cy="50%" r="72%">
      <stop offset="0" stop-color="#1a2a2c"/>
      <stop offset=".6" stop-color="#0e1820"/>
      <stop offset="1" stop-color="#05080e"/>
    </radialGradient>
    <radialGradient id="flood">
      <stop offset="0" stop-color="#cfe8ff" stop-opacity=".9"/>
      <stop offset=".3" stop-color="#6aa8e8" stop-opacity=".35"/>
      <stop offset="1" stop-color="#6aa8e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="puddle">
      <stop offset="0" stop-color="#0a1626"/>
      <stop offset=".7" stop-color="#0d1c2e" stop-opacity=".8"/>
      <stop offset="1" stop-color="#0d1c2e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="storm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a3a66" stop-opacity=".85"/>
      <stop offset="1" stop-color="#2a3a66" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset=".55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".7"/>
    </radialGradient>
    <filter id="bl" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="cl" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#court)"/>
  ${stripes}
  <rect width="${W}" height="${H}" filter="url(#noise)" opacity=".3"/>

  <!-- poças nos cantos e nas laterais, onde o 1-2-1 não põe carta -->
  ${puddle(110, 300, 120, 46)}${puddle(W - 120, 360, 110, 40)}
  ${puddle(60, H * 0.5, 70, 30)}${puddle(W - 60, H * 0.55, 80, 30)}
  ${puddle(130, H - 260, 150, 54)}${puddle(W - 140, H - 220, 160, 56)}
  ${splashes(70)}

  <!-- refletores nos quatro cantos -->
  ${floodlight(0, 0, 440, 0.45)}${floodlight(W, 0, 440, 0.45)}
  ${floodlight(0, H, 480, 0.35)}${floodlight(W, H, 480, 0.35)}

  <!-- nuvens carregadas e raios no alto -->
  <rect width="${W}" height="260" fill="url(#storm)"/>
  <g filter="url(#cl)">
    ${Array.from({ length: 8 }, (_, i) => `<ellipse cx="${(i / 7) * W}" cy="${10 + rand() * 50}" rx="${120 + rand() * 60}" ry="${60 + rand() * 30}" fill="#3a4c80" opacity=".8"/>`).join("")}
  </g>
  ${bolt(170, -10, 260, 40, 1)}
  ${bolt(W - 150, -10, 200, 36, 0.8)}

  ${rain(260, 0.28)}
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;

sharp(Buffer.from(svg))
  .webp({ quality: 82 })
  .toFile(OUT)
  .then((info) => console.log("ok", OUT, info.size));
