// Fundo do Time do Mês (pedido do dono do app em 2026-10-29): o cristal lapidado que ele
// mandou (`cristal-referencia.jpg`), tingido de roxo (a coroa virou enfeite no topo da carta em 2026-10-29) e escurecido embaixo, atrás do apelido e das estatísticas.
// Uso: node mes-cristal.cjs <pasta de saída> <raiz do projeto>
const path = require("path");
const root = process.argv[3];
const sharp = require(path.resolve(root, "node_modules/sharp"));
const OUT = process.argv[2];
const W = 600, H = 860;
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14052b" stop-opacity=".35"/><stop offset=".45" stop-color="#14052b" stop-opacity=".1"/><stop offset=".78" stop-color="#0b0318" stop-opacity=".75"/><stop offset="1" stop-color="#0b0318" stop-opacity=".95"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#v)"/>
</svg>`;
(async () => {
  // Duotone: cada pixel do cristal em cinza vira um tom da rampa roxa (sombra → luz).
  const RAMP = [[10, 2, 26], [52, 16, 112], [118, 52, 214], [196, 150, 255], [250, 240, 255]];
  const { data, info } = await sharp(path.join(__dirname, "cristal-referencia.jpg"))
    .resize(W, H, { fit: "cover" }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const t = (data[i * info.channels] / 255) * (RAMP.length - 1);
    const a = RAMP[Math.floor(t)], b = RAMP[Math.min(RAMP.length - 1, Math.floor(t) + 1)], f = t - Math.floor(t);
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(a[c] + (b[c] - a[c]) * f);
  }
  const crystal = await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
  await sharp(crystal).composite([{ input: Buffer.from(overlay) }]).webp({ quality: 88 }).toFile(`${OUT}/premio-time-do-mes.webp`);
  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
