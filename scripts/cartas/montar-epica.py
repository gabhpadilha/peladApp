"""Monta as camadas do app de uma carta épica a partir das peças do Gemini (fundo + borda), sem mexer nas originais.

Uso: python3 scripts/cartas/montar-epica.py <chave> [<chave> ...]

Lê docs/cartas/<chave>/pecas/{fundo,borda}.* e grava em public/cartas/fundos/:
  premium-<chave>.webp       o fundo da carta (700 x 1004), a caixa da carta menos 12 px da célula (`artInset` 1,43% e 1,02%),
                              como o `montar-carta.cjs` faz com `artInset` 12.
  premium-<chave>-vaza.webp  a borda na célula 1000 x 1400 com a caixa da carta em 80,112 a 920,1288 (84% do meio), por cima do conteúdo.

Mesma ideia do recorte da Tormenta (`prototipos/tormenta-borda.cjs`), em versão genérica:
  SÓLIDO (opaco, cor original): a faixa da moldura (caixa da carta menos o miolo) e o enfeite do topo, que pode passar da borda.
          O miolo é o preto ligado ao centro, preenchido linha a linha, então o brilho do neon que entra nele não vira mancha.
  LUZ (o resto: neon, raios, faíscas que caem por dentro ou por fora): alfa pelo brilho, com a cor desmultiplicada (cor / alfa),
          que soma luz sobre o conteúdo sem deixar borda escura.
A borda fica sempre por cima do conteúdo (decisão do dono do app): o que ela cobrir, cobre.
"""
import glob
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOCS = os.path.join(RAIZ, "docs", "cartas")
SAIDA = os.path.join(RAIZ, "public", "cartas", "fundos")
CELL = (1000, 1400)
BOX = (80, 112, 920, 1288)  # caixa da carta na célula (84% do meio)
ART_INSET = 12  # px da célula, o mesmo do montar-carta.cjs


def achar(pasta, nome):
    fs = sorted(glob.glob(os.path.join(pasta, nome + ".*")))
    return fs[0] if fs else None


def piso(lum):
    m = np.concatenate([lum[:20].ravel(), lum[-20:].ravel(), lum[:, :20].ravel(), lum[:, -20:].ravel()])
    return float(np.median(m))


def caixa(lum, limiar, cheio=0.5):
    """Primeira e última coluna/linha com mais da metade dos pixels acesos (ignora brilho solto e a marca d'água)."""
    aceso = lum > limiar
    h, w = lum.shape
    cols = np.where(aceso.sum(axis=0) > cheio * h)[0]
    rows = np.where(aceso.sum(axis=1) > cheio * w)[0]
    return int(cols.min()), int(rows.min()), int(cols.max()) + 1, int(rows.max()) + 1


def inundar(escuro, semente):
    h, w = escuro.shape
    vis = np.zeros_like(escuro)
    y0, x0 = semente
    if not escuro[y0, x0]:
        return vis
    vis[y0, x0] = True
    fila = deque([semente])
    while fila:
        y, x = fila.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and escuro[ny, nx] and not vis[ny, nx]:
                vis[ny, nx] = True
                fila.append((ny, nx))
    return vis


def preencher(mascara):
    """Miolo cheio: em cada linha, do primeiro ao último pixel do miolo; o mesmo nas colunas; fica a interseção."""
    h, w = mascara.shape
    lin = np.zeros_like(mascara)
    col = np.zeros_like(mascara)
    for y in range(h):
        xs = np.where(mascara[y])[0]
        if len(xs) > 10:
            lin[y, xs.min():xs.max() + 1] = True
    for x in range(w):
        ys = np.where(mascara[:, x])[0]
        if len(ys) > 10:
            col[ys.min():ys.max() + 1, x] = True
    return lin & col


def montar(chave):
    pasta = os.path.join(DOCS, chave, "pecas")
    borda_img = Image.open(achar(pasta, "borda")).convert("RGB")
    fundo_img = Image.open(achar(pasta, "fundo")).convert("RGB")
    borda = np.asarray(borda_img).astype(np.float32)
    h, w, _ = borda.shape
    lum = borda.max(axis=2)
    mn = borda.min(axis=2)
    sat = np.where(lum > 0, (lum - mn) / np.maximum(lum, 1), 0)
    pb = piso(lum)
    bx0, by0, bx1, by1 = caixa(lum, pb + 30)

    # ---- fundo: a caixa da carta na imagem do fundo, menos o artInset, esticada para 700 x 1004
    lf = np.asarray(fundo_img).max(axis=2).astype(np.float32)
    fx0, fy0, fx1, fy1 = caixa(lf, 8, cheio=0.3)  # o fundo tem regiões escuras: limiar baixo, só o preto puro de fora fica de fora
    fsx, fsy = (BOX[2] - BOX[0]) / (fx1 - fx0), (BOX[3] - BOX[1]) / (fy1 - fy0)
    recorte = (fx0 + ART_INSET / fsx, fy0 + ART_INSET / fsy, fx1 - ART_INSET / fsx, fy1 - ART_INSET / fsy)
    fundo_img.crop(tuple(round(v) for v in recorte)).resize((700, 1004), Image.LANCZOS).save(
        os.path.join(SAIDA, f"premium-{chave}.webp"), quality=88, method=6)

    # ---- borda
    miolo = preencher(inundar(lum <= pb + 14, (h // 2, w // 2)))
    caixa_m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(caixa_m).rounded_rectangle((bx0, by0, bx1 - 1, by1 - 1), radius=round((bx1 - bx0) * 0.075), fill=255)
    dentro = np.asarray(caixa_m) > 0
    # só o que é matéria (aceso e pouco saturado: metal, pedra, vidro; o brilho do neon é saturado) fica opaco: os bolsões de preto puro entre o neon e o metal (quando o neon ondula para dentro) ficam vazados
    materia = Image.fromarray((((lum > pb + 24) & (sat < 0.6)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 90 else 0)
    faixa = dentro & ~miolo & (np.asarray(materia) > 0)
    # enfeite do topo (e o que mais for matéria por fora da caixa): pixels acesos de pouca saturação, perto do topo, fechados
    topo = np.zeros((h, w), bool)
    topo[: by0 + round((by1 - by0) * 0.12), :] = True
    enfeite = topo & ~dentro & (lum > pb + 30) & (sat < 0.55)
    enfeite_img = Image.fromarray((enfeite * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5)).point(lambda v: 255 if v > 110 else 0)
    enfeite = np.asarray(enfeite_img) > 0
    solido = Image.fromarray(((faixa | enfeite) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
    s = np.asarray(solido).astype(np.float32) / 255

    yy, xx = np.mgrid[0:h, 0:w]
    def rampa(d):
        t = np.clip(d / 24.0, 0, 1)
        return t * t * (3 - 2 * t)
    beira = rampa(xx) * rampa(w - 1 - xx) * rampa(yy) * rampa(h - 1 - yy)  # o que o Gemini corta na beira da imagem esmaece
    s = s * beira
    a_luz = np.clip((lum - pb - 4) / 186.0, 0, 1) * beira
    alfa = s + (1 - s) * a_luz
    cor_luz = np.where(a_luz[..., None] > 0, np.minimum(255, borda / np.maximum(a_luz, 1e-3)[..., None]), 0)
    # pré-multiplicada: sólido (cor original) por cima da luz
    pre = s[..., None] * borda + (1 - s)[..., None] * a_luz[..., None] * cor_luz
    # alfa direto (cor = pré-multiplicada / alfa); o resize do Pillow em RGBA já pondera pelo alfa, sem franja escura
    cor = np.where(alfa[..., None] > 0.003, np.minimum(255, pre / np.maximum(alfa, 1e-3)[..., None]), 0)
    rgba = np.dstack([cor, alfa * 255]).clip(0, 255).round().astype(np.uint8)

    sx, sy = (BOX[2] - BOX[0]) / (bx1 - bx0), (BOX[3] - BOX[1]) / (by1 - by0)
    tw, th = round(w * sx), round(h * sy)
    peca = Image.fromarray(rgba, "RGBA").resize((tw, th), Image.LANCZOS)
    left, top = round(BOX[0] - bx0 * sx), round(BOX[1] - by0 * sy)
    celula = peca.crop((-left, -top, CELL[0] - left, CELL[1] - top))
    celula.save(os.path.join(SAIDA, f"premium-{chave}-vaza.webp"), quality=90, method=6)
    print(f"{chave}: borda {bx0},{by0}-{bx1},{by1}  fundo {fx0},{fy0}-{fx1},{fy1}  escala {sx:.3f}/{sy:.3f}")


if __name__ == "__main__":
    for k in sys.argv[1:]:
        montar(k)
