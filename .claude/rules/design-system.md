# Design System - PeladApp

Decisões visuais e de UX do projeto. Os tokens ficam no `app/globals.css`; este arquivo explica o porquê e as regras de uso. A direção é viva: ajuste aqui quando uma decisão mudar.

## 🎨 Direção visual

- **Só tema escuro.** Os valores escuros ficam direto em `:root`, e o `<html>` leva `class="dark"` para os `dark:` dos componentes do shadcn continuarem funcionando. Não crie tokens de modo claro; se ele vier no futuro, entra como novo bloco sem mexer nos componentes.
- **Fundo** quase preto com leve tom verde-gramado (`--background`, `--card`).
- **Acento principal verde-lima** (`--primary`): CTAs, progresso, foco, slider ativo. Não use para decoração.
- **Cores de raridade são o único elemento "brilhante/metálico" da UI.** Fora das cartas, a interface é neutra + lima.
- `--success` (▲ OVR subiu) e `--destructive` (▼ OVR caiu).

## 🔤 Tipografia

- `font-display` (Barlow Condensed 600/700/800): OVR, apelidos, siglas de atributo, títulos curtos, números grandes.
- `font-sans` (Geist): texto corrido, labels, botões.
- Números de OVR/atributos sempre com `tabular-nums`.

## 🃏 Carta do jogador (`components/player-card.tsx`)

- **Dois tipos de carta:**
  - **Carta base** (desempenho contínuo): uma por jogador, OVR e atributos mudam a cada rodada fechada.
  - **Cartas especiais** (colecionáveis): ganhas por voto na rodada; foto congelada que nunca muda. Ver seção abaixo.
- **Faixas da carta base pelo OVR (0–99)**, em `lib/card-tier.ts`:
  - Bronze `< 65` · Prata `65–74` · Ouro `75–84` · **Ouro Raro** `85+` (ouro mais intenso e brilho mais forte).
  - Os limites serão calibrados com dados reais; mude só as constantes.
  - Preto e dourado é **exclusivo do Craque da Rodada** (como o TOTW da EA); a carta base nunca usa.
- **Tokens:** `--rarity-<faixa>-frame` (moldura), `--rarity-<faixa>-from`/`-to` (gradiente da face) e `--rarity-<faixa>-foreground` (texto), expostos como `bg-rarity-gold-frame` etc. Prêmios: `--award-<prêmio>[-<tema>]-*` (`craque`, `gol`, `bola-murcha`).
- **Formato:** escudo estilo FUT (cantos de cima recortados, ponta embaixo), via `<clipPath>` em `PlayerCardDefs`, renderizado uma vez em `app/layout.tsx`. Face com brilho diagonal e textura de linhas finas.
- **Conteúdo (fiel às referências FUT):** OVR + posição no canto superior esquerdo, foto à direita, **apelido** como escrito (máx. ~12 caracteres; nome completo só no perfil), **6 atributos numa linha só, sigla em cima e valor embaixo**, nome da faixa discreto no rodapé. **Sem** escudo/bandeira; jogos e histórico ficam no perfil.
- **A carta escala pela largura** (`@container` + unidades `cqw`). Os tamanhos saem da prop `size`; nunca ajuste fonte interna por breakpoint.
- **Linha (FIX / ALA / PIV):** `VEL · CHU · PAS · DRI · DEF · FIS`
- **Goleiro (GOL):** `REF · ELA · POS · SAI · REP · PÉS`
  - Mesma moldura, mesmas faixas, mesmo layout; só mudam as siglas e a posição.
- Goleiro é **papel do jogador** (fixo): cada pessoa tem uma única carta.
- Em listas e no cabeçalho, o OVR aparece como `OvrBadge` (cor da faixa); variação da rodada como `OvrDelta` (ícone + número, nunca só cor).

## 🏆 Cartas especiais (colecionáveis)

- **Prêmios:** Craque da Rodada (`craque`), Gol da Semana (`gol`) e Bola Murcha (`bola_murcha`), em `types/award.ts`.
- **Como se ganha:** os presentes votam na tela de notas, num passo por prêmio depois dos jogadores (opcional; "Ninguém" é o padrão; ninguém vota em si). Ao **fechar a rodada** (`close_match`), quem tiver mais votos ganha; **empate: todos os empatados ganham**. Um jogador pode ganhar mais de um prêmio na rodada.
- **O que a carta mostra:** foto congelada do jogador no dia (OVR e atributos de todas as rodadas fechadas até ali). **Craque e Gol: +1 em cada atributo e no OVR** (como o Team of the Week da EA FC, teto 99). **Bola Murcha: sem bônus.**
- **Visual (`PlayerCard` com `award`):** ícone do prêmio sob a posição e "PRÊMIO · R<rodada>" no rodapé. Clássico: Craque preto e dourado, Gol azul elétrico, Bola Murcha couro velho.
- **Temas sazonais (`lib/card-themes.ts`):** pelo calendário da data do jogo (outubro = Halloween: Craque abóbora, Gol roxo e verde-gosma, Bola Murcha fantasma, com fantasma de marca d'água). O tema fica gravado na carta. Tema novo: período em `CARD_THEMES` + tokens `--award-*-<tema>-*` + classes em `DESIGNS` no `player-card.tsx` + textos em `EVENT_COPY` (`app/_components/card-event-showcase.tsx`).
- **Prévia:** `PlayerCard` com `award` sem `round` é prévia (rodapé sem "R<rodada>"); o bônus vem de `withAwardBonus` (`lib/award-bonus.ts`).
- **Onde aparecem:** home (cartas da última rodada fechada), "Rodadas" (ganhadores por rodada), página **Coleção** do atleta (`/jogadores/[id]/colecao`, visível para todos da pelada; aba ao lado de Estatísticas).

## 🧮 OVR (`lib/ovr.ts`)

- **OVR = soma das notas de todas as avaliações recebidas ÷ quantidade de avaliações**, sobre o histórico inteiro, para a média ser sempre a correta. A nota de uma avaliação é a média dos 6 atributos dela.
- Cada atributo da carta = média daquele atributo em todas as avaliações.
- Escala: notas 1–10 × 10 → carta 0–99 (teto 99).
- Só rodadas **fechadas** contam; notas de rodada aberta não mexem no OVR.
- Sem avaliações → OVR `null` (carta mostra "–").
- O OVR de goleiro nunca é comparado/somado com o de linha (rankings separados).

## 🏠 Telas

- **Home (`/`):** nome da pelada + "Fala, <apelido>", aviso de avaliação pendente, **evento do mês** (`CardEventShowcase`, largura total: nome do tema, "Até <fim> · faltam N dias", texto do evento, prévia das 3 cartas especiais com a carta do próprio jogador no tema, com o +1 aplicado, e "Como ganhar" em 3 passos; fora de tema sazonal mostra as cartas clássicas como "Cartas especiais"), minha carta (`MyCardSummary`, mobile-first: carta pequena + apelido, "Posição · Carta <faixa>" e OVR grande com variação; Ranking/Jogos/Notas em 3 blocos com número e complemento em linhas próprias, sem corte; dica com ícone quando ainda não tem OVR, e ranking "–"; "Desempenho" e "Coleção N" como dois botões lado a lado), rodada em avaliação (envios/presentes), última rodada fechada (Craque da Rodada + top 3) ou o vazio "Nenhuma rodada ainda", e ranking (linha e goleiros): resumo com top 5 da linha e top 2 do gol, e o botão "Ver ranking completo (+N)" / "Mostrar menos" expande a lista com todos os atletas no mesmo card (`ExpandableRanking`).
- **Navbar:** logo (home), "Rodadas" (ícone de sorteio), "Elenco", chip apelido + OVR (perfil; a coleção é a aba ao lado) e "Sair" (só ícone no celular). Sem link "Coleção" separado: levava ao mesmo perfil.
- **Senha:** sem troca obrigatória. O jogador entra com a senha gerada e, se quiser, troca em Elenco → "Sua senha" (`/trocar-senha` redireciona para `/elenco`).
- **Cadastrar jogador (em `/elenco`):** nome, apelido, posição e **usuário** (sugerido do apelido enquanto o organizador não editar; mostrado em fonte mono) → mostra usuário + senha gerada uma única vez e "Copiar mensagem para o WhatsApp" (`AccessCard`). Sem e-mail.
- **Atleta: duas páginas com abas** (`AthleteTabs`, segmentado de largura total: "Estatísticas" | "Coleção N"), porque a coleção cresce com o tempo.
  - **Estatísticas (`/jogadores/[id]`, carta vigente):** carta + resumo, aviso de pendência (só no próprio perfil), **"Próxima faixa"** (barra na cor da faixa atual, "faltam N de OVR"; "Faixa máxima" no Ouro Raro; some sem OVR), **4 destaques** (melhor rodada, ponto forte, a melhorar, presença %), desempenho por rodada (barras, cor única, tooltip por CSS), atributos (barra lima + **traço da média da pelada** da mesma função, diferença em texto `+N`/`-N` em `success`/`destructive`) e histórico em tabela.
  - **Coleção (`/jogadores/[id]/colecao`):** cabeçalho (total + 3 blocos por prêmio, ícone em cima e nome sem cortar), **"Última conquista"** (carta grande, data, votos, OVR, tema), galeria com **filtro por prêmio** (chips `aria-pressed`) **agrupada por evento e ano** ("Halloween 2026"). Vazia: prévia das 3 cartas do tema do mês **apagadas com cadeado** e "Ver as rodadas".
- **Entrar (`/entrar`):** campo "Usuário" (aceita também e-mail das contas antigas) e senha; avisa "Peça acesso ao organizador da pelada".
- **Criar pelada (`/bem-vindo`):** só o organizador, uma vez: nome da pelada, seus dados e senha.
- **Rodadas (`/rodadas`, atração principal):** cabeçalho com nome da pelada, título "Rodadas", texto do fluxo e "N rodada(s) em avaliação". Organizador: "Nova rodada" em destaque (coluna larga, `3fr`) ao lado da lista; jogador: só a lista. "Nova rodada": data, checklist de confirmados (com OVR e "Marcar todos"), número de times (padrão: confirmados ÷ 5), "Sortear times"/"Sortear de novo", cards dos times com média de OVR, aviso "rodízio no gol" e seletor para trocar jogador de time. Sem placar. Rodadas com "Fechar rodada" (confirmação).
- **Elenco (`/elenco`, gestão de cadastro):** cabeçalho igual ao de Rodadas. Coluna principal: "Cadastrar jogador" (só o dono) e a lista; ao lado, "Seu perfil" (novo nome e/ou novo apelido, **campos em branco** como os de senha; vazio = manter) e "Sua senha", para todos. Essa coluna leva `key` da conta, para não herdar o formulário de outra conta na mesma aba. Lista com OVR e, só para o dono, `@usuário` e um botão **"Gerenciar"** por jogador (um botão só, para a linha não lotar no celular), que abre numa linha própria: "Editar dados" (formulário inline: nome, apelido, posição, usuário), "Tornar organizador" (organizador promovido só cria e fecha rodadas), "Redefinir senha" (confirmação → novo `AccessCard`) e "Desativar" (confirmação em tom `destructive`). O dono aparece como "Dono da pelada". Abaixo, "Desativados (N)" com "Reativar". Desativado no perfil: "· Desativado" e ranking "–". Quem foi desativado vê `/conta-desativada` (só "Sair"); no login, "Sua conta foi desativada".
- **Sem rolagem lateral da página no celular.** Grid de layout sempre com `grid-cols-1` (ou `minmax(0,…)` nas colunas): sem isso a coluna implícita cresce até a fileira de cartas com rolagem e empurra a página (534px num celular de 375). A prévia do evento usa grade de 3 colunas com `PlayerCard size="fill"`.
- Superfícies: `rounded-xl border bg-card p-4`; títulos de seção em `font-display` caixa alta. Campos e botões principais com `h-11 text-base` (toque e sem zoom no iOS).

## 📸 Foto do jogador

1. Jogador escolhe a foto → crop (rosto/busto).
2. **MediaPipe Selfie Segmentation** remove o fundo **no próprio aparelho** (grátis, Apache 2.0; confirmar o model card antes de instalar). Não usar `@imgly/background-removal` (AGPL).
3. Prévia já dentro da carta: **"Usar recorte"** ou **"Usar foto original"**.
4. Storage guarda o **recorte (WebP com transparência)** e a **original** (para reprocessar no futuro).
- Na carta: recorte → `object-contain` alinhado embaixo; original → `object-cover object-top` com **degradê embaixo e na esquerda** (máscara explícita `mask-image` com duas camadas e `mask-composite: intersect`; não use os utilitários `mask-b-*` do Tailwind, que escondiam a foto inteira); sem foto → **iniciais** grandes na cor da faixa. A foto fica em `z-0`, sempre atrás do OVR/posição (`z-10`).
- **Hoje (sem upload no app):** a foto é recortada fora (rosto/busto, proporção ~0,87, WebP ~640px) e enviada pelo CLI ao bucket público `player-photos` como `<memberId>-vN.webp` (troque o `N` ao substituir, para não pegar cache); `photo_kind = 'original'`.

## 📱 Tela de notas (vestiário, mobile) — `/avaliar/[matchId]`

Implementada em `app/avaliar/[matchId]/` (sem navbar). Aberta pelo botão "Avaliar" do aviso de pendência. Ordem: time a time, depois apelido. "—" + polegar cinza no meio (6) até o primeiro toque; tocar no polegar parado já conta como nota. Rodapé: anterior / Pular / Próximo (último vira "Revisar"). Revisão lista média (1 casa) ou "Pulado", toque para editar; "Enviar notas (N)" exige ao menos 1. Depois: "Notas enviadas!" e volta ao início. Estados sem formulário: rodada fechada, não jogou, já enviou.


- **Um jogador por vez**, sem autoavaliação. Progresso fixo no topo ("3/8"), botão "Próximo" fixo no rodapé (zona do polegar), opção de **pular** jogador, **revisão final** e **envio em lote** numa única Server Action.
- **Nota de 1 a 10 (inteiros)** por atributo, via **slider**:
  - largura total, área de toque alta, snap de 1 em 1, número grande acima;
  - começa **"apagado" mostrando "—"** até o primeiro toque; "Próximo" só libera com os 6 atributos tocados;
  - vibração leve a cada passo (`navigator.vibrate`, só Android; no iOS é ignorado).
- Goleiro usa o mesmo componente com as siglas de goleiro.

## 🔄 Rodada e feedback de OVR

- A rodada fecha quando **todos os presentes enviaram ou 24h após o jogo**; o organizador pode fechar antes. Antes de fechar: "Aguardando X de Y".
- Ao fechar: o OVR anima do antigo ao novo (▲ `success` / ▼ `destructive`); se a faixa mudar, a carta vira com animação de revelação (Framer Motion).

## 🎲 Draft

- Formato típico: times de **4 na linha + 1 goleiro**, revezando: quem faz 2 gols fica, o outro sai e entra o próximo time. O app não registra placar.
- Goleiros são distribuídos primeiro, **um por time**; depois a linha é equilibrada pelo OVR (sempre no time com menos jogadores e, no empate, menor soma). Sem nota → média do grupo. Time sem goleiro fica marcado como "rodízio no gol".
- O organizador sempre pode ajustar o sorteio antes de criar a rodada.
