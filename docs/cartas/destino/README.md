# Destino

Lendária do evento "Destino" da Loja de dezembro de 2026 (nível 5, 600 CC; `destino` em `CARD_SKINS` e na roupa
`destino` de `components/cancha-card.tsx`). Design original que só alude a um vilão de capuz verde: ferro forjado,
runas verde-esmeralda inventadas, cristais de esmeralda e capuz de pano.

## Peças (`pecas/`, como o dono mandou do Gemini)

| Arquivo | O que é | Usada por |
| --- | --- | --- |
| `fundo.jpg` | ferro forjado com runas, pano verde-musgo e cristais | `prototipos/montar-carta.cjs` → `public/cartas/fundos/premium-destino.webp` |
| `borda.jpg` | moldura de aço escovado com runas, cristais nos cantos de cima e o capuz pintado no topo | `montar-carta.cjs` → `premium-destino-vaza.webp` |
| `enfeite-capuz-3d.jpg` | o capuz em render 3D, sozinho sobre preto (2026-11-11) | `scripts/blender/carta-3d.py` (recorte em `scripts/blender/texturas/destino-capuz.png`) |
| `flutuante-circulo-arcano.jpg` | círculo de aço e ouro com runas verdes (gira atrás da carta) | `prototipos/destino-runas.cjs` → `destino-circulo.webp` |
| `flutuante-runa-pedra.jpg` | runa de pedra hexagonal | `destino-runas.cjs` → `destino-runa.webp` |
| `flutuante-cacos-esmeralda.jpg` | cacos de esmeralda | `destino-runas.cjs` → `destino-caco-*.webp` |

Os originais também continuam em `docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/destino-*-dono.jpg`, onde os scripts os leem.

## Montada (`montada/`)

- `destino-2d.webp`: como o app mostra hoje (fundo + moldura pintada).
- `destino-3d.webp`: a versão do Blender (`carta-3d.py skin=destino`): placa de ferro com espessura, moldura em relevo,
  cachos de esmeralda em vidro, o capuz 3D no topo, o círculo arcano atrás, runas de pedra em prisma e cacos flutuando.
  No app, a foto e os números entram ao vivo entre a camada do fundo e a da moldura (`camada=fundo` e `camada=moldura`).

## Histórico

- 2026-11-05: montada e guardada (2D).
- 2026-11-11: versão 3D aprovada pelo dono do app, com o capuz dele no topo da carta (o capuz na cabeça do jogador foi descartado). Ainda não ligada no app.
