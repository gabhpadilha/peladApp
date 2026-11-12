"""Prévia 2D de uma carta a partir das peças do Gemini (fundo + borda), sem tocar nas originais.

Uso: python3 scripts/cartas/previa-pecas.py <chave> [<chave> ...]

Lê docs/cartas/<chave>/pecas/fundo.* e borda.* e grava docs/cartas/<chave>/montada/<chave>-2d.webp.
- A caixa da carta é medida na borda (pixels acima do piso do preto).
- O fundo é recortado na caixa dele e esticado até a caixa da borda.
- A borda é opaca dentro da carta (menos o miolo preto, achado por inundação a partir do centro)
  e, por fora, só luz: alfa pelo brilho, descontando o piso do preto (15 a 26 nas artes do Gemini).
Imprime um relatório com o que veio fora do gabarito.
"""
import glob
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOCS = os.path.join(RAIZ, "docs", "cartas")


def achar(pasta, nome):
    fs = sorted(glob.glob(os.path.join(pasta, nome + ".*")))
    return fs[0] if fs else None


def piso(lum):
    """Piso do preto: mediana das margens da imagem."""
    m = np.concatenate([lum[:20].ravel(), lum[-20:].ravel(), lum[:, :20].ravel(), lum[:, -20:].ravel()])
    return float(np.median(m))


def caixa(lum, limiar, cheio=0.5):
    """Caixa da carta: primeira e última coluna/linha com mais da metade dos pixels acesos
    (ignora brilho solto, faíscas e a marca d'água do Gemini no canto)."""
    aceso = lum > limiar
    h, w = lum.shape
    cols = np.where(aceso.sum(axis=0) > cheio * h)[0]
    rows = np.where(aceso.sum(axis=1) > cheio * w)[0]
    return cols.min(), rows.min(), cols.max() + 1, rows.max() + 1


def miolo(lum, limiar):
    """Inundação dos pixels escuros ligados ao centro."""
    h, w = lum.shape
    escuro = lum <= limiar
    vis = np.zeros_like(escuro)
    fila = deque([(h // 2, w // 2)])
    if not escuro[h // 2, w // 2]:
        return vis
    vis[h // 2, w // 2] = True
    while fila:
        y, x = fila.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and escuro[ny, nx] and not vis[ny, nx]:
                vis[ny, nx] = True
                fila.append((ny, nx))
    return vis


def montar(chave):
    pasta = os.path.join(DOCS, chave, "pecas")
    f_fundo, f_borda = achar(pasta, "fundo"), achar(pasta, "borda")
    borda = np.asarray(Image.open(f_borda).convert("RGB")).astype(np.float32)
    fundo_img = Image.open(f_fundo).convert("RGB")
    fundo = np.asarray(fundo_img).astype(np.float32)
    h, w, _ = borda.shape
    lb = borda.max(axis=2)
    lf = fundo.max(axis=2)
    pb, pf = piso(lb), piso(lf)
    avisos = []

    bx0, by0, bx1, by1 = caixa(lb, pb + 30)
    fx0, fy0, fx1, fy1 = caixa(lf, pf + 30)
    larg = (bx1 - bx0) / w
    prop = (bx1 - bx0) / (by1 - by0)
    if not 0.62 <= larg <= 0.80:
        avisos.append(f"borda ocupa {larg:.0%} da largura (gabarito: 70%)")
    if abs(prop - 5 / 7) > 0.04:
        avisos.append(f"borda com proporção {prop:.2f} (5:7 = 0,71)")
    if abs((bx0 + bx1) / 2 - w / 2) > w * 0.02 or abs((by0 + by1) / 2 - h / 2) > h * 0.02:
        avisos.append("borda fora do centro da imagem")
    for nome, x0, y0, x1, y1 in (("borda", bx0, by0, bx1, by1), ("fundo", fx0, fy0, fx1, fy1)):
        if x0 <= 3 or x1 >= w - 3 or y0 <= 3 or y1 >= h - 3:
            avisos.append(f"{nome} encosta na beira da imagem (algo saindo pela lateral)")
    if abs((fx1 - fx0) - (bx1 - bx0)) > w * 0.04 or abs(fx0 - bx0) > w * 0.04:
        avisos.append(f"fundo e borda com a carta em lugares diferentes (fundo x {fx0}-{fx1}, borda x {bx0}-{bx1})")
    if pb > 30 or pf > 30:
        avisos.append(f"preto em volta não é puro (piso borda {pb:.0f}, fundo {pf:.0f})")

    mio = miolo(lb, pb + 14)
    area = mio.sum() / ((bx1 - bx0) * (by1 - by0))
    if area < 0.30:
        avisos.append(f"miolo preto pequeno ou não preto ({area:.0%} da carta)")
    else:
        if np.median(lb[mio]) > pb + 6:
            avisos.append("miolo da borda não é preto puro")

    # Fundo: caixa dele esticada até a caixa da borda, cantos arredondados.
    bw, bh = bx1 - bx0, by1 - by0
    fundo_c = fundo_img.crop((fx0, fy0, fx1, fy1)).resize((bw, bh), Image.LANCZOS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = Image.new("L", (bw, bh), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, bw - 1, bh - 1), radius=round(bw * 0.075), fill=255)
    out.paste(fundo_c.convert("RGBA"), (bx0, by0), mask)

    # Borda: opaca dentro da carta (fora do miolo), só luz por fora.
    luz = np.clip((lb - pb - 4) / 110.0, 0, 1)
    dentro_img = Image.new("L", (w, h), 0)
    ImageDraw.Draw(dentro_img).rounded_rectangle((bx0, by0, bx1 - 1, by1 - 1), radius=round(bw * 0.075), fill=255)
    dentro = np.asarray(dentro_img) > 0
    # dentro da carta: metal opaco; o preto solto que a inundação não pegou (entre faíscas) mostra o fundo
    alfa = np.where(dentro & ~mio, np.clip((lb - pb - 8) / 40.0, 0, 1), luz)
    # suaviza a passagem do miolo para a moldura
    alfa_img = Image.fromarray((alfa * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    alfa = np.asarray(alfa_img).astype(np.float32) / 255
    alfa = np.where(mio, np.minimum(alfa, luz), alfa)
    cor = borda
    camada = np.dstack([cor, alfa * 255]).astype(np.uint8)
    out.alpha_composite(Image.fromarray(camada, "RGBA"))

    m = round(w * 0.06)
    out = out.crop((max(bx0 - m, 0), max(by0 - m, 0), min(bx1 + m, w), min(by1 + m, h)))
    fundo_preto = Image.new("RGBA", out.size, (11, 19, 15, 255))
    fundo_preto.alpha_composite(out)
    dest = os.path.join(DOCS, chave, "montada")
    os.makedirs(dest, exist_ok=True)
    final = fundo_preto.convert("RGB")
    final.thumbnail((560, 760))
    final.save(os.path.join(dest, f"{chave}-2d.webp"), quality=88, method=6)
    print(f"{chave}: caixa {bx0},{by0}-{bx1},{by1} ({larg:.0%}, {prop:.2f}), piso {pb:.0f}/{pf:.0f}")
    for a in avisos:
        print(f"  - {a}")


if __name__ == "__main__":
    for k in sys.argv[1:]:
        montar(k)
