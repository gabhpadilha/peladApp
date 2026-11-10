// Nublado e Neblina (comuns do conjunto de novembro de 2026, tema Toró; 2026-11-10): o dono pediu para eu mesmo fazer as raras e as comuns por aqui, sem o Gemini.
// Fundo de textura leve (regra da comum: borda simples, que o app desenha como tubo de neon, e fundo padrão ou textura leve): céu de toró em cinza-azulado, nuvens
// suaves em duas camadas de ruído fractal (feTurbulence), névoa embaixo, um brilho frio no alto e poucas gotas pequenas. Sem raios e sem objetos 3D.
// Saem `skin-nublado.webp` (cinza-azulado) e o mesmo desenho girado para o verde-musgo (`skin-neblina`), o bronze/areia (`skin-cerracao`) e o vinho (`skin-crepusculo`), 600 x 860 como as outras comuns.
// Uso: node nublado.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;

// gotas pequenas, posições fixas (sorteio com semente para o desenho ser o mesmo a cada execução)
let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const drops = Array.from({ length: 26 }, () => ({ x: 30 + rnd() * (W - 60), y: 30 + rnd() * (H - 60), r: 3.5 + rnd() * 7 }));
const dropSvg = drops.map((d) => `
  <g opacity="${(0.55 + rnd() * 0.35).toFixed(2)}">
    <ellipse cx="${d.x}" cy="${d.y + d.r * 0.5}" rx="${d.r * 0.85}" ry="${d.r * 1.25}" fill="url(#drop)" stroke="rgba(225,240,255,.35)" stroke-width="0.8"/>
    <ellipse cx="${d.x - d.r * 0.3}" cy="${d.y + d.r * 0.1}" rx="${d.r * 0.22}" ry="${d.r * 0.38}" fill="rgba(255,255,255,.85)"/>
  </g>`).join("");
// fios de chuva bem leves, na diagonal
const streaks = Array.from({ length: 70 }, () => ({ x: -80 + rnd() * (W + 160), y: -40 + rnd() * H, l: 40 + rnd() * 110, o: 0.05 + rnd() * 0.09 }));
const streakSvg = streaks.map((s) => `<line x1="${s.x}" y1="${s.y}" x2="${s.x - s.l * 0.3}" y2="${s.y + s.l}" stroke="#e4f0ff" stroke-opacity="${s.o.toFixed(3)}" stroke-width="${(1 + rnd() * 0.8).toFixed(2)}" stroke-linecap="round"/>`).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#62778f"/><stop offset=".42" stop-color="#3e5066"/><stop offset="1" stop-color="#22303f"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".06" r=".7"><stop offset="0" stop-color="#d9ecff" stop-opacity=".42"/><stop offset="1" stop-color="#d9ecff" stop-opacity="0"/></radialGradient>
  <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#b8cde2" stop-opacity="0"/><stop offset="1" stop-color="#b8cde2" stop-opacity=".30"/></linearGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></radialGradient>
  <radialGradient id="drop" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#bcd8f2" stop-opacity=".5"/><stop offset="1" stop-color="#16283a" stop-opacity=".28"/></radialGradient>
  <filter id="cloudHi" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.0042 0.0085" numOctaves="5" seed="4"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.84  0 0 0 0 0.9  0 0 0 0 0.97  2.3 0 0 0 -0.92"/>
  </filter>
  <filter id="cloudLo" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="4" seed="19"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.18  0 0 0 0 0.26  2.1 0 0 0 -0.78"/>
  </filter>
  <filter id="soft"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="${H}" filter="url(#cloudLo)" opacity=".85"/>
<rect width="${W}" height="${H}" filter="url(#cloudHi)" opacity=".78"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<g filter="url(#soft)">${streakSvg}</g>
<rect width="${W}" height="${H}" fill="url(#mist)"/>
${dropSvg}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;

(async () => {
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(base).webp({ quality: 90 }).toFile(path.join(OUT, "skin-nublado.webp"));
  const tones = { neblina: { hue: -58, saturation: 0.95, brightness: 0.97 }, cerracao: { hue: 150, saturation: 0.8 }, crepusculo: { hue: 92, saturation: 1.2 } };
  for (const [name, tone] of Object.entries(tones)) await sharp(base).modulate(tone).webp({ quality: 90 }).toFile(path.join(OUT, `skin-${name}.webp`));
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
