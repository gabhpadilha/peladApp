# Cartas: peças e montagens

Regra do dono do app (2026-11-11): **toda carta desenhada no Gemini ganha uma pasta própria aqui**, com as peças
separadas como ele mandou e a carta montada. Serve para consultar depois num redesign, numa troca de ferramenta
(Blender, scripts com sharp) ou para refazer uma peça sem mexer nas outras.

## Como organizar

```
docs/cartas/<chave-da-carta>/        # a chave da skin ou do prêmio no código (ex.: destino, natal-craque)
  README.md                          # o que é cada peça, de onde veio, scripts que usam e o estado (aprovada, guardada, descartada)
  pecas/                             # as imagens exatamente como o dono mandou, sem mexer
    fundo.jpg
    borda.jpg
    enfeite-<nome>.jpg               # o que fica na moldura ou por cima dela (capuz, coroa, cristais)
    render-<nome>.jpg                # a peça 3D que vaza da carta
    flutuante-<nome>.jpg             # cada peça solta em volta da carta (anel, runa, cacos, gotas)
  montada/                           # a carta pronta, sem foto nem números (modo "pure")
    <chave>-2d.webp                  # como o app mostra hoje (fundo + moldura e peças)
    <chave>-3d.webp                  # a versão do Blender, se houver
```

- **Uma peça por arquivo.** Fundo, borda, cada enfeite, cada render que vaza e cada flutuante chegam separados do Gemini
  (luz sobre preto puro). Nunca guardar só a carta achatada: tirar uma peça de cima da borda depois deixa defeito
  (foi o que estragou as versões 3D de novembro).
- **As peças ficam como vieram.** Recortes e ajustes saem dos scripts (`docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/`,
  `scripts/blender/`) para `public/cartas/fundos/`; a pasta guarda a fonte.
- **Nada de rosto de jogador** aqui: a montada é sempre sem foto.
- Carta nova = pasta nova; redesign = nova versão das peças na mesma pasta (`borda-v2.jpg`) e uma linha no README dela.

## Cartas

| Carta | Estado | Pasta |
| --- | --- | --- |
| Destino (lendária, Loja de dezembro de 2026) | 2D no app; versão 3D do Blender aprovada pelo dono em 2026-11-11, ainda não ligada | [destino](destino/README.md) |

As cartas anteriores a esta regra têm as peças em `docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/` (arquivos `*-dono.jpg`).
