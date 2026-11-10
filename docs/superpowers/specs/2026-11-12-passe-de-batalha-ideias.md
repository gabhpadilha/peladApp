# Passe de batalha anual (ideias, brainstorming em andamento)

Conversa de 2026-11-12 com o dono do app. **Nada foi construído nem decidido por completo**: é a memória do que já foi combinado e do que falta, para retomar depois.

## Intenção (palavras do dono do app)
Dar sentido ao XP. Hoje o XP só sobe o nível e libera skins da Loja. A ideia: **tirar o XP da liberação de skins** e usá-lo **só no passe**: uma trilha, uma linha com pontos progressivos; ao subir de nível o jogador avança um ponto e cada avanço dá um prêmio (CanchaCoins, pacotes ou skins **não negociáveis**).

## Decidido
- **O XP deixa de liberar skins** na Loja. Só alimenta o passe.
- **Trilha única e longa, anual** (decisão do dono do app: temporada mensal seria "mais uma carga de trabalho para atualizar"). **No fim da temporada, o XP zera** e começa uma trilha nova.
- **A primeira trilha começa já**, contando o XP que cada um acumulou desde outubro de 2026.
- **Prêmios:** CanchaCoins, pacotes e skins **não negociáveis** (não vão ao Mercado; a venda rápida também fica de fora, chamada nossa a confirmar).

## Chamadas minhas (a confirmar com o dono)
- O XP continua vindo do que já vem hoje (jogar, notas, prêmios, gols) e **continua calculado do histórico das rodadas**, sem gravar nada; o passe só conta o XP do período da temporada.
- A **única coisa nova gravada** é o que cada jogador já coletou (tabela de prêmios coletados). Coletar é um toque; os prêmios dos níveis já alcançados ficam esperando.
- **O que zera é o XP e o nível do passe**; moedas, pacotes e skins já coletados ficam para sempre.
- **O selo de nível na carta e no perfil** passa a ser o nível do passe e zera junto com a temporada.
- A trilha precisa de **número fixo de pontos** (chute: 40 a 50) e de um custo de XP definido por ponto (hoje o nível N→N+1 custa `60 + 10N` XP e não tem teto). Calibrar com o XP real da pelada: o jogador mediano chega perto do fim em um ano e o craque completa antes.
- Prêmios maiores (a skin exclusiva, os pacotes melhores) ficam mais para o fim da trilha.

## Em aberto
- **Calendário do ano todo primeiro** (pedido do dono do app): planejar os eventos mês a mês e **projetar onde um jogador mediano e um craque estarão em cada mês** para encaixar prêmios temáticos nos pontos certos (ex.: o prêmio de Natal no ponto em que a galera estará em dezembro). Ponto de partida: `docs/calendario-eventos.md` e `lib/progression.ts` (`COIN_RULES`, `XP_RULES`, curva de nível). Eu me ofereci para ler os dois e trazer um resumo; o dono ainda não respondeu.
- **Quais prêmios e quais os 2 ou 3 grandes** (a pergunta feita e adiada pelo dono: "vamos pensar com calma").
- **Prêmio não coletado no fim da temporada:** some ou tem prazo curto para coletar?
- **Data de fim da temporada** (um ano a partir de quando? Ano-calendário?).
- **Skins fixas da Loja** (Safira, Ametista, Ícone etc.) pedem nível hoje; sem o nível, ficam só no preço em CC ou entram na trilha como prêmio.
- **Quem já tem nível alto** (todos recebem os prêmios dos níveis que já passaram, já que a trilha conta o XP desde outubro?).
- **Economia de CanchaCoins:** os +20 CC por nível de hoje viram prêmio da trilha? Cuidar para não inflar o saldo (a Loja vende pacotes de 200 a 1000 CC e o Mercado depende disso).
- **Tela do passe** (layout da trilha, coleta, o que aparece na Home e no slider): ainda sem protótipo; fazer prévia visual antes de qualquer código, como sempre.
- Ligar também ao que já existe: Objetivos do mês, pacotes, Mercado, venda rápida, patentes.

## Antes de construir
Passar pelo restante do brainstorming (prêmios, calendário, economia), escrever o desenho completo e só então o plano. Regra do projeto: nada de código antes de o dono aprovar o desenho.
