// Ícone e Rubi viram Épicas (2026-11-09): cada uma ganha um render 3D (arte do dono no Gemini, objeto sobre preto) que passa por
// cima da moldura pela direita, como o aglomerado da Safira. Estende a camada `-fino-vaza` (1000 x 1400) em 20% para a direita
// (`overflowWidth` 1.2 na roupa) e põe o render nela. Roda uma vez sobre a camada original (se ela já estiver larga, restaure do git).
// Uso: node render-vaza.cjs <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[2], "node_modules/sharp"));
const DIR = path.join(process.argv[2], "public/cartas/fundos");
const CW = 1000, CH = 1400, OUT_W = 1210;
const SPEC = { icone: { src: "render-icone-dono.jpg", x: 690, y: 200, w: 520 }, rubi: { src: "render-rubi-dono.jpg", x: 690, y: 200, w: 520 } };

async function cut(file, w) {
  const { data, info } = await sharp(path.join(__dirname, file)).resize({ width: w, kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const mx = Buffer.alloc(n);
  for (let i = 0; i < n; i++) mx[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  // corpo: brilho acima do piso do preto, com os buracos escuros entre as peças fechados (dilata, depois erode)
  const R = { raw: { width: info.width, height: info.height, channels: 1 } };
  const step = (buf, fn) => fn(sharp(buf, R)).raw().toBuffer();
  const th = await step(mx, (i) => i.threshold(34).toColourspace("b-w"));
  const grown = await step(th, (i) => i.blur(5).threshold(60).toColourspace("b-w"));
  // o sharp aplica `negate` uma vez só por cadeia: o fundo vira o objeto num passo, cresce, e volta em outro
  const bgGrown = await step(await step(grown, (i) => i.negate().toColourspace("b-w")), (i) => i.blur(5).threshold(60).toColourspace("b-w"));
  const closed = await step(bgGrown, (i) => i.negate().toColourspace("b-w"));
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const ramp = Math.min(1, Math.max(0, (mx[i] - 12) / 58));
    const a = Math.max(ramp, closed[i] / 255);
    out[i * 4 + 3] = Math.round(a * 255);
    // onde só o brilho decide (halo, fagulhas), a cor sai sem o preto misturado
    const k = closed[i] > 128 || ramp >= 1 ? 1 : 1 / Math.max(a, 0.05);
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, Math.round(data[i * 3 + c] * k));
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

(async () => {
  for (const [gem, s] of Object.entries(SPEC)) {
    const file = path.join(DIR, `premium-${gem}-fino-vaza.webp`);
    const meta = await sharp(file).metadata();
    if (meta.width !== CW) throw new Error(`${file} já está larga (${meta.width}); restaure do git antes`);
    const base = await sharp(file).extend({ right: OUT_W - CW, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const piece = await cut(s.src, s.w);
    await sharp(base).composite([{ input: piece, left: s.x, top: s.y }]).webp({ quality: 92, alphaQuality: 100 }).toFile(file);
    console.log(gem, "ok");
  }
})();
