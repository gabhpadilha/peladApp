// Fundos do tema "Temporal" (ideia para novembro): céu de tempestade, chuva fina e raios.
// Melhor Jogador do Temporal; os destaques saem de `destaques-temporal.cjs`. O Relâmpago antigo
// (amarelo) saiu em 2026-10-31 para a arte do dono (`skin-relampago-arte.cjs`). O Trovão
// (tempestade roxa) saiu em 2026-10-31 para a Nuvem carregada (`skin-nuvem.cjs`); a função ficou de registro.
// Uso: node temporal.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const root = process.argv[3];
const sharp = require(path.resolve(root, "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;

const grain = `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity=".08"/>`;

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// Chuva: riscos finos inclinados.
function rain(color, count, opacity) {
  return Array.from({ length: count }, () => {
    const x = rnd() * (W + 200) - 100, y = rnd() * H, l = 18 + rnd() * 34;
    return `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - l * 0.28).toFixed(0)}" y2="${(y + l).toFixed(0)}" stroke="${color}" stroke-opacity="${(opacity * (0.4 + rnd() * 0.6)).toFixed(2)}" stroke-width="${(0.8 + rnd()).toFixed(1)}" stroke-linecap="round"/>`;
  }).join("");
}

// Raio com galhos: caminho em zigue-zague de (x, y) descendo `len`.
function boltPath(x, y, len, spread) {
  let d = `M${x} ${y}`;
  const branches = [];
  let cx = x, cy = y;
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    cx += (rnd() - 0.5) * spread;
    cy += len / steps;
    d += ` L${cx.toFixed(1)} ${cy.toFixed(1)}`;
    if (i > 1 && i < steps - 2 && rnd() < 0.35) {
      let bx = cx, by = cy, bd = `M${bx.toFixed(1)} ${by.toFixed(1)}`;
      const dir = rnd() < 0.5 ? -1 : 1;
      for (let k = 0; k < 4; k++) {
        bx += dir * (8 + rnd() * spread * 0.6);
        by += len / steps * 0.7;
        bd += ` L${bx.toFixed(1)} ${by.toFixed(1)}`;
      }
      branches.push(bd);
    }
  }
  return [d, ...branches];
}
function bolt(x, y, len, spread, color, strength = 1) {
  return boltPath(x, y, len, spread).map((d, i) => {
    const w = i === 0 ? 1 : 0.55;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${14 * w}" stroke-opacity="${0.12 * strength}" stroke-linejoin="round" filter="url(#bl)"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="${5 * w}" stroke-opacity="${0.35 * strength}" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="#ffffff" stroke-width="${1.8 * w}" stroke-opacity="${0.85 * strength}" stroke-linejoin="round"/>`;
  }).join("");
}
// Nuvens escuras no alto.
function clouds(color, opacity) {
  return Array.from({ length: 9 }, (_, i) => {
    const x = (i / 8) * W + (rnd() - 0.5) * 60, y = 20 + rnd() * 90, r = 90 + rnd() * 70;
    return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.55).toFixed(0)}" fill="${color}" opacity="${opacity}"/>`;
  }).join("");
}
const defs = `<filter id="bl" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="6"/></filter><filter id="cl" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="22"/></filter>`;

const CUP = "M10 2h28v6h8c0 12-6 18-12 20-2 6-6 9-8 10v8h8v6H14v-6h8v-8c-2-1-6-4-8-10C8 26 2 20 2 8h8V2zm-4 10c1 7 4 11 7 12-1-4-2-8-2-12H6zm31 0c0 4-1 8-2 12 3-1 6-5 7-12h-5zM10 56h28v6H10z";

function craque() {
  seed = 21;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2236"/><stop offset=".55" stop-color="#0b0f1c"/><stop offset="1" stop-color="#03040a"/></linearGradient>
    <linearGradient id="cupg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a0" stop-opacity=".45"/><stop offset=".65" stop-color="#d9a400" stop-opacity=".26"/><stop offset="1" stop-color="#d9a400" stop-opacity=".05"/></linearGradient>
    <radialGradient id="glow" cx=".62" cy=".22" r=".5"><stop offset="0" stop-color="#bfe4ff" stop-opacity=".28"/><stop offset="1" stop-color="#bfe4ff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g filter="url(#cl)">${clouds("#3a4566", 0.7)}</g>
    <rect width="100%" height="100%" fill="url(#glow)"/>
    ${bolt(420, -10, 420, 46, "#9fd8ff", 0.9)}
    ${rain("#cfe6ff", 140, 0.22)}
    <path d="${CUP}" transform="translate(250 70) scale(8.6)" fill="url(#cupg)" stroke="#fff1a0" stroke-opacity=".6" stroke-width="0.19" stroke-linejoin="round"/>${grain}</svg>`;
}

// Trovão: tempestade roxa, um raio grande atrás do jogador.
function trovao() {
  seed = 45;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}
    <radialGradient id="b" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#3b2c86"/><stop offset=".55" stop-color="#150f3a"/><stop offset="1" stop-color="#05031a"/></radialGradient>
    <radialGradient id="f" cx=".5" cy=".25" r=".45"><stop offset="0" stop-color="#c9b8ff" stop-opacity=".35"/><stop offset="1" stop-color="#c9b8ff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#b)"/>
    <g filter="url(#cl)">${clouds("#6a58c0", 0.55)}</g>
    <rect width="100%" height="100%" fill="url(#f)"/>
    ${bolt(300, -10, 640, 70, "#b9a6ff", 1)}
    ${bolt(520, 40, 300, 40, "#b9a6ff", 0.5)}
    ${bolt(70, 60, 260, 36, "#b9a6ff", 0.4)}
    ${rain("#e0d8ff", 120, 0.18)}${grain}</svg>`;
}

// Relâmpago: preto com eletricidade amarela estalando pela carta.
function relampago() {
  seed = 57;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1a0c"/><stop offset=".6" stop-color="#0a0904"/><stop offset="1" stop-color="#030300"/></linearGradient>
    <radialGradient id="f" cx=".5" cy=".3" r=".5"><stop offset="0" stop-color="#ffe14d" stop-opacity=".22"/><stop offset="1" stop-color="#ffe14d" stop-opacity="0"/></radialGradient>
    <pattern id="hx" width="34" height="58.9" patternUnits="userSpaceOnUse"><path d="M17 0 L34 9.8 V29.4 L17 39.3 L0 29.4 V9.8 Z M17 39.3 V58.9" fill="none" stroke="#ffe14d" stroke-opacity=".05" stroke-width="1"/></pattern></defs>
    <rect width="100%" height="100%" fill="url(#b)"/><rect width="100%" height="100%" fill="url(#hx)"/>
    <rect width="100%" height="100%" fill="url(#f)"/>
    ${bolt(470, -10, 520, 60, "#ffe14d", 1)}
    ${bolt(120, -10, 380, 44, "#ffe14d", 0.75)}
    ${bolt(300, -10, 200, 30, "#ffe14d", 0.45)}
    ${bolt(40, 300, 260, 30, "#ffe14d", 0.4)}
    ${bolt(570, 280, 300, 30, "#ffe14d", 0.45)}${grain}</svg>`;
}

(async () => {
  await sharp(Buffer.from(craque())).webp({ quality: 86 }).toFile(`${OUT}/premio-craque-temporal.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
