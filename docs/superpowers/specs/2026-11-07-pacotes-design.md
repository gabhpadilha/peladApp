# Pacotes de skins: design (2026-11-07)

Estado: **design APROVADO pelo dono do app em 2026-11-07**, com os parâmetros calibrados da proteção contra azar (M = 20, p = 2, garantia nos últimos 7 dias); a tela mostra a **chance real** do pacote lacrado, com uma linha explicando que a chance das cartas que ainda não saíram sobe ao longo do mês; se um mês falhar, as chances são recalibradas no mês seguinte. Nada está implementado na `main`. O protótipo aprovado da abertura está na branch `spike/pacote-animacao` (`app/auth/previa/pacote/`, componente `PackLab`) e o modo `pure` da `CanchaCard` (só fundo, borda, arte que vaza e itens flutuantes) também só vive lá.

## 1. Intenção
Dar emoção ao fim da rodada e variar a dinâmica do jogo, com uma recompensa surpresa no estilo dos pacotes do FIFA: o jogador abre e pode vir algo muito bom ou algo comum. O Cancha Club é a camada visual de uma pelada real, então **a recompensa é só visual e de coleção**.

**Anti-metas (o que faria isto falhar, mesmo funcionando):**
- Qualquer coisa que mude como a pelada é jogada (escolher time, vetar alguém, bater pênalti, "gincana tipo Kings League"). O futebol real é o que vale.
- Ficar previsível, ou ao contrário, virar um cassino: o jogador tem que sempre saber as chances.
- Virar "salada de skins" em que nenhuma vale nada.
- O criador desenhar uma carta lendária que ninguém nunca tira.

**Não-metas:** troca ou venda entre jogadores, compra de pacote com dinheiro real, mercado interno, comentários no feed sobre pacotes (podem vir depois), pacote que dá XP ou poder de jogo.

## 2. Resumo da mecânica
1. Ao **fechar uma rodada**, **todo jogador que jogou** (esteve presente) ganha **1 pacote com 1 skin**.
2. A **faixa do pacote** depende da **posição do jogador naquela rodada** (nota da rodada, não o acumulado do mês). Cada faixa tem **nome próprio** e **chances próprias**.
3. O **resultado já é sorteado no servidor, na hora do fechamento**, e fica **lacrado**. Abrir é só **revelar**.
4. O pacote pode ser **aberto na hora** (na tela "Sua rodada") ou **guardado** em **Loja → Meus pacotes**, sem prazo. Um **pontinho no ícone da Loja** avisa que há pacote para abrir.
5. O conjunto de skins é o **do mês** da rodada. A **proteção contra azar** sobe devagar ao longo do mês para que, no fim, **todo design do mês tenha saído pelo menos uma vez**.
6. **Repetida** vira moedas, de propósito pouco (CanchaCoins).

**Mínimo para gerar pacote:** a rodada precisa ter o mínimo de jogadores presentes. Hoje **10** (futsal: 2 times completos); quando existirem outros formatos de pelada (society, campo), passa a ser **2 times completos do formato da pelada** (definido no projeto de formatos). Implementar como **parâmetro por pelada**, não como número fixo. Rodadas menores continuam valendo para tudo (OVR, cartas, ranking), só não geram pacote.

## 3. Faixas do pacote e chances
A posição vem da **nota da rodada** de cada jogador (a mesma que decide o Melhor Jogador: `getRoundScore` / `round_score`). **Empate: todos os empatados ficam na mesma faixa**, como na premiação individual.

Faixas (N = quem jogou a rodada):
- **A**: 1º lugar (e empatados).
- **B**: 2º e 3º.
- **D** (últimos): os **30% de baixo** (arredondando para cima), que não estejam em A ou B.
- **C**: todos os outros (meio da tabela).
- Quem ficou sem nota (jogou mas não recebeu notas) entra na **D**.

Chances **iniciais** (rascunho a calibrar com o uso; probabilidades somam 100% por faixa):

| Faixa | Nome (proposta) | Comum | Rara | Épica | Lendária |
|---|---|---|---|---|---|
| A | Pacote Craque | 45% | 33% | 17% | 5% |
| B | Pacote Destaque | 55% | 29% | 12% | 4% |
| C | Pacote Pelada | 64% | 25% | 9% | 2% |
| D | Pacote Reserva | 72% | 21% | 6% | 1% |

A diferença entre A e D na lendária é de 5 vezes, e foi aprovada pelo dono. As chances **aparecem escritas** na tela do pacote e em Meus pacotes. A tabela fica em dados (não espalhada pelo código), para calibrar sem refazer o app.

## 4. Conjunto do mês e proteção contra azar
- Cada **mês** tem um **conjunto de skins exclusivas de pacote** (design de cada uma, raridade). Sugestão de composição: ~12 skins, 1 lendária, 2 a 3 épicas, 3 a 4 raras e o resto comuns; as comuns são recolores de uma arte-base (como Esmeralda, Safira, Ametista e Rubi). **Quais skins entram em dezembro está fora deste documento** (decidido depois, junto com a repaginação de dezembro).
- **O mês do pacote é o da data da rodada** (`matches.played_on`, fuso America/Sao_Paulo), não o dia em que o jogador abre. Pacote de rodada de dezembro só tem skin do conjunto de dezembro, mesmo se aberto em janeiro. **Quem jogou 1 rodada ou 4, ou entrou no meio do mês, participa do mesmo conjunto.**
- No fim do mês as skins **saem dos pacotes para sempre** (escassez). Quem tirou continua com ela.
- **Skins de pacote não são vendidas na Loja.**

**Proteção contra azar (decisão do dono: vale por mês, sobe devagar):** a unidade da garantia é o **design** (uma arte-base). Um design pode ter várias **versões** (por exemplo, recolores da mesma arte): a garantia exige que **pelo menos uma versão de cada design** tenha saído; qual versão sai dentro do design segue as chances normais. *Leitura minha de "uma versão de cada design"; confirme.* A chance de cada design que **ainda não saiu naquela pelada naquele mês** sobe aos poucos durante o mês, para que **no fim do mês cada design tenha saído pelo menos uma vez, para qualquer jogador**. Regras de projeto (os números exatos são do construtor, com simulação):
1. **Escopo:** por pelada (cada pelada sorteia com o próprio histórico do mês). *Esta é uma leitura minha do pedido; confirme.*
2. **Subida lenta:** um multiplicador crescente no peso do design, baixo no começo do mês e forte no fim (função do tempo do mês e/ou do nº de pacotes já sorteados), nunca alterando a raridade nem as faixas.
3. **Garantia de fim de mês:** nas rodadas com **data nos últimos 7 dias do mês** (escolha minha, ajustável), se ainda faltam designs, o sorteio **cobre primeiro os que faltam** (do mais raro ao mais comum) entre os pacotes daquela rodada, quando houver pacotes suficientes; senão, por prioridade de raridade.
4. **Calibração (simulação em `2026-11-07-pacotes-simulacao/`, 4000 pelada-meses por cenário, 10 a 30 jogadores, 1 a 5 rodadas):** multiplicador de peso do design que ainda não saiu `m = 1 + (M − 1) · t²`, com **M = 20** e `t` = fração do mês pela data da rodada, mais a garantia dos últimos 7 dias com teto de 30% dos pacotes da rodada. Com 4 ou mais rodadas no mês, a lendária e todos os designs saem em **99,7% a 100%** das peladas de qualquer tamanho (sem proteção: 63% a 90% a lendária e 30% a 89% todos os designs). Com 3 rodadas: 87% a 99,8%. Com 2: 25% a 92%. Com 1 rodada não há garantia possível. A garantia forçada quase nunca dispara (0,0% a 0,2% dos pacotes): é só uma rede de segurança. A vantagem de quem foi melhor se mantém (lendária por pacote nas faixas A, B, C, D: 4,9, 4,0, 2,0 e 1,0% sem proteção; 6,9, 5,4, 2,5 e 1,2% com).
5. **Limite honesto:** se a pelada fecha poucos pacotes no mês (menos pacotes que designs), a garantia total é impossível; vale a melhor cobertura por prioridade. **O construtor deve simular** (peladas de 6 a 14 jogadores, 2 a 5 rodadas por mês) e ajustar a subida até que a grande maioria cubra o conjunto, sem a subida ficar visível a ponto de "tirar a graça".
6. O estado da proteção **é calculado do histórico de pacotes do mês na pelada** (nada de contador solto para dessincronizar), dentro da mesma transação do sorteio, com trava por pelada para duas rodadas fechando juntas.

## 5. Sorteio lacrado e abertura
- O sorteio roda **no banco, dentro do fechamento da rodada** (junto de `compute_match_awards`, **na mesma transação**: se o sorteio falhar, a rodada não fecha): cria um pacote por jogador presente, com **faixa, mês, raridade e skin já definidos**. Ninguém consegue ler a skin antes de abrir (a tabela não tem leitura direta; só funções devolvem a skin de pacote já aberto).
- **Abrir** é uma função do banco que marca o pacote como aberto, registra a data e devolve o resultado (skin, raridade, se é repetida). É idempotente (abrir de novo devolve o mesmo).
- **Repetida:** a skin é **nova** na primeira vez que o jogador a revela e **repetida** nas seguintes (decidido **na hora de abrir**, na ordem de abertura). Repetida dá **CanchaCoins** fixas (proposta: **10 CC** para comum e rara, **20 CC** para épica e lendária; propositalmente pouco frente às skins da Loja de 200 a 600 CC). Decisão do construtor: como as moedas hoje são derivadas do histórico (nada gravado), somar as das repetidas como mais uma parcela derivada dos pacotes abertos.
- **Posse:** a skin ganha entra na coleção do jogador (Eu → Minhas cartas) e pode ser usada como qualquer skin. Decisão do construtor: usar `card_skin_purchases` (com preço 0 e uma marca de origem "pacote") ou tabela própria, mantendo uma posse por skin por jogador.
- **Pacote guardado não expira.** O sorteio já está feito, então ele pode ser aberto a qualquer momento, inclusive depois que o mês do conjunto acabou.
- **Se um admin excluir uma rodada fechada**, os pacotes dela **ainda lacrados desaparecem** com ela; as skins **já reveladas continuam** com o jogador.
- **Rodadas fechadas antes do lançamento não geram pacote** (começa nas primeiras rodadas fechadas depois de ligar).

## 6. Telas
1. **"Sua rodada"** (o fim da revelação dos vencedores): hoje só aparece para quem ganhou algo; passa a aparecer **para todo jogador que jogou**. Mostra, junto de XP e CanchaCoins, **"Você ganhou o Pacote [nome]"** com as chances da faixa e dois botões: **Abrir agora** e **Guardar**.
2. **Abertura do pacote:** o protótipo aprovado. Pacote escuro com borda lima e "RODADA N" treme e solta uma **luz na cor da raridade**; estouro de luz suave; uma carta de costas (metal polido, quadra gravada em tom sobre tom, marca em relevo) sobe e **gira num só movimento**, mostrando o **design puro** (sem nome, selo nem estatística, sem raios atrás); abaixo, raridade em tipografia fina, nome da skin, chance e, se for o caso, "Repetida · +10 CC" ou a nota da proteção contra azar. Lendária em câmera lenta, com mais luz, bokeh e confete de folha. Respeitar movimento reduzido (versão sem animação). Na versão real, reflexo e textura **assados em imagem** (nada de `filter` ou `mix-blend-mode` dentro da carta, por causa do iPhone) e, se possível, vibração no celular.
3. **Loja → Meus pacotes** (topo da Loja): os pacotes guardados (nome, rodada, mês, chances), **abrir um por vez** e **abrir todos em sequência**. Quando não há, a seção some.
4. **Pontinho na Loja:** no ícone da Loja (barra de baixo no celular e menu no computador), **âmbar**, **ponto** com 1 pacote e **número pequeno** com 2 ou mais. Sai quando o último é aberto. A contagem vem do servidor junto com a sessão do menu.
5. **Loja do evento: só 2 cartas** (uma mais barata e uma mais cara), no lugar de 3. A decisão de **quais** cartas vai para a fase das cartas de dezembro.
6. **Eu → Minhas cartas:** as skins de pacote aparecem como as outras, com a raridade.

## 7. O que o construtor decide
- A função de subida da proteção contra azar e a simulação que a valida (item 4).
- Estrutura de tabelas e funções (pacotes; conjunto do mês com raridade por skin; probabilidades por faixa), RLS (sem leitura direta da skin lacrada), testes de isolamento e de sorteio (distribuição, empate, jogador sem nota, rodada com 5 e com 14 jogadores, fim de mês).
- Onde guardar a posse da skin e como somar as moedas das repetidas.
- Como o menu recebe a contagem de pacotes sem atrasar a navegação.
- Reaproveitar a animação de pacote existente na revelação dos vencedores (`reveal-pack.tsx`) ou substituí-la pelo protótipo.

## 8. Fora deste design (virá depois)
Quais skins e raridades entram em dezembro (Destino, as de Natal, novas), o design-base único das cartas de desempenho individual com o selo no topo, a repaginação de dezembro, e a arte do pacote por evento.

## 9. Escolhas minhas (para o dono conferir)
1. A proteção contra azar vale **por pelada** (leitura do pedido "independente para quem").
2. Nomes das faixas: **Craque, Destaque, Pelada, Reserva**.
3. **Os 30% de baixo** formam a faixa D, e quem ficou sem nota vai para a D.
4. Moedas da repetida: **10 CC** (comum e rara) e **20 CC** (épica e lendária).
5. Skins já reveladas **ficam** se a rodada for excluída; pacotes lacrados dela somem.
6. Pontinho **âmbar**, com número a partir de 2 pacotes.
7. Sem pacote para rodadas fechadas antes do lançamento.
8. A garantia vale por **design** (arte-base), não por cada recolor.
9. "Últimas rodadas do mês" = rodadas com data nos **últimos 7 dias** do mês.
