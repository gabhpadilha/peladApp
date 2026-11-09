# Versos das cartas por raridade: prompt para o Gemini (2026-11-09, versão 2)

A carta gira e o verso mostra a raridade da skin. **Uma arte-base só**; muda entre as raridades o **material, a cor, o brilho e a quantidade de detalhe**. A primeira versão (estilo tarô, linhas finas em foil) foi **descartada pelo dono do app**: ele quer **carta colecionável de verdade, com a nossa logo e detalhes mais fotorrealistas** (metal, relevo, foil, vidro).

## Direção
- **Peça de colecionador fotografada de cima**, não ilustração: placa de material real com relevo, bisel, reflexos e microtextura (aço escovado, anodizado, ouro polido, obsidiana, foil holográfico). Referências de espírito: verso de carta premium de Ultimate Team, Topps Chrome, Pokémon holográfica, baralho de luxo.
- **A logo do Cancha Club é a estrela**: no centro, em relevo, dentro de um medalhão. Anexar os dois arquivos de logo (`logo-cancha-branco-sobre-preto.png` e `logo-cancha-lima-sobre-preto.png`, gerados da marca "Quadra vazada").
- **Linguagem decorativa = linhas de quadra de futsal vista de cima** (a própria logo é uma quadra): meia-lua, áreas, círculo central, marcas, em baixo-relevo ou gravadas como guilloché, em vez de luas e estrelas de tarô.
- **Nada de tarô, astrologia, luas, sóis ou estrelas místicas.**

## Especificações (valem para as 4 imagens)
- **Proporção 5:7** (vertical), por exemplo 1000 × 1400 px, de ponta a ponta, **sem cantos arredondados desenhados** e sem margem (o app arredonda).
- **Medalhão central** com a logo em relevo, ocupando cerca de 45% da largura.
- **Duas plaquinhas vazias, em baixo-relevo, sem nenhum texto**: uma faixa estreita no topo (cerca de 10% da altura, para o nome da skin) e uma maior embaixo (cerca de 16%, para o nome da raridade e o cristal).
- Simetria esquerda/direita. **Nenhum texto, letra ou número** fora da logo.
- Entregar em PNG ou JPG. **Uma imagem por mensagem, na mesma conversa**; a primeira vira gabarito.

## Prompt da lendária
> Crie o verso de uma carta colecionável premium, vista de cima e totalmente plana, proporção 5:7 vertical (por exemplo 1000 × 1400 px), preenchendo a imagem de ponta a ponta, sem cantos arredondados, sem margem e sem sombra em volta. Não é um desenho: tem que parecer uma **fotografia de estúdio de uma peça física de colecionador de altíssimo valor**, com materiais reais, relevo, bisel, reflexos nítidos e microtextura.
>
> **Material e cor (lendária):** placa de **obsidiana preta polida** com fina textura de fibra de carbono por baixo, bordas com **bisel de ouro maciço polido**, e todos os detalhes em **ouro 24k espelhado** com pequenos **detalhes em rubi vermelho facetado**. Iluminação de estúdio com reflexos dourados intensos nas arestas, um halo quente atrás do medalhão e leve brilho holográfico nos cantos, como foil de carta rara.
>
> **Centro:** um **medalhão circular grande**, em relevo, com anel de ouro e bisel, e dentro dele a **logo do Cancha Club exatamente como na imagem anexa** (uma carta em formato de escudo vista de cima, que é uma quadra de futsal, com o "c" aberto no círculo central, a linha do meio entrando pela esquerda e as duas áreas). A logo em **ouro espelhado em alto-relevo**, com sombra suave e reflexo, fiel ao desenho anexo, sem alterar a forma.
>
> **Decoração:** gravada na obsidiana, **linhas de quadra de futsal vista de cima** em guilloché fino de ouro: arcos de área, círculo central repetido em anéis concêntricos, marcas e cantos de quadra, em baixo-relevo, simétricos. Nos quatro cantos, **cantoneiras de ouro** com pequenos rubis. Uma moldura dupla de ouro com microtexto repetitivo de padrão geométrico (sem letras).
>
> **Plaquinhas:** uma **faixa estreita e vazia, em baixo-relevo, no topo** e uma **plaquinha maior e vazia, em baixo-relevo, embaixo**, cada uma com bisel de ouro, **sem nenhum texto dentro**.
>
> **Não inclua:** nenhum texto, letra ou número (a logo é o único símbolo), nem luas, estrelas, sóis, tarô, astrologia, personagens ou rostos. Acabamento limpo, nítido, alto contraste, fotorrealista.

## Versão simples (pedido do dono do app depois da primeira lendária do Gemini)
O resultado do Gemini (obsidiana preta, moeda de ouro com a logo e linhas de quadra em ouro) ficou na direção certa, mas **com detalhe demais em aço e pedras**. Simplificar: **sem rubis, sem cantoneiras de joia, sem bisel grosso e sem guilloché denso**. Fica só: placa preta fosca, **fio de ouro fino** com as linhas de quadra (poucas), a **moeda de ouro com a logo** no centro e as duas plaquinhas **só em contorno fino**.

### Pedido para ajustar a imagem que ele já gerou (colar na mesma conversa)
> Mantenha exatamente este desenho (placa preta, moeda de ouro com a logo no centro, linhas de quadra em ouro, plaquinha vazia em cima e embaixo), mas **simplifique bastante**: remova os rubis e as cantoneiras de joia dos cantos; troque a moldura grossa de ouro por um **fio fino de ouro**; reduza as linhas de quadra a **poucas linhas limpas** (círculo central, as duas áreas e a linha do meio) sem o desenho fino repetido (guilloché) em volta da moeda; deixe o fundo preto **fosco e liso**, sem textura de fibra; as duas plaquinhas viram **apenas um contorno fino de ouro, sem bisel**. Mantenha a moeda de ouro com a logo, com um brilho suave. Nada de texto, só a logo. Mesma proporção 5:7 e mesma posição de tudo.

### Prompt-base simples (para as outras raridades; só muda cor e material)
> Verso de carta colecionável **minimalista e elegante**, vista de cima, plana, proporção 5:7 vertical, de ponta a ponta, sem cantos arredondados. Fundo **[COR DO FUNDO] fosco e liso**. **Fio fino [COR DO FIO]** formando a moldura e poucas linhas limpas de quadra de futsal vista de cima (círculo central, as duas áreas, linha do meio). No centro, uma **moeda circular [MATERIAL DA MOEDA]** com a **logo do Cancha Club em relevo, exatamente como na imagem anexa**. Uma **plaquinha vazia só em contorno fino** no topo e outra maior embaixo, sem texto. Sem pedras, sem joias, sem bisel grosso, sem ornamentos repetitivos, sem nenhum texto além da logo. Fotorrealista, luz suave, **[BRILHO]**.

| | Comum | Rara | Épica | Lendária |
|---|---|---|---|---|
| **Fundo** | grafite fosco | azul-marinho fosco | roxo-escuro fosco | preto fosco |
| **Fio** | prata fosca | azul-gelo | dourado-champanhe | ouro |
| **Moeda** | aço escovado | prata polida | ouro-champanhe com reflexo violeta | ouro polido |
| **Brilho** | nenhum | reflexo azul suave | reflexo iridescente violeta | brilho dourado suave |

## O que trocar nas outras raridades (versão detalhada, descartada por enquanto)
| | Comum | Rara | Épica | Lendária |
|---|---|---|---|---|
| **Placa** | polímero grafite fosco | alumínio anodizado azul escovado | vidro violeta escuro sobre metal escovado | obsidiana preta polida |
| **Bisel e detalhes** | aço escovado | prata polida | ouro-champanhe e foil holográfico violeta | ouro 24k espelhado com rubis |
| **Gravura de quadra** | poucas linhas, rasas | linhas duplas | linhas duplas, anéis concêntricos | guilloché denso, anéis, cantoneiras |
| **Brilho** | nenhum | reflexo azul suave | holográfico iridescente | halo dourado e reflexos intensos |

## Armadilhas
- Se o Gemini escrever texto: "Refaça sem nenhuma letra ou número, só a logo."
- Se mudar a logo: "A logo tem que ser exatamente a da imagem anexa, sem alterar a forma."
- Se vier cantos arredondados, margem ou sombra em volta: "Preencha a imagem inteira, sem margem nem sombra."
- Se vier tarô, luas ou estrelas: "Troque por linhas de quadra de futsal (arcos de área, círculo central), sem nenhum elemento de astrologia."
