"""Recorta as peças flutuantes de uma lendária a partir de uma folha do Gemini (peças soltas sobre preto puro).

Uso: python3 scripts/cartas/recortar-flutuantes.py <folha> <prefixo> <modo> [area_minima]
  modo  solido = peça opaca (miolo fechado) mais a luz em volta (pérola, concha, pedra)
        vidro  = opaca onde é clara e o resto só luz (gota, água)
        luz    = só luz, com a cor desmultiplicada (fumaça, anel de água)
Grava em public/cartas/fundos/<prefixo>-<n>.webp, uma por peça, da esquerda para a direita e de cima para baixo.
Mesmo método de `prototipos/embuste-pecas.cjs`: alfa da luz pelo brilho e cor ÷ alfa, sem borda escura.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SAIDA = os.path.join(RAIZ, "public", "cartas", "fundos")


def componentes(mascara, area_minima):
    h, w = mascara.shape
    vis = np.zeros_like(mascara)
    caixas = []
    for y0 in range(h):
        for x0 in np.where(mascara[y0] & ~vis[y0])[0]:
            if vis[y0, x0]:
                continue
            fila = deque([(y0, x0)])
            vis[y0, x0] = True
            xs, ys, n = [x0, x0], [y0, y0], 0
            while fila:
                y, x = fila.popleft()
                n += 1
                xs[0], xs[1] = min(xs[0], x), max(xs[1], x)
                ys[0], ys[1] = min(ys[0], y), max(ys[1], y)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mascara[ny, nx] and not vis[ny, nx]:
                        vis[ny, nx] = True
                        fila.append((ny, nx))
            if n >= area_minima:
                caixas.append((xs[0], ys[0], xs[1] + 1, ys[1] + 1))
    return caixas


def preencher_buracos(m):
    """Fecha o miolo: o que não é alcançado pelo preto da borda da imagem vira peça."""
    h, w = m.shape
    fora = np.zeros_like(m)
    fila = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not m[y, x]:
                fora[y, x] = True
                fila.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not m[y, x] and not fora[y, x]:
                fora[y, x] = True
                fila.append((y, x))
    while fila:
        y, x = fila.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not m[ny, nx] and not fora[ny, nx]:
                fora[ny, nx] = True
                fila.append((ny, nx))
    return ~fora


def recortar(folha, prefixo, modo, area_minima=1500):
    img = np.asarray(Image.open(folha).convert("RGB")).astype(np.float32)
    lum = img.max(axis=2)
    borda = np.concatenate([lum[:15].ravel(), lum[-15:].ravel(), lum[:, :15].ravel(), lum[:, -15:].ravel()])
    piso = float(np.median(borda))
    acesa = Image.fromarray(((lum > piso + 28) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
    caixas = componentes(np.asarray(acesa) > 0, area_minima)
    caixas.sort(key=lambda c: (round(c[1] / 120), c[0]))
    for n, (x0, y0, x1, y1) in enumerate(caixas, 1):
        m = 14
        x0, y0, x1, y1 = max(0, x0 - m), max(0, y0 - m), min(img.shape[1], x1 + m), min(img.shape[0], y1 + m)
        peca, lp = img[y0:y1, x0:x1], lum[y0:y1, x0:x1]
        a_luz = np.clip((lp - piso - 4) / 170.0, 0, 1)
        if modo == "luz":
            s = np.zeros_like(lp)
        else:
            limiar = piso + (30 if modo == "solido" else 90)
            base = Image.fromarray(((lp > limiar) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 100 else 0)
            cheio = preencher_buracos(np.asarray(base) > 0) if modo == "solido" else np.asarray(base) > 0
            s = np.asarray(Image.fromarray((cheio * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
        alfa = s + (1 - s) * a_luz
        cor_luz = np.where(a_luz[..., None] > 0, np.minimum(255, peca / np.maximum(a_luz, 1e-3)[..., None]), 0)
        pre = s[..., None] * peca + (1 - s)[..., None] * a_luz[..., None] * cor_luz
        cor = np.where(alfa[..., None] > 0.003, np.minimum(255, pre / np.maximum(alfa, 1e-3)[..., None]), 0)
        rgba = np.dstack([cor, alfa * 255]).clip(0, 255).round().astype(np.uint8)
        destino = os.path.join(SAIDA, f"{prefixo}-{n}.webp")
        Image.fromarray(rgba, "RGBA").save(destino, quality=88, method=6)
        print(f"{destino}: {x0},{y0}-{x1},{y1}")


if __name__ == "__main__":
    recortar(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 1500)
