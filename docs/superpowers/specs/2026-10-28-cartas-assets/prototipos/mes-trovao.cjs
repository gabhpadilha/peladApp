// Fundos candidatos do Time do Mês com o trovão, em roxo (referências do dono do app em
// 2026-10-31): A · raios gráficos sobre pinceladas, B · rede de relâmpagos, C · raios desenhados.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;

let seed = 9;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const f = (n) => n.toFixed(1);
const grain = (o) => `<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#gr)" opacity="${o}"/>`;
const svg = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}
  <filter id="bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="bl2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter></defs>${body}${grain(0.06)}</svg>`;

// A · Raios gráficos: zigue-zagues lisos em lilás claro sobre pinceladas roxas e textura rachada.
function graficos() {
  seed = 9;
  const strokes = Array.from({ length: 34 }, () => {
    const x = rnd() * W, y = rnd() * H, l = 90 + rnd() * 220, w = 25 + rnd() * 70, a = -40 + rnd() * 25;
    const color = rnd() < 0.5 ? "#3b2386" : "#5530b8";
    return `<path d="M0 0 L${f(l)} ${f(-w * 0.3)} L${f(l * 0.9)} ${f(w * 0.6)} L${f(l * 0.1)} ${f(w)} Z" transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})" fill="${color}" opacity="${f(0.45 + rnd() * 0.4)}" filter="url(#rough)"/>`;
  }).join("");
  // Raios grossos: segmentos longos alternando o lado, com espinhos curtos nas dobras.
  const bolts = Array.from({ length: 9 }, () => {
    let x = rnd() * W, y = rnd() * H;
    const dir = rnd() * Math.PI * 2;
    let d = `M${f(x)} ${f(y)}`, spikes = "";
    for (let k = 0; k < 5; k++) {
      const a = dir + (k % 2 ? 0.75 : -0.75) + (rnd() - 0.5) * 0.3, l = 45 + rnd() * 50;
      x += Math.cos(a) * l;
      y += Math.sin(a) * l;
      d += ` L${f(x)} ${f(y)}`;
      if (rnd() < 0.45) {
        const sa = a + (rnd() < 0.5 ? -1 : 1) * 1.2, sl = 18 + rnd() * 22;
        spikes += `M${f(x)} ${f(y)} L${f(x + Math.cos(sa) * sl)} ${f(y + Math.sin(sa) * sl)} `;
      }
    }
    const w = 9 + rnd() * 5;
    return `<path d="${d}" fill="none" stroke="#c9a6ff" stroke-width="${f(w)}" stroke-linejoin="miter" stroke-miterlimit="8"/>
      <path d="${spikes}" fill="none" stroke="#c9a6ff" stroke-width="${f(w * 0.6)}" stroke-linecap="round"/>`;
  }).join("");
  return svg(`<filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="2" seed="2"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter>
    <filter id="crk"><feTurbulence type="turbulence" baseFrequency=".03" numOctaves="2" seed="6"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 1.1"/></filter>`,
    `<rect width="100%" height="100%" fill="#140a33"/><rect width="100%" height="100%" filter="url(#crk)" opacity=".35"/>${strokes}${bolts}`);
}

// Raio que se ramifica: caminho em zigue-zague e galhos menores, recursivo.
function branch(x, y, angle, length, depth, out) {
  let d = `M${f(x)} ${f(y)}`;
  const steps = Math.max(6, Math.round(length / 16));
  for (let i = 0; i < steps; i++) {
    const a = angle + (rnd() - 0.5) * 1.3;
    x += Math.cos(a) * (length / steps);
    y += Math.sin(a) * (length / steps);
    d += ` L${f(x)} ${f(y)}`;
    if (depth > 0 && rnd() < 0.16) branch(x, y, angle + (rnd() < 0.5 ? -1 : 1) * (0.4 + rnd() * 0.6), length * (0.35 + rnd() * 0.25), depth - 1, out);
  }
  out.push({ d, depth });
}
function lightning(roots, width, color, core) {
  const out = [];
  for (const [x, y, a, l] of roots) branch(x, y, a, l, 3, out);
  return out.map(({ d, depth }) => {
    const w = width * (0.35 + depth * 0.22);
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w * 5)}" stroke-opacity=".4" filter="url(#bl)" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${core}" stroke-width="${f(w)}" stroke-opacity="${f(0.55 + depth * 0.15)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join("");
}

// B · Rede de relâmpagos: troncos descendo e se ramificando sobre nuvem roxa.
function rede() {
  seed = 23;
  const roots = Array.from({ length: 5 }, (_, i) => [60 + i * 120 + (rnd() - 0.5) * 60, -20, Math.PI / 2 + (rnd() - 0.5) * 0.5, 950]);
  return svg(`<filter id="cloud"><feTurbulence type="fractalNoise" baseFrequency=".008" numOctaves="4" seed="12"/><feColorMatrix type="matrix" values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .95  0 0 0 1.6 -.5"/></filter>`,
    `<rect width="100%" height="100%" fill="#0d0826"/><rect width="100%" height="100%" filter="url(#cloud)" opacity=".55"/>
    <g filter="url(#bl2)" opacity=".5">${lightning(roots, 2.2, "#9b7bff", "#9b7bff")}</g>${(seed = 23, lightning(roots, 2.2, "#b89cff", "#f4eeff"))}`);
}

// C · Raios desenhados: preto com raios brancos orgânicos e brilho lilás, vindo das bordas.
function desenhados() {
  seed = 41;
  const roots = [[-20, 120, 0.3, 500], [620, 260, Math.PI - 0.3, 520], [-20, 640, -0.25, 520], [620, 760, Math.PI + 0.2, 480], [300, -20, Math.PI / 2 + 0.3, 380]];
  return svg(`<filter id="st"><feTurbulence type="fractalNoise" baseFrequency=".004 .03" numOctaves="3" seed="8"/><feColorMatrix type="matrix" values="0 0 0 0 .3  0 0 0 0 .2  0 0 0 0 .6  0 0 0 1.2 -.55"/></filter>`,
    `<rect width="100%" height="100%" fill="#07050f"/><rect width="100%" height="100%" filter="url(#st)" opacity=".6"/>
    ${lightning(roots, 3.2, "#a77bff", "#ffffff")}`);
}

// D · Raio gráfico em neon (2ª rodada de referências, 2026-10-31: "mais vivo"): um raio grande
// atravessando a carta, desenhado só em contornos concêntricos que vão do roxo fundo ao branco.
function neonGrafico() {
  // Deslocado para a direita: o meio da carta fica atrás do jogador, e o raio aparece ao lado dele.
  const bolt = "M650 -80 L310 470 L500 440 L290 980 L740 300 L540 335 L780 -80 Z";
  const layers = [
    [90, "#5a12b8", 0.55, true], [70, "#7a1fff", 0.9, false], [58, "#12031f", 1, false], [50, "#9b3dff", 1, false],
    [40, "#160428", 1, false], [33, "#b866ff", 1, false], [24, "#2a0a4a", 0.9, false], [18, "#d9a3ff", 1, false],
    [10, "#f3e2ff", 1, false], [4, "#ffffff", 1, false],
  ];
  return svg(`<radialGradient id="flare" cx=".1" cy=".08" r=".55"><stop offset="0" stop-color="#d27bff" stop-opacity=".8"/><stop offset="1" stop-color="#7a1fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="room" cx=".55" cy=".45" r=".75"><stop offset="0" stop-color="#2a0750"/><stop offset="1" stop-color="#05010c"/></radialGradient>`,
    `<rect width="100%" height="100%" fill="url(#room)"/><rect width="100%" height="100%" fill="url(#flare)"/>
    <path d="${bolt}" fill="none" stroke="#9b3dff" stroke-width="150" stroke-opacity=".35" stroke-linejoin="miter" filter="url(#bl2)"/>
    ${layers.map(([w, c, o, blur]) => `<path d="${bolt}" fill="none" stroke="${c}" stroke-width="${w}" stroke-opacity="${o}" stroke-linejoin="miter" stroke-miterlimit="10"${blur ? ' filter="url(#bl)"' : ""}/>`).join("")}`);
}

// E · Relâmpago natural: um tronco forte saindo de um clarão no topo, com galhos finos por toda a carta.
function relampagoVivo() {
  seed = 61;
  const out = [];
  const grow = (x, y, angle, length, depth, width) => {
    let d = `M${f(x)} ${f(y)}`;
    const steps = Math.max(6, Math.round(length / 12));
    for (let i = 0; i < steps; i++) {
      const a = angle + (rnd() - 0.5) * 1.2;
      x += Math.cos(a) * (length / steps);
      y += Math.sin(a) * (length / steps);
      d += ` L${f(x)} ${f(y)}`;
      if (depth > 0 && rnd() < 0.14) grow(x, y, angle + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.7), length * (0.3 + rnd() * 0.3), depth - 1, width * 0.55);
    }
    out.push({ d, width });
  };
  grow(300, 70, Math.PI / 2 - 0.05, 860, 4, 5);
  grow(300, 70, Math.PI / 2 + 0.55, 520, 3, 3);
  grow(300, 70, Math.PI / 2 - 0.6, 540, 3, 3);
  const glow = out.map(({ d, width }) => `<path d="${d}" fill="none" stroke="#a23cff" stroke-width="${f(width * 6 + 4)}" stroke-opacity=".55" stroke-linejoin="round"/>`).join("");
  const mid = out.map(({ d, width }) => `<path d="${d}" fill="none" stroke="#c77dff" stroke-width="${f(width * 2 + 1)}" stroke-linejoin="round"/>`).join("");
  const core = out.filter(({ width }) => width > 1).map(({ d, width }) => `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${f(width * 0.8)}" stroke-linejoin="round" stroke-linecap="round"/>`).join("");
  return svg(`<radialGradient id="burst" cx=".5" cy=".08" r=".35"><stop offset="0" stop-color="#ffffff"/><stop offset=".15" stop-color="#e7c2ff" stop-opacity=".9"/><stop offset=".5" stop-color="#9b3dff" stop-opacity=".35"/><stop offset="1" stop-color="#9b3dff" stop-opacity="0"/></radialGradient>
    <radialGradient id="room" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#1e0538"/><stop offset="1" stop-color="#030008"/></radialGradient>`,
    `<rect width="100%" height="100%" fill="url(#room)"/>
    <g filter="url(#bl2)">${glow}</g><g filter="url(#bl)">${mid}</g>${mid}${core}
    <rect width="100%" height="100%" fill="url(#burst)"/>`);
}

// Aprovada pelo dono do app em 2026-10-31: a D (raio grande em neon) vira o fundo do Time do
// Mês, com o raio em contorno de neon no topo (`NEON_TRIMS.mesRaio`). A, B, C e E ficaram de fora
// (as três primeiras ele achou apagadas).
// Uso: node mes-trovao.cjs public/cartas/fundos <raiz do repo>
(async () => {
  await sharp(Buffer.from(neonGrafico())).webp({ quality: 88 }).toFile(`${OUT}/premio-time-do-mes.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
