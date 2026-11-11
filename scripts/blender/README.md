# Renders 3D (Blender) do Cancha Club

Animações e artes **pré-renderizadas** no Blender (módulo Python `bpy`, Cycles em CPU, denoise OpenImageDenoise). O app só toca o
vídeo ou mostra a imagem pronta; nada de 3D em tempo real no celular. Decisão do dono do app em 2026-11-10: aos poucos, as
animações e as artes de carta migram para renders do Blender (as artes entram pelo Gemini e viram textura/relevo de peças 3D).

## Como rodar
```bash
python3 -m venv bv && . bv/bin/activate && pip install bpy      # Blender 5.x como módulo (Python 3.13)
python cortina.py -- frames=62-160 rx=540 ry=960 samples=24 out=/tmp/saida
python revelacao-melhor-jogador.py -- frames=1-90 rx=540 ry=960 samples=20 out=/tmp/saida
ffmpeg -framerate 30 -i /tmp/saida/f_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 video.mp4
```
Argumentos: `frames` (lista `1,5,9` ou faixa `a-b`), `rx`/`ry` (resolução), `samples`, `out`. Teste rápido: `rx=270 ry=480 samples=10`.

## Os scripts
- `cortina.py`: cortina de veludo (simulação de tecido, dobras, varal dourado, holofotes); os quadros 62 a 160 são a abertura. Os quadros 1 a 61
  só assentam a simulação e não se renderizam.
- `revelacao-melhor-jogador.py`: pedestal de mármore com aro dourado, piso molhado, holofote que acende com falha, névoa, poeira e fagulhas.
  A carta (foto + skin de cada jogador) entra por cima do vídeo, ao vivo, no clarão do quadro ~62.
- `quadra-toro.py`: quadra de futsal molhada (tema Toró) para o fundo do quadro tático, imagem única 800x1480 (`public/mesa/temporal.webp`); as cartas entram por cima pela grade do app.
- `tunel-rascunho.py`: rascunho do túnel do estádio, descartado pelo dono do app.

## Custos de renderização (4 núcleos, sem GPU)
Cortina 540x960: ~55 s/quadro (99 quadros). Revelação: ~45 s/quadro (90 quadros). Rodar uma de cada vez.

## Para o app
Comprimir (mp4 H.264 ou WebM), guardar uma imagem de capa, carregar só quando a tela precisar e não pôr em `/public` sem cache.
