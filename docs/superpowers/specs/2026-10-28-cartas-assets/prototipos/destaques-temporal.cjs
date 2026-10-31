// Fundos dos destaques no Temporal (pedido do dono do app em 2026-10-30): os raios da imagem
// que ele mandou (`raios-azuis-referencia.jpg`), tingidos de dourado bem apagado, como marca d'água, e escurecidos embaixo (atrás do apelido e
// das estatísticas). Um fundo só para todos os destaques, sem o ícone do prêmio (aprovado pelo
// dono do app em 2026-10-30).
// Uso: node destaques-temporal.cjs <pasta de saída> <raiz do projeto>
const path = require("path");
const root = process.argv[3];
const sharp = require(path.resolve(root, "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
const shade = `<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#01030a" stop-opacity=".2"/><stop offset=".45" stop-color="#01030a" stop-opacity=".05"/><stop offset=".78" stop-color="#01030a" stop-opacity=".7"/><stop offset="1" stop-color="#01030a" stop-opacity=".95"/></linearGradient>`;
const layer = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${shade}</defs>
  <rect width="100%" height="100%" fill="url(#v)"/>
</svg>`;
(async () => {
  // Duotone: cada pixel em cinza vira um tom da rampa dourada (sombra → luz).
  // Rampa apagada: os raios ficam como marca d'água (pedido do dono do app em 2026-10-30).
  const RAMP = [[3, 2, 1], [16, 12, 4], [52, 38, 11], [96, 72, 24], [132, 102, 40]];
  const { data, info } = await sharp(path.join(__dirname, "raios-azuis-referencia.jpg"))
    .resize(W, H, { fit: "cover" }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const toned = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const t = Math.min(1, (data[i * info.channels] / 255) * 1.6) * (RAMP.length - 1);
    const a = RAMP[Math.floor(t)], b = RAMP[Math.min(RAMP.length - 1, Math.floor(t) + 1)], f = t - Math.floor(t);
    for (let c = 0; c < 3; c++) toned[i * 3 + c] = Math.round(a[c] + (b[c] - a[c]) * f);
  }
  const base = await sharp(toned, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
  await sharp(base).composite([{ input: Buffer.from(layer) }]).webp({ quality: 86 }).toFile(`${OUT}/premio-destaque-temporal.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
