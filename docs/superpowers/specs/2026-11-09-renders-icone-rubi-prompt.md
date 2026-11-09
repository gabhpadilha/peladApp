# Renders 3D de Ícone e Rubi (para virarem Épicas)

Decisão do dono do app em 2026-11-09: Ícone e Rubi eram Raras (borda e fundo, sem peça vazando) e custam mais que cartas Épicas. Pela regra de raridade, Épica = borda trabalhada + fundo sofisticado + **1 render 3D vazando**. Falta só o render de cada uma.

## Regras da peça (valem para as duas)

- Uma imagem só, o **objeto sozinho sobre preto puro** (#000), sem cartão, sem moldura, sem texto.
- Bem iluminado, **sem partes escuras** (o preto vira transparência pelo brilho; parte escura some).
- **Inteiro dentro da imagem**, com folga dos quatro lados, e **pequeno**: ocupa uns 60% da largura. Mais da metade dele vai ficar para fora da carta, então o lado que encosta na carta pode ser reto ou mais denso.
- Formato 2:3 vertical, 1344 x 2016 ou parecido.
- Mesma luz e cor da carta: o dourado tem o tom da moldura de louros (champanhe, não amarelo vivo).
- Sem fumaça, sem rastro de faíscas largo e sem fundo com degradê: só o objeto e, no máximo, poucas fagulhas perto dele.

## Prompt: Ícone (mármore branco-creme, quartzo, diamantes, ouro)

> Render 3D fotorrealista de um aglomerado de cristais de quartzo branco leitoso e diamantes lapidados, com pepitas de ouro champanhe e veios de mármore branco-creme com fio dourado em alguns cristais. Composição vertical, o aglomerado inclinado para a direita, uns 60% da largura da imagem, inteiro e sem cortes. Iluminação de estúdio forte, reflexos nítidos nas facetas, brilho suave nas pontas. Algumas fagulhas pequenas e brilhantes só rente ao aglomerado. Fundo preto puro (#000000), sem cenário, sem sombra no chão, sem texto. Tudo bem iluminado, sem áreas escuras. Proporção 2:3.

## Prompt: Rubi (rubis, ouro, rosa-escuro)

> Render 3D fotorrealista de um aglomerado de cristais de rubi vermelho profundo e rosa-rubi translúcidos, com pepitas de ouro champanhe entre os cristais. Composição vertical, o aglomerado inclinado para a direita, uns 60% da largura da imagem, inteiro e sem cortes. Iluminação de estúdio forte, luz atravessando os cristais (translucidez, refração rubi), reflexos nítidos nas facetas. Algumas fagulhas pequenas e brilhantes só rente ao aglomerado. Fundo preto puro (#000000), sem cenário, sem sombra no chão, sem texto. Tudo bem iluminado, sem áreas escuras. Proporção 2:3.

## Depois que o dono mandar as imagens

1. Montar a peça com o mesmo script das cartas de louros (`prototipos/montar-carta.cjs`, camada de render por cima da moldura, alfa pelo brilho, esmaecer 24 px da borda da imagem) e pôr em `overflow` na roupa da carta.
2. Lembrete do dono: nada de recorte da arte achatada; vazar só com peça própria do Gemini.
3. Subir `SKIN_RARITIES` de `icone` e `rubi` para `epica` em `lib/packs.ts` (e a coluna de raridade das skins de pacote, se já houver).
4. Se o Ícone, por ser a mais cara, merecer ficar acima das outras Épicas, avaliar um segundo elemento (um círculo atrás) antes de decidir se é Lendária (só 1 Lendária por conjunto de pacote).
