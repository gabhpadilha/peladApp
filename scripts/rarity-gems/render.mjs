// Gera os ícones de raridade (gemas 3D) com three.js num Chromium sem tela e grava public/rarity/<raridade>.webp.
// Rode à mão quando mudar o desenho: node scripts/rarity-gems/render.mjs (precisa de `three` e do Playwright).
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = process.cwd();
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };

const server = createServer(async (req, res) => {
  try {
    const file = path.join(root, req.url === "/" ? "/scripts/rarity-gems/gems.html" : decodeURIComponent(req.url.split("?")[0]));
    res.setHeader("content-type", types[path.extname(file)] ?? "application/octet-stream");
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end();
  }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
page.on("console", (message) => console.log("[page]", message.text()));
page.on("pageerror", (error) => console.error("[erro]", error.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const images = await page.evaluate(() => window.renderAll());
for (const [kind, { color, mask, flare }] of Object.entries(images)) {
  const colorPng = Buffer.from(color.split(",")[1], "base64");
  const maskPng = Buffer.from(mask.split(",")[1], "base64");
  // O desenho sai sobre um fundo escuro (a transmissão da gema precisa de fundo); a silhueta branca vira o canal alfa.
  const raw = async (dataUrl) => (await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).removeAlpha().raw().toBuffer());
  const bodyRgb = await raw(color);
  const maskRgb = await raw(mask);
  const flareRgb = await raw(flare);
  const out = Buffer.alloc(512 * 512 * 4);
  for (let i = 0; i < 512 * 512; i++) {
    // Corpo (alfa = silhueta) com o brilho somado por cima (luz aditiva): o alfa final é o maior dos dois.
    const bodyA = maskRgb[i * 3] / 255;
    const fr = flareRgb[i * 3], fg = flareRgb[i * 3 + 1], fb = flareRgb[i * 3 + 2];
    const flareA = Math.max(fr, fg, fb) / 255;
    const pr = bodyRgb[i * 3] * bodyA + fr, pg = bodyRgb[i * 3 + 1] * bodyA + fg, pb = bodyRgb[i * 3 + 2] * bodyA + fb;
    const alpha = Math.min(1, Math.max(bodyA, flareA));
    const k = alpha > 0 ? 1 / alpha : 0;
    out[i * 4] = Math.min(255, pr * k);
    out[i * 4 + 1] = Math.min(255, pg * k);
    out[i * 4 + 2] = Math.min(255, pb * k);
    out[i * 4 + 3] = alpha * 255;
  }
  const rgba = await sharp(out, { raw: { width: 512, height: 512, channels: 4 } }).png().toBuffer();
  const webp = await sharp(rgba).trim({ threshold: 4 }).resize({ width: 256, height: 256, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  await writeFile(path.join(root, "public/rarity", `${kind}.webp`), webp);
  await writeFile(path.join("/tmp/claude-0", `gem-${kind}.png`), rgba);
  console.log(kind, webp.length, "bytes");
}
await browser.close();
server.close();
