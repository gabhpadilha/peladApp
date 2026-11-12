---
name: cartas-cancha
description: Criar, redesenhar ou ajustar o visual das cartas do Cancha Club (cartas especiais, premium da Loja, prêmios e eventos). Use quando o dono do app pedir uma carta nova, um redesign, um prompt para o Gemini, montar peças de arte (fundo, borda, render), animação de raios ou gotas, ou quando uma carta aparecer errada no celular. Cobre o fluxo de camadas, os scripts com sharp, a roupa em `components/cancha-card.tsx`, as regras do iPhone e o que o dono já aprovou ou recusou.
---

# Cartas do Cancha Club

Leia antes: `.claude/rules/design-system.md` (decisões por carta) e `components/cancha-card.tsx` (`Roupa`, `ROUPAS`, `skinRoupa`, `awardRoupa`). Scripts e fontes ficam em `docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/`; as imagens prontas, em `public/cartas/fundos/`.

## Quem decide
O dono do app aprova tudo por prévia (print no tamanho do celular). **Sempre** mande uma prévia antes de commitar e espere o ok. Responda em pt-BR. Projeto sem custos: nada pago, e os créditos do Gemini dele acabam (2026-11-04), então prefira reaproveitar arte já gerada.

## O que o dono já aprovou (repita a receita)
- **Fio de ouro fino por dentro + respiro preto + tubo de neon contínuo por fora**, miolo em arte fotorrealista, coroa ou ícone no topo. É a linguagem das cartas da Loja e do Time do Mês.
- **Fundo é o que mais pesa.** Tempestade, mármore, cristal, água, mar: texturas reais, não desenho em código.
- **O que vaza** (render) passa **por cima** da moldura, de forma sutil, e nunca cobre nome, selo do OVR nem estatísticas.
- Neon simétrico e concêntrico, sem aberturas irregulares.

## O que o dono já recusou (não repita)
- Cartas **3D** (Three.js/R3F) e render de pedra rachando.
- **Raios e linhas desenhados em código** ("ficou muito ruim"): parecem desenho. Para render de vazamento, ele quer **arte do Gemini**.
- Nuvem solta do Gemini no canto (aparecia como mancha), animações de pulsar/apagar raio nas cartas de prêmio, energia em LED em volta da moldura.
- Preto e dourado fora do Melhor Jogador, cantos em ponta (formato de escudo), logos e bandeiras de clube.

## Raridade pela borda (regra do dono do app, 2026-11-11)
**Nova regra de raridade (decisão do dono do app em 2026-11-11, vale das cartas de dezembro de 2026 em diante): nada vaza para fora da carta; a diferença entre as raridades está na borda.** Motivo: os renders vazando geravam retrabalho e não ficavam bons, e o que deixa a carta premium é a borda (padrão: Destino, Tormenta, Embuste). **Comum:** fio ou tubo simples, fundo padrão ou textura leve, nada em volta, sem animação. **Rara:** borda trabalhada de leve (gravado, fio duplo, cantos marcados), fundo com pattern próprio, nada em volta, sem animação. **Épica:** borda trabalhada com **1 ou 2 enfeites simples** (uma peça no topo ou cantos ornamentados), fundo sofisticado, nada em volta; animação opcional e leve, só dentro da carta (raio acendendo no fundo, brilho num enfeite). **Lendária:** borda **cheia de enfeites** (topo, cantos e laterais) em material nobre, fundo sofisticado, **flutuantes** atrás e em volta (círculo girando, pedras, cacos) e animação; a raridade mais escassa do conjunto (em geral 1 por mês; o evento grande pode ter mais: dezembro de 2026, o maior evento até agora, tem 3, Destino, Tormenta e Embuste, decisão do dono do app em 2026-11-12). Enfeite pode passar um pouco da borda (como o capuz no topo da Destino), mas é peça da moldura, nunca objeto saindo pela lateral. **Peças do Gemini, sempre separadas:** comum 1 (borda), rara 2 (fundo e borda), épica 2 a 4 (fundo, borda e 1 ou 2 enfeites), lendária fundo, borda, 3 ou mais enfeites e 3 a 5 flutuantes. As cartas que já têm algo vazando (Nuvem carregada, Relâmpago, Lenda do Trovão, os cristais Esmeralda/Safira/Ametista/Rubi, Ícone, Dilúvio) ficam como estão; novembro de 2026 é o último mês assim. Detalhes em `.claude/rules/design-system.md`.

## Fluxo de uma carta nova
0. **Pasta da carta (regra do dono do app, 2026-11-11):** toda carta ganha `docs/cartas/<chave>/` com `pecas/` (cada imagem do Gemini como veio: `fundo`, `borda`, `enfeite-*`, `render-*`, `flutuante-*`), `montada/` (`<chave>-2d.webp` e, se houver, `<chave>-3d.webp`, sem foto) e um `README.md` com o que é cada peça e o estado. Guarde as peças assim que chegarem, registre a carta em `docs/cartas/catalogo.json` (estado, peças, scripts, histórico com data) e rode `python3 scripts/cartas/gerar-catalogo.py` (gera índice, linha do tempo, ficha e montada). Para consultar qualquer carta, leia primeiro o `catalogo.json`. Nunca trabalhe só com a carta achatada: tirar uma peça de cima da borda deixa defeito.
1. **Prompt para o Gemini** (modelo pronto para épicas, só trocar o tema: `docs/cartas/prompts/epica.md`) (o dono gera; você escreve). Primeiro a carta inteira para ele escolher; depois **uma camada por mensagem**: fundo, borda e, só se houver, o render.
   - Formato 5:7, cantos arredondados, simétrica; imagem 2:3 com a carta em ~70% da largura e fundo da imagem **preto puro**, sem contorno branco e sem xadrez.
   - Layout dentro da carta: nome e posição em cima à esquerda, selo vertical "88" em cima à direita, foto grande, faixa "PRÊMIO · R12" e 3 estatísticas no rodapé (ATAQUE, CRIAÇÃO, DEFESA). Nada de bandeira, escudo, preço, estrelas.
   - Borda e render: luz sobre **preto puro** (metal escuro some, porque a transparência sai do brilho). Render pequeno, mais da metade para fora da carta, sem corte na borda da imagem.
   - Para inspirar-se em carta da EA: pedir "reinterprete, não copie" e proibir logos e marcas.
2. **Medir** as imagens recebidas com sharp (colunas e linhas de pixels claros): borda de fora do tubo (`EDGE`), lado de dentro do fio de ouro, raio do canto, caixa do cartão do fundo. Imagens do mesmo tamanho alinham direto; se vierem com tamanhos diferentes, cheque a proporção (848 × 1264 e 687 × 1024 têm a mesma).
3. **Script** `prototipos/<nome>.cjs` (modelo: `premio-time-do-mes-v4.cjs`, `premio-time-do-mes-v3`/`destaques-mar.cjs` no histórico). Saídas:
   - `<nome>.webp` (janela, 600 × 860) e `<nome>-vaza.webp` (714 × 1000, a carta ocupa os 84% do meio, 8% de sobra por lado).
   - Alfa de luz sobre preto: `smooth(14, 120, max(r, g, b))`, cor como está. O preto das artes **não é 0** (piso 15 a 26): descontar, senão aparece retângulo escuro.
   - A moldura é **opaca** na faixa dentro da carta e por fora da carta só luz; a rampa de alfa rente à borda evita emenda.
   - Se um elemento indesejado tem simetria (nuvem em um canto), refaça espelhando o outro lado e esmaeça a emenda.
4. **Roupa** em `cancha-card.tsx`: `background`, `overflow`, `window` (`"inner"` = conteúdo até o fio de ouro; `"ring"` = até o tubo, com `windowRadius`), `artFrame`, `clean`, `statsInset` (sobe as estatísticas do rodapé), `overflowBolts`/`innerBolts` + `glow` (raios que acendem), `drops` (gotas em código). Cartas ganhas antes mantêm o desenho antigo pelo tema gravado (`MONTH_ROUPA_CRISTAL`): zere os campos novos nelas.
5. **Prévia**: página temporária `app/auth/previa/<nome>/page.tsx` com `PlayerCard` e `SAMPLE_PLAYER` (nunca o rosto de quem está logado); copie `.env.local` do repo principal; `npx next dev -p 3111`; Playwright em `/home/gabriellinux/node_modules/playwright` (viewport 390 × 640, escala 2). Vídeo com `recordVideo`; confira o que anima com `document.getAnimations().length`.
6. **Limpeza antes de commitar**: apague a rota de prévia, o `.env.local` copiado, vídeos e arquivos de versões descartadas; rode `rm -rf .next && npx next typegen`, `npm run type-check` e `npm run lint`; atualize `CLAUDE.md` e `design-system.md`; pergunte "Faço push direto na main?" e a versão. Commits em inglês, no imperativo.

## Regras do iPhone (o WebKit quebra isto)
- Na carta: **sem `filter`, `mix-blend-mode`, `backdrop-filter`** nem máscara com a URL da foto. Brilho é traço do contorno ou degradê assado na imagem; sombra atrás da pessoa usa SVG, não `radial-gradient`.
- Animações só com `transform` e `opacity`; com `motion-reduce`, parada ou escondida. Raios acendem com `cc-thunder-glow` (3,6 s).
- Borda com opacidade parcial vira fio no Safari: as quatro bordas de camadas encaixadas terminam transparentes ou opacas, nunca meio-tom.
- Teste no WebKit do Playwright quando o problema for só do iPhone (ver CLAUDE.md, "Common Gotchas").

## Armadilhas conhecidas
- O `next dev` serve `globals.css` velho: `@keyframes` novo não aparece, `getAnimations()` volta 0. Apague `.next` e reinicie (nunca `pkill -f "next dev"` sem o truque dos colchetes `[n]ext`, que mata o próprio shell; use `setsid nohup`).
- Gradiente de cor da arte com pontos pretos: meça o piso do preto antes de calcular alfa.
- Peso: cada camada WebP deve ficar abaixo de ~150 KB; 24 imagens de animação (924 KB) foram vistas como pesadas.
- A carta aparece em muitos lugares (ranking, Coleção, mesa tática): teste em tamanho pequeno também.

## Bordas: a especialidade (2026-11-05, pedido do dono do app)
O dono quer **várias bordas, sempre diferentes**: umas em neon, outras mais metálicas (referência dele: moldura de ouro escovado com lâminas em leque nas laterais, estilo TOTY do EA FC), sempre com **render 3D vazando por cima da moldura** quando fizer sentido.

**Regra inegociável: o formato é o NOSSO retângulo arredondado 5:7.** Nunca escudo, entalhe no topo, ombros chanfrados, ponta embaixo ou cantos em ponta (a primeira tentativa, `Escudo`, foi recusada por isso). As referências do EA FC servem só para o **estilo** (materiais, fios, neon, degraus, brilho, render que vaza), nunca para a silhueta. Nunca use arte do EA no app: reinterprete.

**Anatomia de uma borda** (de fora para dentro): brilho e linhas de neon → painel azul-noite/escuro opaco → fio (ouro pálido duplo, metal escovado, prata) → janela do conteúdo. Ornamentos (leques, lâminas, degraus) ficam do lado de fora, dentro da sobra de 8% da caixa. O que vaza (render) fica por cima de tudo, sem cobrir nome, selo do OVR nem estatísticas.

**Receita técnica (modelo: `prototipos/voltagem.cjs`, carta `voltagem`):**
1. Desenhe a moldura em **SVG** no sistema da caixa (840 × 1176 dentro da célula 1000 × 1400, a caixa nos 84% do meio) e asse em WebP com `sharp`. Brilho = cópia desfocada dentro do SVG (`feGaussianBlur`), nunca `filter` CSS (iPhone).
2. Raios **concêntricos**: `R(d) = 40 + (66 − d)` para o recuo `d` da borda (40 na borda de dentro do fio). Linhas de neon com degradê vertical (ciano no topo, azul embaixo) e um **degrau diagonal** onde a linha se divide em duas nos lados, com um pedaço solto acima.
3. O miolo do painel é furado (`evenodd`) 1,5 px por dentro da janela, e o fio por cima cobre a emenda. Roupa: `window: "ring"`, `windowInset` e `windowRadius` (em cqw) medidos da mesma conta; `artFrame: true`, `clean: true`, `trim: null`.
4. **Render que vaza:** recorte o aglomerado da arte do Gemini (`premium-v2-dono.jpg`): máscara por brilho (mais claro que o azul-noite) mais o azul-escuro que o fundo não tem, fechamento com caixa de 12 px e suavização por desfoque + limiar, tire o fio e o neon da arte por faixas, gire o tom, ponha uma sombra suave e componha **por cima** da moldura numa imagem mais larga (`overflowWidth`: 1,25). O fundo é o miolo da mesma arte sem o aglomerado (lado esquerdo espelhado). **Armadilhas:** `sharp(...).raw()` de 1 canal pode voltar com 3 (use `extractChannel(0)`); `resize` roda antes de `composite` (faça em dois passos); dilatar com caixa deixa degraus.
5. Prévia no celular, comparando com a Safira ao lado, e só então o ok do dono.

**Catálogo de estilos:** `voltagem` (neon duplo + fio duplo de ouro pálido + cristais 3D vazando). Próximos a propor: metálica de ouro escovado com lâminas em leque nas laterais e render de vidro dourado; prata e gelo; bronze e fogo; cromada holográfica. Cada uma: um estilo de fio, um de neon (ou nenhum), um ornamento lateral e um render. **Desenhar linha em código funcionou aqui porque o dono pediu o estilo da referência dele; o render, porém, sempre vem de arte dele no Gemini.**

## Camadas e encaixe (decisão do dono do app, 2026-11-05)
- **A borda fica por cima de tudo; o conteúdo vai por baixo dela.** A arte do fundo e a janela do conteúdo (barras do nome e das estatísticas) seguem até quase a borda da carta (`artInset` e `windowInset` de ~1,4% e ~1%) e a moldura, com o miolo vazado, corta tudo na borda de dentro. Nunca pare o conteúdo rente à borda de dentro: dava linha preta e emenda. O recuo do nome, do OVR e das estatísticas é devolvido por `contentPad` (cqw), para as informações ficarem no lugar padrão.
- **O elemento 3D que enfeita faz parte da borda** (louros, gemas, folhas, capas): vem na mesma imagem da moldura, por fora, e a moldura é uma peça só. Isso dispensa recortar um "aglomerado" à parte, que dava Frankenstein.
- **Moldura do Gemini:** o miolo é cortado por um retângulo arredondado (`holeRect` do `montar-carta.cjs`) exatamente na borda de dentro do ouro, sem comer o relevo interno da moldura (cortar 3 px para dentro apagava as molduras internas); o filete escuro da borda fica como sombra de borda sobre o conteúdo, que vai por baixo. Troca de cor das gemas com `GEM="matiz,saturação,luz"`.
- **Vazar para fora da carta** só com peça própria do Gemini (elemento sozinho sobre preto, bem iluminado, sem partes escuras); recorte de arte achatada foi recusado duas vezes.
- **Relevo por cima do conteúdo (2026-11-05):** o miolo da moldura é o PRETO ligado ao centro (inundação, argumento `-` no `holeRect`), e não um retângulo: assim as folhas e os detalhes da moldura que cruzam a borda de dentro ficam visíveis POR CIMA do conteúdo, como o dono pediu. Use o retângulo (`holeRect`) só quando o Gemini pôr enfeite grande dentro do miolo e ele precisar sumir.

## Padrão aprovado (2026-11-05, "é esse o padrão que temos que seguir sempre")
Receita das cartas de evento e premium, na qualidade da Destino e das de Natal:
1. **Kit de 2 peças do Gemini no gabarito 5:7**, uma mensagem por camada: FUNDO (arte até a borda da carta, sem moldura) e MOLDURA (fina, retângulo arredondado, miolo preto, **enfeites por fora**, os de baixo pequenos e baixos). Resolução maior que 728 × 1024 quando possível.
2. **Montar com `prototipos/montar-carta.cjs`** (medir a caixa da carta nas duas imagens; `OPAQUE` para peças escuras; `holeRect` só se um enfeite invadir o conteúdo). Conteúdo por baixo da borda, relevo por cima (`artInset`, `windowInset`, `contentPad`); enfeites que cobrem os números: `statsLift`, `statsPadX`, `namePadX`. Um pouco de enfeite sob os números é aceito.
3. **Referência sem copiar:** cor, material e símbolo genérico; nada de nome, logo, traje ou rosto de obra existente (a Loja de dezembro, "Destino", alude a um vilão de cinema só por runas, ferro, verde-esmeralda e um capuz).
4. **Carta premium de prestígio pode ganhar peças flutuantes animadas** (`floaters`: runas, cacos, círculo arcano; peças do Gemini sobre preto, `prototipos/destino-runas.cjs`; só `transform`, somem em carta pequena, paradas com movimento reduzido). Aprovado pelo dono ("irado") na Destino.
5. **Fluxo:** prévia no celular (e vídeo quando houver animação) antes de commitar; guardar a carta em `ROUPAS` fora de `CARD_SKINS` até o evento existir; documentar em `CLAUDE.md`, design-system e `docs/calendario-eventos.md`.
