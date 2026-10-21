# Calendário de eventos e cartas futuras

Memória de planejamento do PeladApp: eventos temáticos dos próximos meses, ideias de cartas e o que ficou combinado com o dono do app. **Leia antes de criar evento, tema sazonal ou carta nova** e atualize aqui quando algo for decidido, aprovado ou descartado.

Legenda de status: 💡 ideia (em discussão) · ✅ aprovado (pode implementar) · 🚧 em andamento · 🟢 no ar · ❌ descartado.

## Como um evento funciona hoje

Um evento mexe em três lugares (detalhes técnicos em `CLAUDE.md` e no `.claude/rules/design-system.md`):

1. **Tema das cartas especiais** (`CARD_THEMES` em `lib/card-themes.ts`): no período do evento, todas as cartas especiais da rodada vestem o tema (cores e marca d'água próprias por prêmio). O tema fica gravado na carta para sempre.
2. **Cartas de evento na Loja** (`CARD_SKINS` com `event` em `types/card-skin.ts`): personalizações da própria carta, à venda **só durante o evento daquele ano**; quem comprou continua usando depois.
3. **Slide na home** (`NewsSlider`): o 1º slide mostra o evento do mês e o da Loja mostra as cartas do evento.

Regras de visual que valem para todo evento: sem `filter` e sem `mix-blend-mode` nas cartas (quebram no iPhone), detalhes mínimos (o dono acha enfeite demais "cartunesco"), prévia visual aprovada antes de implementar.

## Calendário

| Período | Evento | Status | Cartas na Loja |
|---|---|---|---|
| 01/10 – 31/10/2026 | **Halloween** | 🟢 no ar | Lobisomem e Vampiro (nível 3, 200 PC) |
| 01/11 – 30/11/2026 | **Brasileirão + Black Friday** | 💡 referências enviadas (2026-10-21) | Cores de clube da Série A (a definir quantas) |
| Dezembro/2026 | _a definir_ | 💡 | — |
| Janeiro/2027 | _a definir_ | 💡 | — |
| Fevereiro/2027 | _a definir_ | 💡 | — |

Hoje, fora de outubro, não há tema: as cartas especiais voltam ao visual clássico e o slide mostra "Cartas especiais". **Novembro precisa estar pronto até 01/11** para não começar sem evento.

## Ideias de eventos (para discutir)

Cada ideia pode ter: tema das cartas especiais, 1 ou 2 cartas na Loja e, opcionalmente, uma **regra especial** do mês (o que deixa o evento mais do que só visual).

- 💡 **Novembro: Brasileirão + Black Friday** (escolhido pelo dono do app em 2026-10-21; referências visuais enviadas, aguardando aprovação):
  - **Loja, personalizações de clube:** uma por clube da Série A, nas cores e no padrão da camisa **com o escudo do clube** (decisão do dono do app em 2026-10-21: uso pessoal entre amigos, sem fins lucrativos; sem escudo ficava genérico, já que vários clubes dividem as cores). Atenção registrada: o site é acessível na internet (com login) e o story do Instagram publica a carta; considerar deixar as cartas de clube fora do story. Arquivos dos escudos: o dono manda ou vêm do Wikimedia Commons conferindo a licença de cada um (não redesenhar à mão). Posição do escudo **✅ escolhida: selo pequeno sob o OVR** (como o clube nas cartas do EA FC), ~17% da largura da carta, à esquerda (12%), **abaixo do fio dourado da posição** (topo a ~35,5% da carta; a 31% encostava na sigla, pedido do dono para descer). Descartada: marca d'água grande. Referências feitas: Rubro-negra (listras horizontais vermelho e preto), Alviverde (verde fechado com fios brancos), Alvinegra (listras verticais preto e branco, metal prata), Tricolor com faixa (branca com faixa vermelha e preta), Grená e verde (listras com fio branco) e Celeste (azul-real com estrelas). Técnica: a carta premium ganha uma camada `--skin-pattern` (degradês em CSS) por baixo do vidro. A lista dos 20 clubes da Série A 2026 precisa ser conferida antes.
  - **Cartas especiais, tema "Brasileirão":** verde, amarelo e azul da bandeira, taça de marca d'água. Nomes do mês: Melhor Jogador → "Craque do Brasileirão" (**sem verde**, o dono não gosta: ✅ **canarinho com moldura azul da bandeira**, face amarela `#ffe24a`→`#e3ab00`, moldura `#1a3fa8`, texto azul `#0b2a78`), Gol da Rodada → "Gol de Placa" (azul e amarelo), Time da Semana → "Seleção da Rodada" (✅ **azul-marinho e amarela**: face `#1d3f9e`→`#020b2c`, moldura `#ffd400`, texto `#ffe066`; descartadas preta, branca e bordô), Bola Murcha → "Rebaixado (Z4)" (vermelho de zona de rebaixamento). Os outros prêmios a definir (ideias: Drible → "Pedalada", Atacante → "Artilheiro", Defensor → "Muralha", Goleiro → "Paredão", Fominha → "Fominha da arquibancada").
  - **Black Friday (✅ aprovada, 30%):** desconto de 30% nas personalizações premium por um período, com faixa preta "Black Friday · -30%" na Loja e preço riscado (250 → 175).
- 💡 **Dezembro: "Natal e Retrospectiva".** Tema natalino discreto (vermelho e verde-pinheiro, neve leve). Regra especial: **Time do Ano** da pelada (as maiores médias de 2026, como o TOTY da EA FC), carta especial única distribuída no fim do ano, e uma tela de "Retrospectiva" (jogos, melhor rodada, prêmios de cada um).
- 💡 **Janeiro: "Verão".** Praia, pôr do sol, futevôlei. Cartas da Loja em tons de areia e mar.
- 💡 **Fevereiro: "Carnaval".** Purpurina, serpentina, máscara de carnaval como marca d'água. Prêmio zoeira do mês pode ganhar fantasia.
- 💡 **Abril: "Páscoa".** Chocolate e dourado; ovo de Páscoa como pacote da revelação.
- 💡 **Junho: "Festa Junina / Arraiá".** Xadrez, bandeirinhas, fogueira. Carta "Quadrilha" e "Caipira" na Loja.

## Cartas futuras (ideias para a Loja)

- 💡 **Cartas animadas** (ideia do dono do app, 2026-10-21; **para quando a galera estiver em níveis mais altos**). Três estilos já testados numa prévia com a carta Ícone, só com rotação e contorno SVG, sem `filter` (seguro para o iPhone):
  - **A · Anel dourado:** dois anéis girando em volta da carta em sentidos opostos (tracejado com pontos de luz + pontilhado fino).
  - **B · Órbita:** anel inclinado como o de Saturno; um brilho dourado passa por trás da carta e volta pela frente (efeito 3D).
  - **C · Brilho na moldura:** luz dourada correndo pela borda da carta.
  - A decidir: virar item próprio ("Personalização animada", combinável com qualquer carta premium) ou exclusivo de uma carta; animar só onde a carta aparece grande (perfil, "minha carta", Loja, story) e deixar parada nas listas; com "reduzir movimento" no celular, fica parada.
  - Antes de implementar: pesquisar bibliotecas gratuitas de animação/UI (ex.: Motion/Framer Motion, já planejada no projeto; Lottie) e testar no iPhone de verdade.
- 💡 Foto especial ou dinâmica por carta (já estava nos próximos passos).

## Decisões já tomadas

- Cartas de evento ficam à venda só durante o evento daquele ano e não voltam sozinhas no ano seguinte; quem comprou continua usando (2026-10-21).
- A Loja vende **personalização da própria carta**, não cartas novas: por isso a seção fixa se chama "Personalização premium" (2026-10-21).
- Halloween 2026: Lobisomem com o lobo desenhado pelo dono do app (marca d'água por cima da lua) e Vampiro com morcegos contra a lua de sangue (2026-10-21).

## Perguntas em aberto

- Novembro: quantos clubes (todos os 20 da Série A?), nível e preço das personalizações de clube, período e tamanho do desconto da Black Friday (o mês todo ou só a última semana?) e se o desconto vale também para as cartas de clube.
- Todo mês terá evento, ou só nos meses com data forte (Natal, Carnaval, São João)?
- Cada evento sempre traz 2 cartas na Loja? Mesmo nível e preço do Halloween (nível 3, 200 PC) ou sobe com o tempo?
- Vale ter regras especiais por evento (desconto, Time do Ano, prêmio extra) ou só visual?
