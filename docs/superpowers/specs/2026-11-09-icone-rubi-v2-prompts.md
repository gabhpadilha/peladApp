# Ícone e Rubi, segunda versão em 3 peças (Épicas)

Decisão do dono do app em 2026-11-09: o render colado sobre a moldura antiga ficou ruim (parecia adesivo). Mesmos conceitos, mas **borda, fundo e render novos, pensados juntos**, no caminho que funcionou no Melhor Jogador, na Lenda do Trovão e na Destino.

## Regras para as 3 imagens de cada carta

- **Mesmo tamanho (2:3) e a carta no mesmo lugar** nas três: a carta ocupa ~70% da largura, encostada à esquerda do centro, e o resto (direita) fica livre para o render passar.
- **Gerar na ordem: 1) borda, 2) fundo, 3) render**, cada uma numa mensagem, anexando a anterior como referência de material e luz.
- Formato da carta: retângulo arredondado 5:7 (anexar o gabarito 5:7). Sem escudo, sem cantos recortados.
- **Fundo:** só o cartão, sem contorno branco em volta, sem moldura (a moldura é a peça 1).
- **Borda:** moldura sobre preto puro, **miolo preto**, bem iluminada, sem partes escuras. Fina (~3% da largura), para o conteúdo ir por baixo dela.
- **Render:** objeto sozinho sobre preto puro, inteiro, **pequeno e encostado na borda direita da carta**: mais da metade fica para fora. Sem fumaça e sem rastro largo de faíscas.
- Mesma paleta nas 3 peças (ouro champanhe, não amarelo vivo).

## Ícone (mármore branco-creme, quartzo, diamantes, ouro)

**1. Borda**
> Moldura de carta colecionável em retângulo arredondado de proporção 5:7, vista de frente, sobre fundo preto puro. Ouro champanhe escovado, fina, com um fio interno mais fino. Nos quatro cantos e no centro do topo, pequenos engastes de diamante lapidado e pequenas lascas de quartzo branco leitoso incrustados na moldura, de forma simétrica e discreta. O miolo da carta é preto puro. Iluminação de estúdio, reflexos nítidos no ouro, tudo bem iluminado, sem áreas escuras. Fotorrealista, sem texto. Imagem 2:3 com a carta ocupando 70% da largura, alinhada à esquerda do centro.

**2. Fundo**
> Fundo para a mesma carta: mármore branco-creme com veios finos de ouro, polido e sofisticado, com leve profundidade e pequenas lascas de ouro soltas. Só o cartão retangular arredondado 5:7, na mesma posição e tamanho da moldura, sem moldura e sem contorno branco em volta, sobre preto puro. Luminoso, claro, sem áreas escuras. Imagem 2:3.

**3. Render**
> Render 3D fotorrealista de um aglomerado de cristais de quartzo branco leitoso, diamantes lapidados e pepitas de ouro champanhe, no mesmo ouro da moldura anexa. Composição vertical, inclinado, pequeno, encostado na borda direita da carta anexa, com mais da metade para fora dela. Inteiro, sem cortes, iluminação de estúdio forte, poucas fagulhas só rente ao aglomerado. Fundo preto puro, sem sombra no chão, sem texto, sem áreas escuras. Imagem 2:3, mesma posição da carta anexa.

## Rubi (rubis, ouro, vinho)

**1. Borda**
> Moldura de carta colecionável em retângulo arredondado de proporção 5:7, vista de frente, sobre fundo preto puro. Ouro champanhe escovado, fina, com um fio interno mais fino. Nos quatro cantos e no centro do topo, pequenos cristais de rubi vermelho profundo translúcidos engastados, de forma simétrica e discreta. O miolo da carta é preto puro. Iluminação de estúdio, reflexos nítidos no ouro, tudo bem iluminado, sem áreas escuras. Fotorrealista, sem texto. Imagem 2:3 com a carta ocupando 70% da largura, alinhada à esquerda do centro.

**2. Fundo**
> Fundo para a mesma carta: veludo bordô-vinho profundo com textura de cristais de rubi facetados em relevo, tons de vinho a rosa-rubi, com pequenas lascas de ouro soltas e brilho suave. Só o cartão retangular arredondado 5:7, na mesma posição e tamanho da moldura, sem moldura e sem contorno branco em volta, sobre preto puro. Bem iluminado, sem áreas escuras. Imagem 2:3.

**3. Render**
> Render 3D fotorrealista de um aglomerado de cristais de rubi vermelho profundo e rosa-rubi, translúcidos, com pepitas de ouro champanhe, no mesmo ouro da moldura anexa. Composição vertical, inclinado, pequeno, encostado na borda direita da carta anexa, com mais da metade para fora dela. Inteiro, sem cortes, luz atravessando os cristais, poucas fagulhas só rente ao aglomerado. Fundo preto puro, sem sombra no chão, sem texto, sem áreas escuras. Imagem 2:3, mesma posição da carta anexa.

## Quando as imagens chegarem

Montar com `montar-carta.cjs` (borda por cima de tudo, conteúdo por baixo, render por cima da borda) e ligar em `ROUPAS`; `icone` e `rubi` já voltam a `epica` em `lib/packs.ts` quando a arte estiver aprovada (o commit de renders foi revertido, então hoje estão Raras).
