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

## O que trocar nas outras raridades (depois que a lendária for aprovada)
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
