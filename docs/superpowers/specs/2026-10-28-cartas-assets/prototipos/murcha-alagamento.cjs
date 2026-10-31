// Fundos candidatos da Bola Murcha com o alagamento (pedido do dono do app em 2026-10-31):
// A · poças no chão molhado, B · quadra alagada, C · água subindo. Tudo fosco e apagado, e a
// bola murcha ao lado do jogador, agora dentro d'água.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;

let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f = (n) => n.toFixed(1);
const grain = (o) => `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="7"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity="${o}"/>`;
const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${body}${grain(0.09)}</svg>`;

// A bola murcha do fundo atual (achatada, vinco e gomos tortos), sem a sombra.
const ballShape = (stroke, fill) => `<g fill="none" stroke="${stroke}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 30 C2 18 8 6 20 5 C32 4 39 14 37 26 C36 32 31 34 20 34 C11 34 5 34 4 30 Z" fill="${fill}"/>
  <path d="M15 14 L21 11 L26 15 L24 21 L17 21 Z" fill="${stroke}" fill-opacity=".35"/>
  <path d="M15 14 L9 12 M26 15 L32 13 M24 21 L28 27 M17 21 L12 27 M21 11 L21 6"/>
  <path d="M8 31 Q14 27 20 31 Q27 27 34 31" stroke-opacity=".8"/>
  <path d="M30 22 Q33 24 32 28" stroke-opacity=".6"/></g>`;
// Bola afundada até a linha da água: embaixo dela, só o reflexo invertido e apagado.
function sunkBall(x, y, s, waterline, stroke, fill) {
  const id = `bw${Math.round(x)}`;
  return `<clipPath id="${id}a"><rect x="0" y="0" width="${W}" height="${waterline}"/></clipPath>
    <clipPath id="${id}b"><rect x="0" y="${waterline}" width="${W}" height="${H}"/></clipPath>
    <g clip-path="url(#${id}b)" opacity=".16"><g transform="translate(0 ${2 * waterline}) scale(1 -1)"><g transform="translate(${x} ${y}) scale(${s})">${ballShape(stroke, fill)}</g></g></g>
    <g clip-path="url(#${id}a)"><g transform="translate(${x} ${y}) scale(${s})">${ballShape(stroke, fill)}</g></g>
    ${ripples(x + 20.5 * s, waterline, s * 23, 4, stroke, 0.5)}`;
}
// Anéis de onda achatados em volta de um ponto.
function ripples(cx, cy, r0, count, color, opacity) {
  return Array.from({ length: count }, (_, i) => {
    const r = r0 * (1 + i * 0.32);
    return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r)}" ry="${f(r * 0.22)}" fill="none" stroke="${color}" stroke-opacity="${f(opacity * (1 - i / count))}" stroke-width="${f(1.6 - i * 0.25)}"/>`;
  }).join("");
}
// Pingos caindo: pequenos anéis espalhados.
function drops(count, color, opacity, yMin = 0) {
  return Array.from({ length: count }, () => {
    const x = rnd() * W, y = yMin + rnd() * (H - yMin), r = 5 + rnd() * 14;
    return ripples(x, y, r, 2, color, opacity * (0.4 + rnd() * 0.6));
  }).join("");
}
// Poça de borda irregular.
function puddle(cx, cy, rx, ry, fill, edge) {
  const n = 18;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, k = 0.82 + rnd() * 0.3;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  let d = `M${f((pts[0][0] + pts[n - 1][0]) / 2)} ${f((pts[0][1] + pts[n - 1][1]) / 2)}`;
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[(i + 1) % n];
    d += ` Q${f(x)} ${f(y)} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`;
  }
  return `<path d="${d} Z" fill="${fill}" stroke="${edge}" stroke-opacity=".35" stroke-width="1.5"/>
    <path d="${d} Z" fill="url(#sky)" opacity=".5"/>`;
}

// A · Poças: chão de concreto molhado, poças refletindo um céu cinza, a bola numa poça.
function pocas() {
  seed = 3;
  const floor = `<filter id="cc"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="4" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 .32  0 0 0 0 .30  0 0 0 0 .26  0 0 0 1.4 -.45"/></filter>`;
  return svg(`${floor}
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2a24"/><stop offset="1" stop-color="#121210"/></linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f9a86" stop-opacity=".35"/><stop offset="1" stop-color="#8f9a86" stop-opacity="0"/></linearGradient>`,
    `<rect width="100%" height="100%" fill="url(#b)"/><rect width="100%" height="100%" filter="url(#cc)" opacity=".4"/>
    ${puddle(90, 240, 120, 60, "#0e1311", "#a8b5a0")}${puddle(110, 610, 150, 70, "#0e1311", "#a8b5a0")}
    ${puddle(470, 470, 170, 70, "#0e1311", "#a8b5a0")}${puddle(520, 180, 90, 40, "#0e1311", "#a8b5a0")}${puddle(300, 790, 220, 60, "#0e1311", "#a8b5a0")}
    ${drops(16, "#a8b5a0", 0.35, 120)}
    ${sunkBall(395, 340, 5, 470, "#a8b5a0", "#24201a")}`);
}

// B · Quadra alagada: a água cobre tudo, as linhas da quadra tremem embaixo, pingos por toda parte.
function quadra() {
  seed = 17;
  return svg(`<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2621"/><stop offset=".6" stop-color="#121a17"/><stop offset="1" stop-color="#0a0f0d"/></linearGradient>
    <filter id="wv" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".012 .04" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="26"/></filter>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a8b5a0" stop-opacity=".12"/><stop offset=".5" stop-color="#a8b5a0" stop-opacity="0"/><stop offset="1" stop-color="#a8b5a0" stop-opacity=".08"/></linearGradient>`,
    `<rect width="100%" height="100%" fill="url(#b)"/>
    <g filter="url(#wv)" fill="none" stroke="#a8b5a0" stroke-opacity=".22" stroke-width="7">
      <line x1="-20" y1="250" x2="620" y2="250"/><circle cx="300" cy="250" r="150"/><path d="M90 900 V700 Q300 600 510 700 V900"/><line x1="40" y1="-20" x2="40" y2="900"/><line x1="560" y1="-20" x2="560" y2="900"/>
    </g>
    <rect width="100%" height="100%" fill="url(#sheen)"/>
    ${drops(40, "#a8b5a0", 0.4)}
    ${sunkBall(395, 345, 5, 480, "#a8b5a0", "#24201a")}`);
}

// C · Água subindo: parede escura e molhada em cima, água barrenta da metade para baixo.
function subindo() {
  seed = 29;
  const level = 470;
  let surface = `M0 ${level}`;
  for (let x = 0; x <= W; x += 20) surface += ` Q${x + 10} ${f(level + (rnd() - 0.5) * 12)} ${x + 20} ${f(level + (rnd() - 0.5) * 6)}`;
  const streaks = Array.from({ length: 24 }, () => {
    const x = rnd() * W, y = rnd() * 260, l = 60 + rnd() * 160;
    return `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x)}" y2="${f(y + l)}" stroke="#a8b5a0" stroke-opacity="${f(0.04 + rnd() * 0.08)}" stroke-width="${f(1 + rnd() * 2)}" stroke-linecap="round"/>`;
  }).join("");
  const bubbles = Array.from({ length: 30 }, () => `<circle cx="${f(rnd() * W)}" cy="${f(level + 30 + rnd() * 380)}" r="${f(1.5 + rnd() * 4)}" fill="none" stroke="#c2a27e" stroke-opacity="${f(0.12 + rnd() * 0.2)}"/>`).join("");
  return svg(`<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25221d"/><stop offset="1" stop-color="#16140f"/></linearGradient>
    <linearGradient id="mud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3c28"/><stop offset=".4" stop-color="#2c2418"/><stop offset="1" stop-color="#14100a"/></linearGradient>
    <filter id="mt"><feTurbulence type="fractalNoise" baseFrequency=".01 .05" numOctaves="3" seed="9"/><feColorMatrix type="matrix" values="0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .32  0 0 0 1.6 -.7"/></filter>
    <clipPath id="wt"><path d="${surface} V${H} H0 Z"/></clipPath>`,
    `<rect width="100%" height="100%" fill="url(#wall)"/>${streaks}
    <rect x="0" y="${level - 40}" width="${W}" height="40" fill="#4a3c28" opacity=".25"/>
    <g clip-path="url(#wt)"><rect width="100%" height="100%" fill="url(#mud)"/><rect width="100%" height="100%" filter="url(#mt)" opacity=".5"/>${bubbles}</g>
    <path d="${surface}" fill="none" stroke="#c9b48e" stroke-opacity=".45" stroke-width="2.5"/>
    ${sunkBall(395, 335, 5, level, "#a8b5a0", "#24201a")}`);
}

// Aprovada pelo dono do app em 2026-10-31: a C (água subindo) vira o fundo da Bola Murcha.
// A e B ficaram de fora.
// Uso: node murcha-alagamento.cjs public/cartas/fundos <raiz do repo>
(async () => {
  await sharp(Buffer.from(subindo())).webp({ quality: 88 }).toFile(`${OUT}/premio-bola-murcha.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
