---
title: PeladApp Recorte
emoji: ⚽
colorFrom: green
colorTo: gray
sdk: gradio
sdk_version: 5.35.0
python_version: 3.12.12
app_file: app.py
pinned: false
license: mit
models:
  - ZhengPeng7/BiRefNet-portrait
  - TencentARC/GFPGANv1
preload_from_hub:
  - ZhengPeng7/BiRefNet-portrait
---

# PeladApp: recorte de fundo

Máscara da pessoa para as cartas do PeladApp, com o
[BiRefNet Portrait](https://huggingface.co/ZhengPeng7/BiRefNet-portrait) (MIT)
em ZeroGPU. Antes do recorte, a API `/enhance` melhora a foto: rosto pelo
[GFPGAN 1.4](https://github.com/TencentARC/GFPGAN) (Apache 2.0) e o resto pelo
[Real-ESRGAN x2](https://github.com/xinntao/Real-ESRGAN) (BSD-3), com mistura
"leve" (`FACE_WEIGHT`), e devolve a foto melhorada e a máscara dela. Os pesos
dos dois baixam do GitHub na primeira subida. A API antiga `/mask` (só a
máscara) continua para versões antigas do app.

Este diretório é a cópia versionada do Space; o app chama a API `/enhance`
pelo servidor (`lib/hf-matte.ts`). Mudou `app.py` ou `requirements.txt`?
Reenvie os dois em "Files → Add file → Upload files" e espere o build.

## Como publicar (conta gratuita)

Requisitos do ZeroGPU grátis: e-mail verificado e conta com mais de 30 dias
(até 2 Spaces ZeroGPU por conta).

1. Em <https://huggingface.co/new-space>: nome `peladapp-recorte`, SDK
   **Gradio**, hardware **ZeroGPU**, visibilidade **Private**.
2. Envie os três arquivos desta pasta (`README.md`, `app.py`,
   `requirements.txt`) em "Files → Add file → Upload files".
3. Espere o build (alguns minutos) e confira se o Space fica "Running".
4. Em <https://huggingface.co/settings/tokens>, crie um token **Read**.
5. Na Vercel (e no `.env.local`), configure:
   - `HF_SPACE_URL` = `https://<seu-usuario>-peladapp-recorte.hf.space`
   - `HF_TOKEN` = o token Read (necessário porque o Space é privado; também
     faz a cota contar como conta logada: 5 min de GPU por dia).

Sem essas variáveis, ou se o Space estiver dormindo/sem cota, o app segue
para o remove.bg e depois para o MODNet local.
