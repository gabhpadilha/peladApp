# Cartas com identidade própria (design)

**Data:** 2026-10-28 · **Branch de testes:** `feat/card-identity-redesign` (nunca direto na `main`)
**Rascunhos aprovados:** imagens em `docs/superpowers/specs/2026-10-28-cartas-assets/` (rascunhos 4 a 12).

## Por que

A carta de hoje é parecida demais com a do EA FC: escudo com ponta, seis siglas em fileira (VEL, CHU, PAS…), faixas Bronze/Prata/Ouro. O dono do app quer **sair da cópia** (inclusive pelo risco jurídico) e ter uma **identidade própria**, sem perder o que a carta faz pelo jogador: **massagear o ego**. A carta tem que parecer uma carta premium de colecionador (Panini Prizm, Donruss, cartas de NBA), com o jogador como protagonista.

Segundo motivo: **variedade por anos**. Todo mês tem evento (Halloween, Brasileirão…), prêmios (Melhor Jogador, Time da Semana, Time do Mês) e skins da Loja. O formato novo precisa aguentar uma arte nova por mês sem cair na mesmice e sem perder a identidade.

## Objetivos

1. Carta **retangular de baralho** (proporção 5:7, como Trunfo/Magic), com cara de carta premium.
2. **Foto como protagonista** e **integrada** à arte (nada de "colagem").
3. **Estatísticas próprias:** 3 números no lugar das 6 siglas.
4. **Patentes** no lugar de Bronze/Prata/Ouro.
5. Um **esqueleto fixo** (a identidade) e uma **roupa trocável** (a variedade).
6. Loja continua vendendo **skins completas**, agora no visual novo.
7. Compartilhar **"minha carta hoje"** nos stories.

## Não objetivos

- Não muda a **votação**: continuam as 6 notas por jogador (linha e goleiro), a tela de notas e a mesa tática.
- Não muda o **cálculo do OVR** (média dos 5 melhores atributos, `lib/ovr.ts`), XP, nível, CanchaCoins, prêmios, regras de rodada.
- Não vende peças soltas (moldura, fundo, aura) na Loja. Foi testado nos rascunhos e descartado pelo dono: **só skins completas**.
- Não coleta assinatura do jogador (descartado).
- Sem a logo ou o nome "Cancha Club" na carta (descartado: ficava imperceptível). O nome do app aparece **só no story**.

## Anti-objetivos (fracassa mesmo funcionando se…)

- Parece uma carta do EA FC com outra cor (escudo, fileira de 6 siglas, layout TOTS).
- A foto parece recortada e colada por cima do fundo.
- As estatísticas cobrem o rosto ou o jogador fica pequeno.
- Quebra no iPhone (faixas, blocos, máscara ignorada).
- Algo do status (patente, estatísticas) passa a ser comprável.

## Restrições

- **Projeto sem custos:** só ferramentas gratuitas. Os fundos de exemplo foram gerados por código (SVG → WebP com `sharp`, que o app já usa).
- **iPhone (ver `.claude/rules/design-system.md`):** nada de `filter`, `mix-blend-mode` nem máscara com a URL da foto nas cartas. Por isso **efeitos ricos viram imagem** (fundos e luzes "assados" em WebP), e o CSS só empilha camadas.
- Mobile-first: a carta precisa funcionar de ~32px (miniatura do ranking) até ~300px (Loja, story). Tudo escala por `cqw`, como hoje.
- `prefers-reduced-motion`: animações (brilhos, aura) param.

## O que foi decidido (pelo dono do app)

### 1. Esqueleto fixo (a identidade, nunca muda)

De cima para baixo (rascunhos 4, 9 e 11):

- **Formato retangular 5:7**, moldura de metal com **cantos chanfrados** e um **fio de metal claro** por dentro.
- **Barra do nome no topo:** apelido grande (`font-display`) e embaixo "POSIÇÃO · NÍVEL N" (o nível fica aqui, não no rodapé). Com **respiro** em relação à borda de cima (rascunho 11: barra ~16% da altura, apelido afastado do canto chanfrado).
- **Selo da patente** no canto superior direito: o **OVR** e a **insígnia** da patente (ver item 3). Mesmo formato de hoje do selo (pentágono), na cor da patente.
- **Foto recortada grande**, ocupando a carta na largura, sumindo num degradê antes do rodapé.
- **Faixa** logo acima do rodapé: nome da patente (carta base) ou do prêmio/evento (cartas especiais).
- **Rodapé com as 3 estatísticas** (número grande, nome embaixo, divisórias).
- Sem logo, sem bandeira, sem escudo de clube (exceto nas skins de clube, ver "Fica para quem constrói").

### 2. Estatísticas: 3 números calculados das 6 notas

A votação não muda. A carta mostra a média de pares de atributos (cada atributo já é a média das avaliações que contam, como hoje):

| Linha | = | Goleiro | = |
|---|---|---|---|
| **Ataque** | velocidade + chute | **Paredão** | reflexo + elasticidade |
| **Criação** | passe + drible | **Leitura** | posicionamento + saída do gol |
| **Defesa** | defesa + físico | **Saída** | reposição + jogo com os pés |

Os nomes foram escolhidos pelo dono (descartados: "Gol, Ginga e Raça", "Faro, Toque e Pegada"). As 6 siglas continuam existindo **fora da carta** (tela de notas, barras de atributos no perfil), porque é nelas que se vota.

### 3. Patentes no lugar de Bronze/Prata/Ouro

Sobem pelo **OVR, com os mesmos cortes de hoje** (`CARD_TIER_MIN_OVR`), mais uma patente para quem ainda não tem OVR:

| Patente | Quando | Insígnia no selo |
|---|---|---|
| **Peneira** | sem OVR ainda | divisa tracejada, selo cinza |
| **Base** | OVR < 65 | 1 divisa, selo verde |
| **Profissional** | 65 a 74 | 2 divisas, selo lima |
| **Seleção** | 75 a 84 | estrela, selo dourado |
| **Lenda** | 85 ou mais | coroa, selo holográfico |

A patente **nunca** depende da skin: o selo e a faixa vêm do OVR em qualquer carta.

### 4. Integração da foto (a receita da "carta rica", rascunho 9)

Camadas, de trás para frente:

1. **Fundo artístico** (imagem WebP) com um clarão atrás da cabeça.
2. **Halo da silhueta:** luz suave que acompanha o contorno do jogador por trás.
3. **Foto recortada maior**, presa embaixo (o peito some no degradê). A cabeça pode invadir a barra do nome quando o recorte tiver pouco espaço acima da cabeça.
4. **Luz de contorno (rim light)** desenhada na borda da pessoa (ombros, rosto).
5. **Uma luz só:** tom de cor do tema e vinheta escura por cima da foto **e** do fundo juntos.
6. **Na frente:** feixe de luz diagonal, estrelinhas piscando e pontos de luz.
7. Degradê para o rodapé.

Cada roupa só informa a **cor da luz** (RGB); halo, vinheta e partículas puxam essa cor.

**Halo e luz de contorno são imagens geradas a partir do recorte**, no servidor, de graça (`sharp`), no mesmo momento em que a foto é enviada (`uploadPlayerPhoto`). O protótipo está em `2026-10-28-cartas-assets/prototipos/rich.cjs` (função `rim`) e o halo é o alfa do recorte com desfoque.

### 5. Roupas (a variedade)

Tudo fora do esqueleto muda à vontade: metal da moldura, arte do fundo, cor da luz, cor das barras, fonte do nome, enfeites na frente, animação em volta.

- **Prêmios:** cada prêmio tem a sua roupa e continua vestindo o tema do mês (como hoje em `lib/card-themes.ts`). Direção dos rascunhos: Melhor Jogador = **mármore negro e ouro**; Time da Semana = **estilhaços azul e ouro**; Time do Mês = **cristais**; destaques (Gol, Foguete, Drible…) = **mosaico prisma**; Jogador do Ano (futuro) = **holográfica com raios vazando**.
- **Eventos:** cada mês, uma arte nova de fundo + metal + cor de luz (Halloween, Brasileirão, Natal…). As artes podem vir do **Claude Design** ou de código, sempre como **imagem**.
- **Fundos artísticos já prototipados** (rascunho 8): cristais, mosaico prisma, mármore, curvas de nível (a cara do Cancha, boa para a padrão), estilhaços, meio-tom, aurora, folha holográfica e os de "energia" (turquesa, rubi, ametista). Gerador em `prototipos/gen.cjs` e `prototipos/rich.cjs`.

### 6. Loja: skins completas (rascunho 12)

- Igual à Loja de hoje no funcionamento: seções **Evento** (com prazo) e **Personalização premium** (para sempre), preço em CanchaCoins, liberação por nível, folha de compra com saldo antes → depois e "Comprar e usar", e **Eu → Minhas cartas** com "Em uso"/"Usar".
- Cada skin é a **carta inteira montada** (moldura + fundo + cor da luz).
- **Skins animadas** (borda com raio girando, brilho etc.) são as mais caras, topo da Loja.
- A skin em uso substitui a carta padrão em todo o app (ranking, mesa tática, perfil, Início), como hoje. Nunca muda patente nem estatísticas.

### 7. Compartilhar "minha carta hoje" (rascunho 5)

Botão em **Eu → Minha carta** (e "Compartilhar" no Início): story 9:16 com a carta atual (com a skin), patente, nível e rodadas jogadas, e "Carta feita no Cancha Club" no rodapé. Mesmo mecanismo do story das cartas especiais (`award-story.tsx`, `modern-screenshot`, `navigator.share` ou "Baixar imagem"). Animação aparece parada.

### 8. O resto do app

Cores, navegação, textos e telas ficam como estão (rascunho 10); só as cartas mudam. Textos que falam de faixa viram patente ("Próxima faixa" → "Próxima patente").

## Onde mexe (mapa para quem constrói)

- `components/player-card.tsx` (`PlayerCard`, `PremiumPlayerCard`, `PlayerCardDefs`, `LevelSeal`): o centro da mudança.
- `lib/card-tier.ts` → patentes (mesmos cortes, + Peneira). Usado em `tier-progress.tsx`, `my-card-summary.tsx`, `athlete-hero.tsx`, `reveal-rewards.tsx`, `ovr-badge.tsx`.
- Novo cálculo das 3 estatísticas (ao lado de `lib/ovr.ts`/`types/player.ts`; `ATTRIBUTE_LABELS` continua para a votação).
- `types/card-skin.ts` + tokens no `app/globals.css`: skins no formato novo.
- `types/award.ts`, `lib/card-themes.ts`, `lib/award-bonus.ts`: roupas dos prêmios e temas.
- `app/elenco/_actions/upload-player-photo.ts`: gerar e guardar halo e luz de contorno junto com o recorte.
- `app/jogadores/[id]/_components/award-story.tsx` e `share-award-button.tsx`: base para o story "minha carta".
- Telas que mostram cartas: Início (`my-card-summary`, `news-slider`, ranking), mesa tática, revelação de vencedores, Coleção, Loja, Eu.
- `.claude/rules/design-system.md` e `CLAUDE.md`: reescrever as seções de carta quando for para a `main`.

## Decisões que tomei (o Claude), para o dono conferir

- **Cartas especiais já ganhas** passam a aparecer no visual novo. Os dados delas continuam congelados (OVR, atributos, tema do mês); só o desenho muda, e as 3 estatísticas saem dos 6 atributos guardados.
- **Ordem de construção na branch**, cada etapa testável sozinha:
  1. esqueleto novo + 3 estatísticas + patentes, na carta padrão;
  2. integração da foto (halo e luz de contorno gerados no envio + script para as fotos antigas);
  3. skins da Loja no formato novo;
  4. roupas dos prêmios e do evento do mês;
  5. story "minha carta hoje".

## Fica para quem constrói (decisões técnicas)

- Arredondamento das 3 estatísticas e o que mostrar quando um dos dois atributos ainda não tem nota (sugestão: usar o que existir; sem nenhum, "–").
- Como guardar halo e luz de contorno (arquivos ao lado do recorte em `player-photos/<memberId>/`) e um script para gerar os das fotos já enviadas.
- Cor da luz de contorno: a imagem não pode ser tingida por CSS no iPhone. Sugestão: luz de contorno neutra (branca/quente) com opacidade por roupa; ou gerar no servidor nas poucas cores usadas.
- Onde ficam os fundos (sugestão: `public/cartas/fundos/*.webp`) e o script gerador versionado (como `scripts/generate-pwa-icons.mjs`).
- Tamanhos mínimos: o que some na miniatura (brilhos, partículas, faixa) para a carta continuar legível em 32–60px.
- Skins de clube (Brasileirão): como o escudo entra no esqueleto novo (sugestão: pequeno, na faixa ou abaixo do selo).
- Antes de ir para a `main`: prévia no celular (iPhone no WebKit do Playwright), `type-check`, `lint`, `build`, e o ok do dono.

## Redesign carta a carta (decisões do dono do app)

Ordem combinada: carta base → 7 skins premium → Lobisomem e Vampiro → molde das skins de clube → visuais dos prêmios (Melhor Jogador, destaques, Time da Semana, Bola Murcha, Time do Mês) nos temas Clássica, Halloween e Brasileirão.

- **Carta base (2026-10-29): Grafite fosco.** Moldura grafite lisa, fundo cinza-escuro fosco com textura de papel (`fosco-grafite.webp`), sem clarão, estrelinhas, feixe de luz nem degradê na borda; só o selo da patente tem cor, lisa. "Menos premium" de propósito, para as skins parecerem um passo acima. Descartados: curvas de nível, grafite com fio lima brilhante, quadra noturna, quadra fosca e cartão cru.
- **Skins premium (2026-10-29): fundo lapidado + moldura lisa na cor da pedra, sem estrelinhas.** Definido na Esmeralda (descartados: veludo e gramado; moldura com degradê de ouro/prata) e estendido às 7: Esmeralda (verde), Safira (azul), Ametista (roxa), Rubi (vermelha), Turquesa (verde-água), Ônix (preta, fio prateado) e Ícone (branca perolada). Fundos `gema-<pedra>.webp`, gerados por `prototipos/gemas.cjs`. A diferença entre elas é a cor; um detalhe extra de raridade para as mais caras fica para depois.
- **Halloween 2026 (2026-10-29): Lobisomem e Vampiro.** Moldura lisa e sem estrelinhas, como as premium; o fundo conta o evento. Lobisomem: noite azul, lua cheia atrás da cabeça, o lobo desenhado pelo dono do app como sombra olhando a lua, arranhões e névoa, moldura prata. Vampiro: veludo bordô adamascado, lua de sangue com morcegos, gotas no topo, moldura vinho. Fundos `skin-<nome>.webp`, gerados por `prototipos/halloween.cjs`.
- **Prêmio · Melhor Jogador, Clássica (2026-10-29): taça ao lado.** Preto escovado com a taça dourada (contorno e brilho) no canto direito, ao lado do jogador e abaixo do selo; moldura de ouro lisa, sem estrelinhas. Descartados: mármore negro, raios dourados e a taça grande atrás do jogador. Fundo `premio-craque.webp`, gerado por `prototipos/craque.cjs`. Halloween e Brasileirão vestem por cima depois.
- **Prêmios reduzidos (2026-10-29, regra do jogo).** Os prêmios das estatísticas passam a seguir as 3 da carta: **Melhor Atacante** (maior média de Ataque = velocidade + chute), **Mais Criativo** (Criação = passe + drible, chave nova `criativo`) e **Melhor Defensor** (Defesa = defesa + físico), só linha. Saem Foguete, Garçom, Drible e Motor e também o **Time da Semana** ("com um prêmio por função, perde o sentido"); as cartas já ganhas ficam na coleção. Continuam: Melhor Jogador, Melhor Goleiro, Gol da Rodada (voto), Bola Murcha e Time do Mês. Migrations `20261029120000_creative_award_kind` e `20261029120100_card_stat_awards`, **escritas e validadas em PGlite, ainda não aplicadas** (o app local usa o banco de produção): aplicar só quando a branch for para a `main`, com o ok do dono, e rodar `npm run db:types` depois.
- **Destaques (proposta, 2026-10-29):** o ícone do prêmio grande ao lado do jogador, como a taça do Melhor Jogador, e a carta vestindo o evento do mês (Clássica azul; Halloween roxo com o fantasma; Brasileirão azul e amarelo com a taça). Gerador `prototipos/destaques.cjs`. Aguarda aprovação, agora para os 5 destaques que sobraram (Atacante, Criativo, Defensor, Goleiro, Gol).
- **Brasileirão fora (2026-10-29):** o dono do app vai seguir outro caminho em novembro. Saíram do código o tema "Brasileirão" dos prêmios (`CARD_THEMES`, tokens `--award-*-brasileirao-*`, visuais e marcas d'água), as 20 skins de clube (`CARD_SKINS`, `@utility card-skin-clube-*`, `public/clubes/`) e as artes `premio-*-brasileirao`. Fica só o que é de outubro (Halloween). Ninguém tinha comprado skin de clube nem ganhado carta do Brasileirão. **Sem tema, uma rodada de novembro sai com a carta Clássica** até o evento novo ser definido.
- **Prêmio · Time do Mês (2026-10-29): coroa ao lado.** Roxo real liso com a coroa dourada grande ao lado do jogador (a mesma linguagem da taça do Melhor Jogador), moldura de ouro lisa, sem estrelinhas. Não veste o tema do mês. Descartados: veludo real com flor-de-lis e o mês ("OUT") gigante atrás do jogador. Fundo `premio-time-do-mes.webp`, gerado por `prototipos/mes.cjs`. Falta só a **Bola Murcha** entre os prêmios.
- **Prêmio · Bola Murcha (2026-10-29): bronze oxidado ("mofado").** Fosca e sem brilho (sem clarão, estrelinhas nem feixe; selo liso), bronze com manchas de azinhavre e a bola murcha desenhada ao lado do jogador; moldura bronze esverdeada lisa. Sem +1, como antes. **Igual o ano todo** (não veste o tema; decisão do Claude, o dono não respondeu, fácil de reverter em `hasSeasonalTheme`). Descartados: bronze fosco e barro rachado. Fundo `premio-bola-murcha.webp`, `prototipos/murcha.cjs`. **Com isso, todos os prêmios ativos têm o visual novo.**
