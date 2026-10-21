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
| 01/11 – 30/11/2026 | **Brasileirão + Black Friday** | 🚧 implementado (2026-10-21), entra sozinho em 01/11 | Cores de clube da Série A (a definir quantas) |
| Dezembro/2026 | _a definir_ | 💡 | — |
| Janeiro/2027 | _a definir_ | 💡 | — |
| Fevereiro/2027 | _a definir_ | 💡 | — |

Hoje, fora de outubro, não há tema: as cartas especiais voltam ao visual clássico e o slide mostra "Cartas especiais". **Novembro precisa estar pronto até 01/11** para não começar sem evento.

## Ideias de eventos (para discutir)

Cada ideia pode ter: tema das cartas especiais, 1 ou 2 cartas na Loja e, opcionalmente, uma **regra especial** do mês (o que deixa o evento mais do que só visual).

- 🚧 **Novembro: Brasileirão + Black Friday** (escolhido e aprovado pelo dono do app em 2026-10-21; implementado: tema em `CARD_THEMES`, skins `clube-<clube>` em `CARD_SKINS`, promoção em `lib/shop-sale.ts`):
  - **Loja, personalizações de clube:** uma por clube da Série A, nas cores e no padrão da camisa **com o escudo do clube** (decisão do dono do app em 2026-10-21: uso pessoal entre amigos, sem fins lucrativos; sem escudo ficava genérico, já que vários clubes dividem as cores). Atenção registrada: o site é acessível na internet (com login) e o story do Instagram publica a carta; considerar deixar as cartas de clube fora do story. Arquivos dos escudos: o dono manda ou vêm do Wikimedia Commons conferindo a licença de cada um (não redesenhar à mão). Posição do escudo **✅ escolhida: selo pequeno sob o OVR** (como o clube nas cartas do EA FC), ~17% da largura da carta, à esquerda (12%), **abaixo do fio dourado da posição** (topo a ~35,5% da carta; a 31% encostava na sigla, pedido do dono para descer). Descartada: marca d'água grande. Referências feitas: Rubro-negra (listras horizontais vermelho e preto), Alviverde (verde fechado com fios brancos), Alvinegra (listras verticais preto e branco, metal prata), Tricolor com faixa (branca com faixa vermelha e preta), Grená e verde (listras com fio branco) e Celeste (azul-real com estrelas). Técnica: a carta premium ganha uma camada `--skin-pattern` (degradês em CSS) por baixo do vidro. Lista da Série A 2026 conferida (fonte: 90min, 2026): Athletico-PR, Atlético-MG, Bahia, Botafogo, Chapecoense, Corinthians, Coritiba, Cruzeiro, Flamengo, Fluminense, Grêmio, Internacional, Mirassol, Palmeiras, Red Bull Bragantino, Remo, Santos, São Paulo, Vasco e Vitória. Prévia das 20 camisas ✅ **aprovada** pelo dono do app (2026-10-21); **escudos enviados pelo dono do app** (pôster "Série A 2026", 2026-10-21), recortados sem fundo em `public/clubes/<clube>.png` (o pôster parece feito por IA: Coritiba com "CURCIBLA CLUB"/"CARTIBA", Chapecoense com texto embaralhado e Internacional com "19C1"; trocar por arquivos oficiais desses três antes de publicar). Escudo na carta: `top 35.5%`, `left 11%`, `h 13%`, `w 19%`, `object-contain`. Pedidos do dono: **Corinthians preto com listras finas brancas** (uniforme 2) e **Athletico-PR com listras horizontais**. Na implementação, cada clube vira uma chave própria em `CARD_SKINS` (na prévia todos usavam uma chave só, e o brilho do vidro de um vazava para o outro) e as lâminas usam o metal do clube (prata nos alvinegros). Paletas no apêndice. **Nível 3, 150 PC cada** (✅ dono do app). Não aparecem no story (o story só leva as cartas especiais da rodada).
  - **Cartas especiais, tema "Brasileirão":** **os nomes dos prêmios não mudam no evento** (✅ dono do app, 2026-10-21: só as cores e a taça).  verde, amarelo e azul da bandeira, taça de marca d'água. Visual do mês: Melhor Jogador (apelidado nas prévias de "Craque do Brasileirão") (**sem verde**, o dono não gosta: ✅ **canarinho com moldura azul da bandeira**, face amarela `#ffe24a`→`#e3ab00`, moldura `#1a3fa8`, texto azul `#0b2a78`), Gol da Rodada (azul e amarelo), Time da Semana ("Seleção da Rodada" nas prévias) (✅ **azul-marinho e amarela**: face `#1d3f9e`→`#020b2c`, moldura `#ffd400`, texto `#ffe066`; descartadas preta, branca e bordô), Bola Murcha (vermelho de zona de rebaixamento). ✅ Escolhidas pelo dono do app (2026-10-21): **Drible A, Atacante B, Defensor B, Goleiro A, Fair Play B, Fominha B** (cada opção é moldura · face de → até · texto):
    - Drible: **A** branca e azul (`#1a3fa8` · `#ffffff`→`#d9dee8` · `#0b2a78`) ou **B** azul-celeste (`#f4f6fb` · `#4a9bff`→`#0a2a6b` · `#ffffff`).
    - Atacante: **A** brasa (`#ffd400` · `#ff7a00`→`#7a1d00` · `#fff3c4`) ou **B** amarela e vermelha (`#d1121f` · `#ffe24a`→`#f0a000` · `#7a0b13`).
    - Defensor: **A** marinho e prata (`#c9ced6` · `#24344f`→`#060b16` · `#e9eef5`) ou **B** chumbo e amarela (`#ffd400` · `#3a3f47`→`#0d0f12` · `#ffe066`).
    - Goleiro: **A** preta e azul (`#2f6bff` · `#1b1b1f`→`#000000` · `#cfe0ff`) ou **B** azul-real e branca (`#ffffff` · `#2448b8`→`#071648` · `#ffffff`).
    - Fair Play: **A** branca e dourada (`#d2af66` · `#ffffff`→`#ebe5d6` · `#5a4416`) ou **B** azul-claro (`#ffffff` · `#c4e2ff`→`#6aa8e8` · `#0b2a78`).
    - Fominha: **A** mostarda (`#8a6a1a` · `#d89a00`→`#6b4a00` · `#fff1c2`) ou **B** pipoca (`#7a3b00` · `#ffcf6b`→`#e07b00` · `#4a2200`).
    - Já definidos: Gol da Rodada (`#ffd400` · `#1d4fb8`→`#03113a` · `#ffe56b`) e Bola Murcha (`#7c7f86` · `#8f1022`→`#2a0308` · `#ffd5da`).
  - **Black Friday (✅ aprovada, 30%, o mês inteiro: 01/11 a 30/11):** desconto de 30% nas personalizações premium **e nas de clube** (✅ dono do app, 2026-10-21), com faixa preta "Black Friday · -30%" na Loja e preço riscado (250 → 175).
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

- Novembro: trocar os escudos com erro (Coritiba, Chapecoense, Internacional) pelos oficiais.
- Todo mês terá evento, ou só nos meses com data forte (Natal, Carnaval, São João)?
- Cada evento sempre traz 2 cartas na Loja? Mesmo nível e preço do Halloween (nível 3, 200 PC) ou sobe com o tempo?
- Vale ter regras especiais por evento (desconto, Time do Ano, prêmio extra) ou só visual?

## Apêndice: paletas das camisas (rascunho de novembro)

Variáveis CSS testadas na prévia de 2026-10-21 sobre a `PremiumPlayerCard` (com uma camada `--skin-pattern` por baixo do vidro). O padrão fica forte em cima (atrás da foto) e esmaece embaixo (`SHADE`/`LIGHT_SHADE`) para o apelido e os atributos ficarem legíveis.

```ts
const SHADE = "linear-gradient(180deg,rgb(0 0 0 / 0) 0 44%,rgb(0 0 0 / 0.82) 66%)";
const LIGHT_SHADE = "linear-gradient(180deg,rgb(255 255 255 / 0) 0 44%,rgb(255 255 255 / 0.92) 64%)";
const SILVER = "linear-gradient(155deg,#ffffff 0%,#b8bcc2 16%,#f3f4f6 30%,#5c6066 48%,#d6d9dd 64%,#3f4247 82%,#e5e7ea 100%)";
const dark = (mid: string, deep: string, light: string, text = "#f6efdc") => ({ "--skin-mid": mid, "--skin-deep": deep, "--skin-end": "#000", "--skin-light": light, "--skin-text": text });
const white = (text: string) => ({ "--skin-mid": "#ffffff", "--skin-deep": "#eceae4", "--skin-end": "#cfc9bb", "--skin-light": "#ffffff", "--skin-text": text });
const stripesH = (a: string, b: string, size = 9) => `${SHADE}, repeating-linear-gradient(180deg,${a} 0 ${size}%,${b} ${size}% ${size * 2}%)`;
const stripesV = (a: string, b: string, size = 10) => `${SHADE}, repeating-linear-gradient(90deg,${a} 0 ${size}%,${b} ${size}% ${size * 2}%)`;

type Club = { name: string; kit: string; crest: string; vars: Record<string, string> };
const CLUBS: Club[] = [
  { name: "Athletico-PR", kit: "listras horizontais vermelho e preto", crest: "#c8102e", vars: { ...dark("#8a0d1c", "#140205", "#ff5468"), "--skin-pattern": stripesH("#c8102e", "#0c0c0c", 7.5) } },
  { name: "Atlético-MG", kit: "listras verticais preto e branco", crest: "#111", vars: { ...dark("#2a2a2a", "#050505", "#fff", "#fff"), "--card-gold": SILVER, "--skin-pattern": stripesV("#111", "#eeeeee", 8) } },
  { name: "Bahia", kit: "branca, faixa azul e vermelha", crest: "#0039a6", vars: { ...white("#0b2a78"), "--skin-pattern": `${LIGHT_SHADE}, linear-gradient(120deg,transparent 0 44%,#0039a6 44% 52%,#d1121f 52% 58%,#0039a6 58% 66%,transparent 66%)` } },
  { name: "Botafogo", kit: "listras verticais preto e branco largas", crest: "#111", vars: { ...dark("#2a2a2a", "#050505", "#fff", "#fff"), "--card-gold": SILVER, "--skin-pattern": stripesV("#eeeeee", "#111", 12) } },
  { name: "Chapecoense", kit: "verde com fios brancos", crest: "#0b8f3a", vars: { ...dark("#0b7d36", "#02200d", "#6dffa6"), "--skin-pattern": `${SHADE}, repeating-linear-gradient(90deg,transparent 0 14%,rgb(255 255 255 / 0.25) 14% 15%)` } },
  { name: "Corinthians", kit: "preta com listras finas brancas (uniforme 2)", crest: "#111", vars: { ...dark("#1c1c1c", "#030303", "#fff", "#fff"), "--card-gold": SILVER, "--skin-pattern": `${SHADE}, repeating-linear-gradient(90deg,transparent 0 9%,rgb(255 255 255 / 0.55) 9% 9.8%)` } },
  { name: "Coritiba", kit: "branca com faixas verdes", crest: "#006b3f", vars: { ...white("#06432a"), "--skin-pattern": `${LIGHT_SHADE}, repeating-linear-gradient(180deg,transparent 0 14%,#0b6b3f 14% 19%)` } },
  { name: "Cruzeiro", kit: "azul-real com estrelas", crest: "#0033a0", vars: { ...dark("#0a3aa8", "#020c33", "#7fb0ff", "#f2f4ff"), "--skin-pattern": "radial-gradient(circle at 78% 18%,#fff 0 1.2%,transparent 1.4%),radial-gradient(circle at 86% 26%,#fff 0 1%,transparent 1.2%),radial-gradient(circle at 72% 30%,#fff 0 1%,transparent 1.2%),radial-gradient(circle at 80% 36%,#fff 0 0.9%,transparent 1.1%),radial-gradient(circle at 88% 40%,#fff 0 0.7%,transparent 0.9%)" } },
  { name: "Flamengo", kit: "listras vermelhas e pretas", crest: "#c8102e", vars: { ...dark("#7d0b1b", "#120205", "#ff4d5e"), "--skin-pattern": stripesH("#a3121f", "#0b0b0b", 9) } },
  { name: "Fluminense", kit: "grená, verde e fio branco", crest: "#7a1631", vars: { ...dark("#5a1023", "#14030a", "#ff8aa5"), "--skin-pattern": `${SHADE}, repeating-linear-gradient(90deg,#7a1631 0 8%,#f2f2f2 8% 9%,#00613c 9% 17%,#f2f2f2 17% 18%)` } },
  { name: "Grêmio", kit: "azul-celeste, preto e fio branco", crest: "#0d80bf", vars: { ...dark("#0b5f8f", "#02121e", "#7fd0ff"), "--skin-pattern": `${SHADE}, repeating-linear-gradient(90deg,#0d80bf 0 8%,#0b0b0b 8% 15%,#f2f2f2 15% 16%)` } },
  { name: "Internacional", kit: "vermelha com detalhes brancos", crest: "#d1121f", vars: { ...dark("#a10f1c", "#1f0205", "#ff6b78"), "--skin-pattern": `${SHADE}, linear-gradient(180deg,transparent 0 90%,rgb(255 255 255 / 0.85) 90% 91%,transparent 91%)` } },
  { name: "Mirassol", kit: "amarela com detalhes verdes", crest: "#f2c500", vars: { "--skin-mid": "#ffd83a", "--skin-deep": "#e0aa00", "--skin-end": "#a87a00", "--skin-light": "#fff6b0", "--skin-text": "#0b3d21", "--skin-pattern": `${LIGHT_SHADE}, linear-gradient(180deg,transparent 0 91%,#0b6b3f 91%)` } },
  { name: "Palmeiras", kit: "verde com fios brancos", crest: "#006437", vars: { ...dark("#0a6b3a", "#02200f", "#5ff0a2"), "--skin-pattern": `${SHADE}, repeating-linear-gradient(90deg,transparent 0 11%,rgb(255 255 255 / 0.22) 11% 11.8%)` } },
  { name: "Bragantino", kit: "branca com detalhes vermelhos", crest: "#d1121f", vars: { ...white("#9e0f1c"), "--skin-pattern": `${LIGHT_SHADE}, linear-gradient(160deg,transparent 0 60%,#d1121f 60% 64%,transparent 64%)` } },
  { name: "Remo", kit: "azul-marinho", crest: "#0b1f4d", vars: { ...dark("#122a63", "#02081a", "#7f9eff"), "--skin-pattern": `${SHADE}, repeating-linear-gradient(135deg,transparent 0 6%,rgb(255 255 255 / 0.05) 6% 7%)` } },
  { name: "Santos", kit: "branca, toda limpa", crest: "#111", vars: { ...white("#111111"), "--skin-pattern": `${LIGHT_SHADE}, repeating-linear-gradient(90deg,transparent 0 24%,rgb(0 0 0 / 0.05) 24% 25%)` } },
  { name: "São Paulo", kit: "branca com faixa vermelha e preta", crest: "#d1121f", vars: { ...white("#1a1a1a"), "--skin-pattern": "linear-gradient(180deg,transparent 0 30%,#c8102e 30% 36%,#111 36% 42%,#c8102e 42% 48%,transparent 48%)" } },
  { name: "Vasco", kit: "preta com faixa diagonal branca", crest: "#111", vars: { ...dark("#262626", "#050505", "#fff", "#fff"), "--card-gold": SILVER, "--skin-pattern": `${SHADE}, linear-gradient(125deg,transparent 0 40%,#efefef 40% 52%,transparent 52%)` } },
  { name: "Vitória", kit: "listras vermelhas e pretas largas", crest: "#c8102e", vars: { ...dark("#8a0d1c", "#140205", "#ff5468"), "--skin-pattern": stripesH("#c4161f", "#0c0c0c", 12) } },
];
```
