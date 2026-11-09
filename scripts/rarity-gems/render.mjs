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
const page = await browser.newPage({ viewport: { width: 384, height: 384 } });
page.on("console", (message) => console.log("[page]", message.text()));
page.on("pageerror", (error) => console.error("[erro]", error.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
const images = await page.evaluate(() => window.renderAll());
for (const [kind, dataUrl] of Object.entries(images)) {
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  const webp = await sharp(png).trim({ threshold: 1 }).resize({ width: 160, height: 160, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  await writeFile(path.join(root, "public/rarity", `${kind}.webp`), webp);
  await writeFile(path.join("/tmp/claude-0", `gem-${kind}.png`), png);
  console.log(kind, webp.length, "bytes");
}
await browser.close();
server.close();
