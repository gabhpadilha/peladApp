// Gera os cristais de raridade (um formato, quatro cores) com three.js num Chromium sem tela e grava public/rarity/<raridade>.webp.
// O cristal é traçado por raio no shader (refração, reflexão interna, absorção e dispersão); o brilho e os raios entram por cima.
// Rode à mão quando mudar o desenho: node scripts/rarity-gems/render.mjs (precisa de `three` e do Playwright).
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import sharp from "sharp";

const W = 960, H = 1536;
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
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on("console", (message) => console.log("[page]", message.text()));
page.on("pageerror", (error) => console.error("[erro]", error.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
const images = await page.evaluate(() => window.renderAll());

const raw = async (dataUrl, channels) => sharp(Buffer.from(dataUrl.split(",")[1], "base64")).ensureAlpha().raw().toBuffer();
for (const [kind, { body, flare }] of Object.entries(images)) {
  const bodyRaw = await raw(body);
  const flareRaw = await raw(flare);
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    // Corpo (alfa = onde o raio acerta o cristal) com o brilho somado por cima (luz aditiva): o alfa final é o maior dos dois.
    const bodyA = bodyRaw[i * 4 + 3] / 255;
    const fr = flareRaw[i * 4], fg = flareRaw[i * 4 + 1], fb = flareRaw[i * 4 + 2];
    const flareA = Math.max(fr, fg, fb) / 255;
    const pr = bodyRaw[i * 4] * bodyA + fr, pg = bodyRaw[i * 4 + 1] * bodyA + fg, pb = bodyRaw[i * 4 + 2] * bodyA + fb;
    const alpha = Math.min(1, Math.max(bodyA, flareA));
    const k = alpha > 0 ? 1 / alpha : 0;
    out[i * 4] = Math.min(255, pr * k);
    out[i * 4 + 1] = Math.min(255, pg * k);
    out[i * 4 + 2] = Math.min(255, pb * k);
    out[i * 4 + 3] = alpha * 255;
  }
  const rgba = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  const webp = await sharp(rgba).trim({ threshold: 6 }).resize({ height: 300, fit: "inside", kernel: "lanczos3" }).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  await writeFile(path.join(root, "public/rarity", `${kind}.webp`), webp);
  await writeFile(path.join("/tmp/claude-0", `gem-${kind}.png`), rgba);
  console.log(kind, webp.length, "bytes");
}
await browser.close();
server.close();
