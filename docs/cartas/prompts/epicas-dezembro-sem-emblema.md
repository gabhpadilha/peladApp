# Prompts do Gemini: épicas de dezembro sem o emblema (Destino 2026)

As 8 épicas de dezembro vieram com o emblema de um grupo de heróis no topo da borda ("X", "4" ou "M"). Esses emblemas
são marca registrada, e o evento Destino só pode aludir aos personagens, nunca usar a marca. Este arquivo traz os prompts
para trocar o emblema por um enfeite nosso e para corrigir os fundos da Garra e da Miragem.

**Como fazer (edição, não carta nova):** abra uma conversa nova no Gemini, **anexe a imagem atual** (a `borda.webp` ou
o `fundo.webp` da carta, em `docs/cartas/<chave>/pecas/`) e cole o prompt. Como é uma edição da mesma imagem, a carta
continua no mesmo lugar, e a borda nova encaixa no fundo que já temos. Se o Gemini redesenhar tudo, responda:
"Mantenha a imagem idêntica; mude só o que eu pedi."

**Economia:** são 8 bordas e 2 fundos, ou seja, 10 imagens. Com 2 ou 3 cartas por conversa, dá em 4 ou 5 conversas.

**Ao receber:** salve a imagem nova com o nome da carta (ex.: `rajada-borda.png`) e me mande. Eu guardo a original como
`borda-com-emblema.webp`, ponho a nova como `borda.<ext>` e refaço a prévia.

---

## Prompt-base da borda (o mesmo para as 8)

Troque só `[ENFEITE NOVO]` pelo texto da carta, na tabela abaixo.

```
Edite a imagem anexada. Mantenha TUDO idêntico: o mesmo tamanho de imagem, a carta no mesmo lugar, a mesma moldura,
as mesmas cores, a mesma luz, o miolo preto puro e o preto puro em volta.
Mude só uma coisa: o emblema redondo no meio do topo da moldura. Remova o emblema e qualquer letra, número ou símbolo
dentro dele, e ponha no lugar [ENFEITE NOVO], do mesmo tamanho, no mesmo lugar e no mesmo material e estilo da moldura,
fotorrealista, com relevo e bem iluminado.
Nada de letras, números, logos, marcas ou símbolos de personagens, times ou empresas em lugar nenhum da imagem.
```

| Carta | Chave | `[ENFEITE NOVO]` |
| --- | --- | --- |
| Rajada | `rajada` | uma lente redonda de rubi com aro de aço escovado, brilhando em vermelho por dentro, como um visor aceso |
| Pedreira | `pedreira` | um bloco de pedra laranja lapidado em losango, preso por uma presilha de metal azul |
| Cartada | `cartada` | um losango de metal escuro com uma gema rosa no centro e um brilho rosa suave em volta |
| Ímã | `ima` | um ímã em forma de ferradura, de metal bordô com as pontas prateadas, soltando pequenos raios roxos entre as pontas |
| Miragem | `miragem` | um cristal hexagonal de gelo translúcido, azul-claro, com um brilho frio por dentro |
| Elástico | `elastico` | um nó de fios azuis entrelaçados preso num aro de metal azul, com um pequeno raio azul |
| Labareda | `labareda` | uma pequena chama de metal dourado com uma brasa laranja acesa no meio |
| Garra | `garra` | três lâminas curtas de aço prateado lado a lado, presas numa base de metal com um detalhe amarelo |

**Garra:** além do emblema, a borda tem um "X" de metal no topo. Junte ao prompt:
"O X de metal no topo também sai: no lugar dele vai o enfeite novo."

---

## Fundo da Garra (tem uma moldura dentro do fundo)

Anexe `docs/cartas/garra/pecas/fundo.webp`.

```
Edite a imagem anexada. Mantenha o mesmo tamanho de imagem, a carta no mesmo lugar, as mesmas cores e os três cortes
de garra no meio.
Remova a moldura, o painel e as linhas de circuito dourado que formam um quadro por dentro da carta: o fundo precisa ser
uma ilustração só, sem moldura, borda, fio ou contorno, preenchendo o retângulo inteiro até a beira. Pode ser uma
superfície de metal escuro escovado, com arranhões finos e um pouco de luz dourada vindo de baixo.
O centro e a metade de cima ficam calmos e um pouco escuros, porque ali vai a foto de um jogador.
Nada de letras, números, logos ou símbolos.
```

## Fundo da Miragem (tem uma silhueta de pessoa no meio)

Anexe `docs/cartas/miragem/pecas/fundo.webp`.

```
Edite a imagem anexada. Mantenha o mesmo tamanho de imagem, a carta no mesmo lugar, as mesmas cores, os mesmos anéis
de energia azul-gelo e a mesma luz.
Remova a silhueta de pessoa do meio: no lugar dela, continue o campo de força translúcido, com ondas de luz azul-clara.
Nada de pessoas, rostos, corpos, letras, números ou símbolos.
O centro e a metade de cima ficam calmos, porque ali vai a foto de um jogador.
```
