// Gera fundos artísticos (SVG -> WebP) para a prévia das cartas.
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
const grain = (o = 0.09, id = "gr") => `
  <filter id="${id}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix type="saturate" values="0"/></filter>
  <rect width="100%" height="100%" filter="url(#${id})" opacity="${o}" style="mix-blend-mode:overlay"/>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;

const BG = {};

// 1 · Cristais (facetas lapidadas)
{ seed = 11; const cols = 7, rows = 11, pts = [];
  for (let j = 0; j <= rows; j++) { pts.push([]); for (let i = 0; i <= cols; i++) {
    const edge = i === 0 || j === 0 || i === cols || j === rows;
    pts[j].push([i * W / cols + (edge ? 0 : (rnd() - .5) * 60), j * H / rows + (edge ? 0 : (rnd() - .5) * 60)]); } }
  let tris = "";
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i], d = pts[j + 1][i + 1];
    for (const t of (rnd() > .5 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]])) {
      const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
      const dist = Math.hypot(cx - W / 2, cy - H * .38) / 520;
      const h = 255 + cx / W * 45 - cy / H * 25, l = 46 - dist * 34 + (rnd() - .5) * 16;
      tris += `<polygon points="${t.map(p => p.join(",")).join(" ")}" fill="${hsl(h, 70, Math.max(6, l))}" stroke="${hsl(h, 90, 80, .14)}" stroke-width="1"/>`;
      if (rnd() > .86) tris += `<polygon points="${t.map(p => p.join(",")).join(" ")}" fill="url(#shine)" opacity=".55"/>`;
    } }
  BG.cristais = svg(`<defs><linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow" cx=".5" cy=".38" r=".5"><stop offset="0" stop-color="#e9d8ff" stop-opacity=".55"/><stop offset="1" stop-color="#e9d8ff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="#120a2a"/>${tris}<rect width="100%" height="100%" fill="url(#glow)"/>${grain(.08)}`);
}

// 2 · Mosaico prismático (pirâmides lapidadas, como as Prizm)
{ seed = 5; let t = ""; const s = 46, hs = s / 2;
  for (let j = -1; j * hs < H + s; j++) for (let i = -1; i * s < W + s; i++) {
    const cx = i * s + (j % 2 ? hs : 0), cy = j * hs;
    const N = [cx, cy - hs], E = [cx + hs, cy], S = [cx, cy + hs], Wp = [cx - hs, cy], C = [cx, cy];
    const base = 48 + (rnd() - .5) * 14, hue = 42 + (cx / W) * 10;
    [[N, E, 88], [E, S, 46], [S, Wp, 28], [Wp, N, 66]].forEach(([p1, p2, l]) => {
      t += `<polygon points="${[p1, p2, C].map(q => q.join(",")).join(" ")}" fill="${hsl(hue, 75, Math.min(92, l * base / 50))}"/>`; }); }
  BG.prisma = svg(`<defs><linearGradient id="dk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140c00" stop-opacity=".1"/><stop offset=".65" stop-color="#140c00" stop-opacity=".45"/><stop offset="1" stop-color="#140c00" stop-opacity=".85"/></linearGradient>
    <radialGradient id="sh" cx=".5" cy=".36" r=".45"><stop offset="0" stop-color="#fff8dc" stop-opacity=".6"/><stop offset="1" stop-color="#fff8dc" stop-opacity="0"/></radialGradient>
    <linearGradient id="rbw" x1="0" y1="0" x2="1" y2="1"><stop offset=".3" stop-color="#ff7ad9" stop-opacity="0"/><stop offset=".45" stop-color="#7ae1ff" stop-opacity=".28"/><stop offset=".55" stop-color="#b6ff7a" stop-opacity=".22"/><stop offset=".7" stop-color="#ff7ad9" stop-opacity="0"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="#6b4a0a"/>${t}<rect width="100%" height="100%" fill="url(#rbw)"/><rect width="100%" height="100%" fill="url(#sh)"/><rect width="100%" height="100%" fill="url(#dk)"/>${grain(.08)}`);
}

// 3 · Mármore negro com veios dourados (listras finas deformadas por ruído)
{ seed = 9; let v = "", smoke = "";
  for (let i = 0; i < 16; i++) { const y = -200 + i * 80 + rnd() * 50, w = rnd() > .7 ? 2.6 : 1 + rnd();
    v += `<line x1="-400" y1="${y}" x2="${W + 400}" y2="${y + 520}" stroke="url(#vg)" stroke-width="${w.toFixed(1)}" stroke-opacity="${(.45 + rnd() * .5).toFixed(2)}"/>`;
    if (i % 3 === 0) smoke += `<line x1="-400" y1="${y + 20}" x2="${W + 400}" y2="${y + 540}" stroke="#d8b46a" stroke-width="26" stroke-opacity=".10"/>`; }
  BG.marmore = svg(`<defs>
    <linearGradient id="vg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5512"/><stop offset=".5" stop-color="#ffe6a0"/><stop offset="1" stop-color="#a8781f"/></linearGradient>
    <filter id="dm" x="-400" y="-400" width="${W + 800}" height="${H + 800}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="4" seed="12" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="190" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="sm" x="-400" y="-400" width="${W + 800}" height="${H + 800}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="4" seed="12" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="190" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="14"/></filter>
    <radialGradient id="mg" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#26221c"/><stop offset="1" stop-color="#050505"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#mg)"/><g filter="url(#sm)">${smoke}</g><g filter="url(#dm)">${v}</g>${grain(.07)}`);
}

// 4 · Topografia (curvas de nível)
{ seed = 3; let p = ""; const cx = W * .5, cy = H * .36;
  for (let k = 0; k < 34; k++) { const r = 18 + k * 17; let d = "";
    for (let a = 0; a <= 360; a += 4) { const t = a * Math.PI / 180;
      const rr = r * (1 + .10 * Math.sin(3 * t + k * .35) + .06 * Math.sin(5 * t - k * .2) + .03 * Math.sin(9 * t + k));
      d += `${a ? "L" : "M"}${(cx + rr * Math.cos(t)).toFixed(1)},${(cy + rr * Math.sin(t) * 1.15).toFixed(1)}`; }
    p += `<path d="${d}Z" fill="none" stroke="#c6f24e" stroke-opacity="${(.55 - k * .012).toFixed(3)}" stroke-width="${k % 5 === 0 ? 2.2 : 1}"/>`; }
  BG.topografia = svg(`<defs><radialGradient id="tg" cx=".5" cy=".36" r=".75"><stop offset="0" stop-color="#1d4a2c"/><stop offset="1" stop-color="#06100a"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#tg)"/>${p}${grain(.08)}`);
}

// 5 · Estilhaços metálicos
{ seed = 21; let s = ""; const cx = W * .5, cy = H * .38;
  for (let i = 0; i < 26; i++) { const a0 = rnd() * Math.PI * 2, w = .08 + rnd() * .16, r1 = 60 + rnd() * 80, r2 = 380 + rnd() * 400;
    const P = [[a0, r1], [a0 + w, r2], [a0 + w * .4, r2 * 1.05], [a0 - w * .3, r2 * .9]].map(([a, r]) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`).join(" ");
    s += `<polygon points="${P}" fill="url(#${rnd() > .45 ? "gold" : "steel"})" opacity="${(.35 + rnd() * .5).toFixed(2)}" stroke="#fff6d0" stroke-opacity=".35" stroke-width="1.2"/>`; }
  BG.estilhacos = svg(`<defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".4" stop-color="#c9971f"/><stop offset=".7" stop-color="#fbe39a"/><stop offset="1" stop-color="#7a5512"/></linearGradient>
    <linearGradient id="steel" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1b3f8f"/><stop offset=".5" stop-color="#6fa8ff"/><stop offset="1" stop-color="#0d1f4d"/></linearGradient>
    <radialGradient id="eg" cx=".5" cy=".38" r=".6"><stop offset="0" stop-color="#2d5bd1"/><stop offset="1" stop-color="#050b20"/></radialGradient>
    <radialGradient id="eh" cx=".5" cy=".38" r=".3"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#eg)"/>${s}<rect width="100%" height="100%" fill="url(#eh)"/>${grain(.08)}`);
}

// 6 · Pôster de meio-tom com linhas de velocidade
{ let d = ""; const s = 14;
  for (let y = 0; y < H; y += s) for (let x = (y / s) % 2 ? s / 2 : 0; x < W; x += s) {
    const k = Math.max(0, 1 - Math.hypot(x - W * .5, y - H * .36) / 520); d += `<circle cx="${x}" cy="${y}" r="${(k * 6.4).toFixed(2)}"/>`; }
  let lines = ""; seed = 4;
  for (let i = 0; i < 22; i++) { const y = rnd() * H, len = 120 + rnd() * 300, x = rnd() * W; lines += `<line x1="${x}" y1="${y}" x2="${x + len}" y2="${y - len * .58}" stroke="#fff" stroke-opacity="${(.06 + rnd() * .12).toFixed(2)}" stroke-width="${(1 + rnd() * 3).toFixed(1)}"/>`; }
  BG.meiotom = svg(`<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3d2e"/><stop offset=".55" stop-color="#b3122e"/><stop offset="1" stop-color="#3a0418"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#hg)"/><g fill="#ffb199" fill-opacity=".38">${d}</g>${lines}${grain(.1)}`);
}

// 7 · Aurora (gradiente líquido)
BG.aurora = svg(`<defs><filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter></defs>
  <rect width="100%" height="100%" fill="#071423"/>
  <g filter="url(#bl)"><ellipse cx="120" cy="200" rx="260" ry="200" fill="#00e1b4" opacity=".75"/><ellipse cx="500" cy="300" rx="240" ry="260" fill="#7b4dff" opacity=".8"/>
  <ellipse cx="300" cy="620" rx="320" ry="180" fill="#ff4fa3" opacity=".55"/><ellipse cx="420" cy="80" rx="200" ry="120" fill="#36a3ff" opacity=".7"/></g>${grain(.12)}`);

// 8 · Folha holográfica ondulada
BG.holo = svg(`<defs>
  <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1" spreadMethod="reflect" gradientTransform="scale(.35)">
    <stop offset="0" stop-color="#9fe7ff"/><stop offset=".2" stop-color="#f6b7ff"/><stop offset=".4" stop-color="#fff4b0"/><stop offset=".6" stop-color="#a7ffd8"/><stop offset=".8" stop-color="#b8c2ff"/><stop offset="1" stop-color="#ffc6a8"/></linearGradient>
  <filter id="wv" x="-300" y="-300" width="${W + 600}" height="${H + 600}" filterUnits="userSpaceOnUse"><feTurbulence type="turbulence" baseFrequency="0.004 0.012" numOctaves="2" seed="5" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="160" xChannelSelector="R" yChannelSelector="G"/></filter>
  <linearGradient id="hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120d24" stop-opacity=".35"/><stop offset=".75" stop-color="#120d24" stop-opacity=".7"/><stop offset="1" stop-color="#120d24" stop-opacity=".9"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#rb)"/><rect x="-300" y="-300" width="${W + 600}" height="${H + 600}" fill="url(#rb)" filter="url(#wv)"/><rect width="100%" height="100%" fill="url(#hd)"/>${grain(.1)}`);

(async () => { for (const [k, s] of Object.entries(BG)) { await sharp(Buffer.from(s)).webp({ quality: 88 }).toFile(`${OUT}/bg-${k}.webp`); console.log("ok", k); } })()
  .catch(e => { console.error(e); process.exit(1); });
