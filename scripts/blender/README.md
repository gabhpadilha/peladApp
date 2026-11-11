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
- `bola-murcha.py`: zoeira da rodada (3 s, 90 quadros): bola de futsal velha, meio vazia e amassada (icosfera com gomos pentagonais
  em cor de vértice, amassado côncavo e rugas), entra quicando sem força, rola, desliza e para murcha sob uma lâmpada fria que
  tremelica; o preenchimento e a contraluz só iluminam a bola (light linking), para o piso sumir no escuro sem horizonte.
  ~16 s/quadro em 720x1280 com 24 amostras. Saída `public/revelacao/bola-murcha.*`; a carta cai por cima no app depois que a bola para.
- `quadra-toro.py`: quadra de futsal molhada (tema Toró) para o fundo do quadro tático, imagem única 800x1480 (`public/mesa/temporal.webp`); as cartas entram por cima pela grade do app.
- `tunel-rascunho.py`: rascunho do túnel do estádio, descartado pelo dono do app.

## Custos de renderização (4 núcleos, sem GPU)
Cortina 540x960: ~55 s/quadro (99 quadros). Revelação: ~45 s/quadro (90 quadros). Rodar uma de cada vez.

## Para o app
Comprimir (mp4 H.264 ou WebM), guardar uma imagem de capa, carregar só quando a tela precisar e não pôr em `/public` sem cache.

## Técnicas aproveitadas do `kevinbadi/blender-skills` (2026-11-11)

O repositório depende do Blender aberto com o addon MCP e da Meshy (paga), então não foi instalado; ficaram as técnicas:

- **Grua (low-to-high):** a câmera começa baixa, olhando de frente, e sobe até a vista final, com *ease-out* cúbico
  (`1 - (1 - t)^3`): o fim desacelera devagar e não trava (usado em `destaques.py`).
- **Câmera com `TRACK_TO`** num alvo (`TRACK_NEGATIVE_Z`, `UP_Y`): só a posição tem keyframes; a rotação sai do alvo.
- **Iluminação de estúdio em 4 pontos** (principal, preenchimento, contraluz e rebote).
- **Luzes de área fora do reflexo:** `visible_camera = False` e `visible_glossy = False` evitam a mancha no piso molhado.
- **HDRI/texturas da PolyHaven (CC0, grátis):** a API não abre pelo proxy da sessão na nuvem; na máquina do dono dá para baixar.

**Final sem travar:** a última pose de cada trecho tem que estar quase parada (câmera desacelerando, luzes estáveis,
faíscas encolhendo até sumir), porque o app para o vídeo no último quadro.

## Renderizar na placa de vídeo (máquina do dono)

Todo script aceita `device=gpu`: `render_device.py` liga o Cycles em OptiX (NVIDIA RTX), CUDA (NVIDIA), HIP (AMD),
oneAPI (Intel) ou Metal (Mac), nessa ordem; sem placa, avisa e segue na CPU. As texturas ficam em `texturas/`.

**No Windows (recomendado; no WSL a GPU só funciona com NVIDIA e o OptiX nem sempre):** instale o Python 3.13
(python.org) e, no PowerShell, dentro da pasta do projeto:

```powershell
py -3.13 -m venv .blender-venv
.blender-venv\Scripts\pip install bpy==5.3.0 pillow numpy
.blender-venv\Scripts\python scripts\blender\destaques.py -- device=gpu rx=720 ry=1280 samples=64 frames=1-150 out=C:\renders\destaques
```

A primeira linha impressa diz a placa usada (`GPU OPTIX NVIDIA GeForce ...`). Os quadros saem em PNG na pasta `out`;
para virar vídeo, com o ffmpeg:

```powershell
ffmpeg -framerate 30 -i C:\renders\destaques\d_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart destaques.mp4
ffmpeg -framerate 30 -i C:\renders\destaques\d_%04d.png -c:v libvpx-vp9 -b:v 0 -crf 34 destaques.webm
```

Na GPU dá para subir as amostras (`samples=64` a `128`) e a resolução (`rx=1080 ry=1920`) sem esperar horas.
`.blender-venv/` não vai para o Git.

| Script | Quadros | Saída (prefixo) |
| --- | --- | --- |
| `cortina.py` | 1-160 | `f_` |
| `destaques.py` | 1-150 (e `slots.json`, posição de cada pedestal na tela) | `d_` |
| `spot2.py` (Melhor Jogador, final suave) | 1-150 | `s_` |
| `pacote.py` (`tier=A..D`, `mode=anim` ou `mode=still`) | 1-120 | `p_` |
| `quadra-toro.py` (`flip=1` = lado do time Preto) | imagem única | `out=arquivo.png` |
