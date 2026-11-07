# Pacotes de skins (rascunho de decisões, 2026-11-07)

Estado: **brainstorming em andamento**. Nada disto está implementado na `main`. O protótipo da abertura (aprovado em 2026-11-07) está na branch `spike/pacote-animacao` (`app/auth/previa/pacote/`, vídeos gerados por `pack-lab.tsx?r=comum|rara|epica|lendaria`) e o modo `pure` da `CanchaCard` (só fundo, borda, arte que vaza e flutuantes) também só vive lá.

## Intenção
Dar emoção ao fim da rodada e variar a dinâmica, sem mexer em como a pelada é jogada (anti-meta: nada de poder escolher, vetar, bater pênalti ou "gincana tipo Kings League"; o futebol real é o que vale). O pacote vive só na camada visual e de coleção.

## Decisões do dono do app
- **Todo mundo que jogou a rodada ganha 1 pacote, com 1 skin só.** Num mês de 4 a 5 rodadas são 4 a 5 skins por pessoa; tem que ser difícil completar tudo.
- **A chance de coisa boa depende da posição na rodada** (não do acumulado do mês). Faixas de posição (1º, 2º e 3º, meio, últimos), não posições fixas, porque o número de jogadores varia.
- **Rascunho de probabilidades (calibrar com o uso):** 1º: 45/33/17/5 · 2º e 3º: 55/29/12/4 · meio: 64/25/9/2 · últimos: 72/21/6/1 (comum/rara/épica/lendária, %). O dono achou justo a diferença de 5x na lendária entre 1º e último.
- **Repetida** vale 10 a 20 CC (de propósito, é o "ruim" do pacote). As probabilidades aparecem escritas na tela do pacote.
- **Proteção contra azar:** a chance de uma carta cresce a cada rodada em que ela não saiu, e há **garantia de fim de evento** (toda carta sai ao menos uma vez). Aparece na tela ("essa carta não saía há N rodadas"). Em aberto: vale por pelada ou no app inteiro.
- **Skins dos pacotes são exclusivas** (não são vendidas na Loja). A Loja se protege pelo limite de rodadas por pelada. A Loja do evento passa a ter só **2 cartas** (uma cara, uma barata).
- **Estilo campanha do FIFA:** de ~12 a 15 cartas por evento, só 3 ou 4 realmente boas (nível Destino); as simples são recolores de uma arte-base. Cada evento tem seu conjunto, e ao fim do mês as cartas saem dos pacotes para sempre (escassez e valor).
- **Cartas de desempenho individual:** um design-base único por evento, com um selo no topo que distingue o prêmio (estrela, troféu, coroa; o dono escolhe 1 das 5 cartas de Natal como base e pode dar um destaque a mais ao Melhor Jogador do Mês). A **Bola Murcha** continua diferente.
- **Dezembro** é repensado com a dinâmica de pacote ("pacote de presente de Natal" e a Destino nos pacotes). Calma, passo a passo: primeiro a funcionalidade, depois os designs.

## Abertura do pacote (aprovada)
Pacote escuro com borda lima e "RODADA N" treme e solta uma luz **na cor da raridade** (cinza, azul, roxo, dourado); estouro de luz suave; sobe uma carta de costas (metal polido, quadra gravada, marca em relevo); a carta **gira num movimento só** e mostra o **design puro** da skin (sem nome, selo nem estatísticas); aparecem o selo da raridade (tipografia fina), o nome da skin, a chance e, se houver, a proteção de azar ou "Repetida +10 CC". Sem raios atrás da carta (rejeitados). Lendária em câmera lenta, com mais luz, bokeh e confete de folha.
Pendências de acabamento: som e vibração; arte do pacote por evento; na versão real, reflexo e textura **assados em imagem** (nada de `filter`/`mix-blend-mode` dentro da carta, por causa do iPhone).

## Em aberto
- Como o jogador chega ao pacote (no fim da rodada, dentro de "Confira os vencedores", ou guardado para abrir quando quiser) e o que acontece com pacotes não abertos.
- Raridade de cada skin existente e quais entram nos pacotes de dezembro (Destino, Natal, novas).
- Escala da proteção de azar (por pelada ou global) e os números finais.
- Tabelas e regras no banco (pacote por rodada, sorteio no servidor, histórico para a proteção de azar), a tela de coleção e a loja de 2 cartas.
