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
| Novembro/2026 | _a definir_ | 💡 | — |
| Dezembro/2026 | _a definir_ | 💡 | — |
| Janeiro/2027 | _a definir_ | 💡 | — |
| Fevereiro/2027 | _a definir_ | 💡 | — |

Hoje, fora de outubro, não há tema: as cartas especiais voltam ao visual clássico e o slide mostra "Cartas especiais". **Novembro começa sem evento** se nada for decidido até lá.

## Ideias de eventos (para discutir)

Cada ideia pode ter: tema das cartas especiais, 1 ou 2 cartas na Loja e, opcionalmente, uma **regra especial** do mês (o que deixa o evento mais do que só visual).

- 💡 **Novembro: "Black Friday da Pelada".** Regra especial: desconto na Loja por alguns dias (ex.: 30% nas personalizações premium). Tema das cartas em preto e dourado-neon, etiqueta de preço riscado como marca d'água.
- 💡 **Novembro (alternativa): "Reta final do Brasileirão".** Clima de decisão de campeonato: troféu, faixa de campeão, confete. Cartas da Loja tipo "Camisa 10" e "Capitão".
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

- Qual evento entra em **novembro**? (a decidir antes de 01/11)
- Todo mês terá evento, ou só nos meses com data forte (Natal, Carnaval, São João)?
- Cada evento sempre traz 2 cartas na Loja? Mesmo nível e preço do Halloween (nível 3, 200 PC) ou sobe com o tempo?
- Vale ter regras especiais por evento (desconto, Time do Ano, prêmio extra) ou só visual?
