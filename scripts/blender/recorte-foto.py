"""Recorta o fundo de uma foto (MODNet do app, `models/modnet-portrait-q.onnx`) e enquadra no "modelo C" das cartas.

    python recorte-foto.py foto.jpg saida.png      (precisa de onnxruntime, numpy e pillow)
Sai um PNG 640 x 542 com fundo transparente, para o `carta-3d.py -- foto=saida.png`. Não versione fotos de jogadores.
"""
import os, sys, numpy as np, onnxruntime as ort
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB'); W, H = im.size
sc = 1024 / max(W, H); iw, ih = int(round(W*sc/32))*32, int(round(H*sc/32))*32
x = np.asarray(im.resize((iw, ih), Image.BILINEAR), np.float32) / 127.5 - 1
s = ort.InferenceSession(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'models', 'modnet-portrait-q.onnx'))
m = s.run(None, {s.get_inputs()[0].name: x.transpose(2,0,1)[None]})[0][0,0]
a = Image.fromarray((np.clip(m,0,1)*255).astype(np.uint8)).resize((W,H), Image.BILINEAR)
a = a.filter(ImageFilter.MinFilter(5))                      # encolhe a borda (~como o app)
A = np.asarray(a, np.float32)/255; A = np.clip((A-0.45)/(0.80-0.45), 0, 1)   # curva 0,45-0,80
mask = A > 0.5; rows = np.where(mask.any(1))[0]; top = rows[0]
# cabeça: largura até o ponto mais largo nas primeiras linhas
head_rows = mask[top: top + int(H*0.25)]; widths = head_rows.sum(1); hw = widths.max()
xs = np.where(mask[top + int(np.argmax(widths))])[0]; hc = (xs[0] + xs[-1]) / 2
# ombros: trecho mais largo entre 0,9 e 1,8 cabeça (estimada 1,3 x largura) abaixo do topo
hh = hw * 1.3; band = mask[int(top + 0.9*hh): int(top + 1.8*hh)]
sh = np.clip(band.sum(1).max(), 2.4*hw, 3.4*hw)
bw = sh * 1.08; bh = bw / 1.18; x0 = hc - bw*0.519; y0 = top - bh*0.145
print('top', top, 'head w', hw, 'center', hc, 'shoulders', sh, 'box', x0, y0, bw, bh)
rgba = np.dstack([np.asarray(im), (A*255).astype(np.uint8)])
big = Image.new('RGBA', (int(bw), int(bh)), (0,0,0,0))
big.alpha_composite(Image.fromarray(rgba, 'RGBA').crop((int(x0), int(y0), int(x0+bw), int(y0+bh))), (0,0)) if True else None
# laterais e pé da foto original somem na máscara (6%)
c = np.array(big); hgt, wid = c.shape[:2]; f = 0.06
ramp_x = np.clip(np.minimum(np.arange(wid)+x0, W-(np.arange(wid)+x0)) / (W*f), 0, 1)
ramp_y = np.clip((H - (np.arange(hgt)+y0)) / (H*f), 0, 1)
c[...,3] = (c[...,3] * ramp_x[None,:] * ramp_y[:,None]).astype(np.uint8)
Image.fromarray(c).resize((640, int(640/1.18))).save(out)
