# Prompt do Gemini: carta épica (modelo para qualquer tema)

Para usar com qualquer carta épica. Troque só o que está entre `[COLCHETES]`.
Regra de raridade (2026-11-11): **nada vaza para fora da carta**. A épica tem borda trabalhada com **1 ou 2 enfeites simples**
e fundo sofisticado; nada flutua em volta (isso é só da lendária).

**Economia:** são **2 imagens por carta** (fundo e borda com os enfeites). Com 2 ou 3 cartas por janela do Gemini, cabem 4 a 6 imagens.
Só peça a 3ª imagem (o enfeite sozinho) se quiser que ele ganhe animação ou vire 3D depois.

Ao receber, salve as imagens em `docs/cartas/<chave>/pecas/` como `fundo.jpg`, `borda.jpg` (e `enfeite-<nome>.jpg`, se pedir).

---

## Antes de começar (preencha uma vez por carta)

- **[TEMA]**: o assunto da carta. Ex.: "tempestade de areia no deserto", "forja de um ferreiro anão", "aurora boreal sobre geleira".
- **[PALETA]**: 2 ou 3 cores. Ex.: "âmbar, cobre e marrom-escuro".
- **[MATERIAL DA BORDA]**: do que é a moldura. Ex.: "bronze envelhecido", "prata polida", "ferro escovado com rebites", "ouro fosco".
- **[ENFEITE 1]**: a peça principal da moldura, no meio do topo. Ex.: "uma pequena coroa de bronze", "um martelo cruzado", "um floco de gelo de cristal".
- **[ENFEITE 2]** (opcional): enfeite dos 4 cantos. Ex.: "cantoneiras com uma gema âmbar", "folhas de metal". Sem segundo enfeite, apague a linha dele.

---

## Mensagem 1: o fundo

> Cole junto as imagens de referência, se tiver (até 3). Elas guiam só o clima, a luz e o material.

```
Vou criar uma carta colecionável de um jogo em várias peças separadas, uma por mensagem. Todas as peças precisam ter
EXATAMENTE o mesmo tamanho de imagem e a carta no MESMO lugar, para eu encaixar uma em cima da outra depois.

Gabarito (vale para todas as mensagens):
- Imagem vertical na proporção 2:3, fundo preto puro (#000000) em volta da carta, sem degradê, sem textura e sem sombra.
- A carta é um retângulo vertical de cantos arredondados na proporção 5:7, centralizado, ocupando 70% da largura da imagem.
- Nada de texto, letras, números, logos, marcas, bandeiras, rostos ou pessoas.
- As imagens anexadas são só referência de clima, luz e material: não copie nenhum elemento, personagem ou marca delas.

Agora, peça 1: o FUNDO da carta.
Tema: [TEMA]. Cores: [PALETA].
Preencha o retângulo 5:7 inteiro com uma ilustração fotorrealista do tema, rica em textura e profundidade, com luz
cinematográfica. NÃO desenhe moldura, borda, fio nem contorno: só a ilustração, recortada no retângulo arredondado.
O centro e a metade de cima ficam mais calmos e um pouco mais escuros, porque ali vai a foto de um jogador por cima;
os detalhes mais interessantes ficam nas laterais e embaixo. Fora do retângulo, só preto puro.
```

## Mensagem 2: a borda com os enfeites

```
Peça 2: a BORDA da mesma carta, no MESMO tamanho de imagem e com a carta exatamente no MESMO lugar da peça 1.

Desenhe só a moldura em volta do retângulo 5:7 de cantos arredondados, feita de [MATERIAL DA BORDA], fotorrealista,
com relevo e boa luz (metal claro e bem iluminado, nada muito escuro), espessura de cerca de 4% da largura da carta,
igual nos 4 lados e simétrica da esquerda para a direita.
Enfeites (só estes, simples e elegantes, presos na própria moldura):
- [ENFEITE 1], no meio do topo, podendo passar um pouco para fora da borda de cima.
- [ENFEITE 2], nos 4 cantos.
Nada sai pelas laterais da carta e nada flutua solto em volta.
O MIOLO da moldura (todo o lado de dentro) é preto puro (#000000), e o lado de fora também é preto puro.
Cores de destaque: [PALETA].
```

## Mensagem 3 (opcional): o enfeite sozinho

> Só se quiser animar o enfeite (brilho acendendo) ou fazer a carta em 3D no Blender.

```
Peça 3: só o [ENFEITE 1], sozinho, sobre preto puro (#000000), no MESMO tamanho de imagem e na MESMA posição
em que ele aparece na peça 2. Sem a moldura, sem sombra no chão, bem iluminado, sem partes escuras.
```

---

## Se o resultado vier errado (respostas prontas)

- **Carta fora do lugar ou de outro tamanho:** "A carta precisa estar no mesmo lugar e no mesmo tamanho da peça 1: 70% da largura da imagem, centralizada, proporção 5:7."
- **Moldura no fundo:** "Refaça a peça 1 sem nenhuma moldura, borda ou contorno: só a ilustração dentro do retângulo."
- **Miolo da borda não é preto:** "O lado de dentro da moldura precisa ser preto puro (#000000), sem nada desenhado."
- **Algo saindo pela lateral:** "Nada pode sair pelas laterais da carta; os enfeites ficam presos na moldura."
- **Contorno branco ou fundo xadrez:** "Sem contorno branco e sem fundo xadrez: o fundo em volta da carta é preto puro."
- **Ficou exagerado:** "Deixe os enfeites mais simples e menores; é uma carta épica, não lendária."
- **Texto ou letras na arte:** "Remova qualquer texto, letra ou número da imagem."
- **Emblema de personagem, time ou marca** (aconteceu nas épicas de dezembro: "X", "4", "M"): "Remova o emblema e ponha no lugar [ENFEITE], no mesmo material da moldura; nada de logos ou símbolos de personagens." Melhor ainda: anexe a imagem e peça só a troca, como em `epicas-dezembro-sem-emblema.md`. Ao pedir um tema inspirado num personagem, descreva o poder (feixe vermelho, fogo, garras), nunca o nome dele.

## Exemplo preenchido

- **[TEMA]**: forja de um ferreiro anão dentro de uma montanha, brasas e faíscas
- **[PALETA]**: laranja-brasa, cobre e cinza-chumbo
- **[MATERIAL DA BORDA]**: ferro escovado com rebites de cobre
- **[ENFEITE 1]**: um pequeno martelo de forja cruzado com uma tenaz
- **[ENFEITE 2]**: cantoneiras de ferro com uma brasa incandescente no meio
