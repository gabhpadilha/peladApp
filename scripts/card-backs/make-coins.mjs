// Recorta a moeda dourada com a logo (arte do Gemini, que o dono do app aprovou) e gera as quatro cores do verso das cartas:
// comum (aço), rara (prata azulada), épica (ouro-champanhe com reflexo violeta) e lendária (ouro). Só a moeda vem da imagem:
// o resto do verso (moldura e linhas de quadra) é desenhado em código, na proporção exata de uma quadra de futsal.
// Uso: node scripts/card-backs/make-coins.mjs <imagem-do-gemini.jpg>
import path from 'node:path';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('Passe o caminho da imagem do Gemini.');
const out = path.join(process.cwd(), 'public/cartas/versos');

// Centro e raio da moeda na imagem de 1728 x 2432 (medidos na mão); a folga de 6 px leva a sombra suave em volta.
const CENTER = { x: 863, y: 1216 };
const RADIUS = 224;

const VARIANTS = {
  comum: { saturation: 0.05, brightness: 0.8, hue: 0 },
  rara: { saturation: 0.35, brightness: 0.95, hue: 175 },
  epica: { saturation: 0.7, brightness: 1.0, hue: 235 },
  lendaria: { saturation: 1, brightness: 1, hue: 0 },
};

{
  const size = RADIUS * 2 + 12;
  const left = CENTER.x - RADIUS - 6;
  const top = CENTER.y - RADIUS - 6;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g"><stop offset="0.965" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${RADIUS + 3}" fill="url(#g)"/></svg>`,
  );
  const crop = await sharp(source).extract({ left, top, width: size, height: size }).toBuffer();
  for (const [name, v] of Object.entries(VARIANTS)) {
    const tinted = await sharp(crop).modulate({ saturation: v.saturation, brightness: v.brightness, hue: v.hue }).removeAlpha().raw().toBuffer();
    const alpha = await sharp(mask).removeAlpha().greyscale().raw().toBuffer();
    const pixels = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      pixels[i * 4] = tinted[i * 3];
      pixels[i * 4 + 1] = tinted[i * 3 + 1];
      pixels[i * 4 + 2] = tinted[i * 3 + 2];
      pixels[i * 4 + 3] = alpha[i];
    }
    const rgba = await sharp(pixels, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
    const webp = await sharp(rgba).resize({ width: 420 }).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
    await sharp(webp).toFile(path.join(out, `moeda-${name}.webp`));
    console.log(name, webp.length, 'bytes');
  }
}
