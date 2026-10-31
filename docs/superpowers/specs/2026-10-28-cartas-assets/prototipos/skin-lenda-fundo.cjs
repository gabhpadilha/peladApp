// Fundo da skin Lenda do Trovão (2026-10-31): o miolo da arte "tempestade" do dono do app
// (`lenda-fundo-dono.jpg`, 765 × 1024), recortado exatamente na janela da carta, dentro do fio
// dourado da moldura dela (a moldura da skin vem do concept, `skin-lenda-arte.cjs`).
// Uso: node skin-lenda-fundo.cjs <pasta de saída> <raiz do repo>
const path = require("path");
const sharp = require(path.resolve(process.argv[3], "node_modules/sharp"));
const OUT = process.argv[2];
const SRC = path.join(__dirname, "lenda-fundo-dono.jpg");

// Centro do fio dourado de dentro (medido) = borda da carta.
const CARD = { left: 68, top: 81, width: 629, height: 852.5 };
// Janela da carta de neon: 1,7% da largura e 1,21% da altura para dentro.
const WIN = { left: CARD.left + CARD.width * 0.017, top: CARD.top + CARD.height * 0.0121, width: CARD.width * 0.966, height: CARD.height * 0.9758 };

(async () => {
  await sharp(SRC)
    .extract({ left: Math.round(WIN.left), top: Math.round(WIN.top), width: Math.round(WIN.width), height: Math.round(WIN.height) })
    .resize(600, 860, { fit: "fill" })
    .webp({ quality: 92 })
    .toFile(`${OUT}/skin-lenda.webp`);

  console.log("ok");
})().catch((e) => { console.error(e); process.exit(1); });
