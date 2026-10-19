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
- **Rodadas (`/rodadas`, atração principal):** cabeçalho com nome da pelada, título "Rodadas", texto do fluxo e "N rodada(s) em avaliação". Organizador: "Nova rodada" em destaque (coluna larga, `3fr`) ao lado da lista; jogador: só a lista. "Nova rodada": data, checklist de confirmados (com OVR e "Marcar todos"), "Sortear times"/"Sortear de novo" (sempre Branco x Preto com titulares e reservas; ver Draft), cards dos times com média de OVR, aviso "rodízio no gol" e seletor de time/reserva. Sem placar. Rodadas com "Fechar rodada" (confirmação) e **"Excluir"** (texto vermelho; confirmação em tom `destructive`: em rodada fechada avisa que notas, votos e cartas somem e o OVR é recalculado; "Não dá para desfazer").
- **Elenco (`/elenco`, gestão de cadastro):** cabeçalho igual ao de Rodadas. **"Sua foto" (`#sua-foto`) vem primeiro no celular** (antes do cadastro longo do dono) e no topo da coluna da direita no desktop; a home mostra "Adicionar sua foto na carta" enquanto o jogador não tem foto. Coluna principal: "Cadastrar jogador" (só o dono) e a lista; ao lado, "Seu perfil" (novo nome e/ou novo apelido, **campos em branco** como os de senha; vazio = manter) e "Sua senha", para todos. Essa coluna leva `key` da conta, para não herdar o formulário de outra conta na mesma aba. Lista com OVR e, só para o dono, `@usuário` e um botão **"Gerenciar"** por jogador (um botão só, para a linha não lotar no celular), que abre numa linha própria: "Editar dados" (formulário inline: nome, apelido, posição, usuário), "Tornar organizador" (organizador promovido só cria e fecha rodadas), "Redefinir senha" (confirmação → novo `AccessCard`) e "Desativar" (confirmação em tom `destructive`). O dono aparece como "Dono da pelada". Abaixo, "Desativados (N)" com "Reativar". Desativado no perfil: "· Desativado" e ranking "–". Quem foi desativado vê `/conta-desativada` (só "Sair"); no login, "Sua conta foi desativada".
- **Sem rolagem lateral da página no celular.** Grid de layout sempre com `grid-cols-1` (ou `minmax(0,…)` nas colunas): sem isso a coluna implícita cresce até a fileira de cartas com rolagem e empurra a página (534px num celular de 375). A prévia do evento usa grade de 3 colunas com `PlayerCard size="fill"`.
- Superfícies: `rounded-xl border bg-card p-4`; títulos de seção em `font-display` caixa alta. Campos e botões principais com `h-11 text-base` (toque e sem zoom no iOS).

## 📸 Foto do jogador

**Implementado** (`PlayerPhotoUploader`, em `/elenco`: card "Sua foto" para cada um e "Gerenciar → Foto" para o dono):
1. Jogador escolhe a foto ("Escolher foto"/"Trocar foto"; "Tirar foto" volta às iniciais).
2. **Máscara da pessoa (`lib/photo-cutout.ts`):** primeiro pelo **servidor** (action `segmentPhoto`): **BiRefNet Portrait num Space ZeroGPU gratuito do Hugging Face** (`lib/hf-matte.ts`, código em `hf-space/`, MIT, 20s de limite; o melhor recorte), depois **remove.bg no plano gratuito** (`lib/remove-bg-matte.ts`, `REMOVE_BG_API_KEY`, 50 por mês em `size=preview`, só o alfa, ~15s de limite; recorta certo camisa escura em fundo escuro, onde o MODNet abria buracos; nada pago neste projeto) e, sem a chave, sem cota ou se ele falhar, **MODNet** local (`lib/person-matte.ts`, `onnxruntime-node`, quantizado de 6,6MB em `models/`, Apache 2.0). Se a rede falhar (45s), no **aparelho** com o **MediaPipe** (`selfie_multiclass_256x256`, Apache 2.0; WASM e modelo servidos pelo app em `/mediapipe/`, fora do `proxy.ts`, baixados só nesse caso; a máscara de 256px enche vãos e deixa **borda branca**). Não usar `@imgly/background-removal` (AGPL).
   - **Enquadramento no padrão das cartas do EA FC** (referências TOTY/TOTS do dono do app, 2026-10-19, "perfeitas": **do peito para cima e o OVR nunca por cima da pessoa**): acha o topo da cabeça, mede a largura dela só até o ponto mais largo (olhos/orelhas, `HEAD_SCAN`), estima a altura (1,3 × largura; fica perto da cabeça real) e monta o quadro com **2,35 cabeças** de altura (cabeça com ~27% da altura da carta), **19% de folga acima** (topo da cabeça a ~14% da carta) e o **rosto a 54% da largura** (um pouco à direita do centro: o OVR fica livre à esquerda); largura = altura × 1,18 (proporção da área). O corte cai na **linha do peito**, atrás do apelido. O quadro **pode passar das bordas da foto** (`drawBox`; pouco espaço acima da cabeça ou ombro cortado): o que fica fora sai transparente. (Tentativas anteriores: 1,55 cabeça com rosto centrado e ombros de borda a borda deixavam a cabeça grande demais, por baixo do OVR.)
   - **Borda:** a máscara encolhe ~3px (`erode`, 0,22% do lado maior) e passa pela curva 0,45–0,80; as **laterais e o pé da foto original** somem aos poucos na máscara (6%), para ombro ou peito cortados pela borda da foto não virarem risco reto. (Refinar a borda pela cor média de fundo/pessoa foi testado e deixou serrilhado: não volte a isso.)
3. Prévia já dentro da carta, **só com a foto sem fundo** → "Usar foto" (decisão do dono do app, 2026-10-19: não existe mais a opção "Original"). Se servidor e aparelho falharem, não há prévia: aparece "Não deu para tirar o fundo agora. Confira a conexão e tente de novo." iOS antigo que recusa as opções do `createImageBitmap` decodifica por `<img>`. Se o PNG do recorte + a original passarem de 3,5MB, o app refaz em 480/360px. Erros do envio sempre aparecem na tela (e vão para o `console.error`/logs da Vercel).
4. Storage guarda o **recorte (WebP com transparência, o que a carta usa)** e a **original** (só arquivo), em `<memberId>/<timestamp>-*.webp` (nome novo a cada envio = sem cache velho).
- **Filtro de cor (`PhotoTint`):** camada na cor da moldura da carta (`DESIGNS[design].frame`), `mix-blend-soft-light` a 55%, mascarada pela própria foto (só a pessoa ganha o tom) e pelos mesmos degradês. Bem suave: aproxima a foto da carta sem mudar a pele. Exige CORS aberto no Storage (o Supabase responde `*`).
- Na carta (degradês em `PHOTO_FADES`, os mesmos na foto e no filtro), **estilo das cartas do EA FC: foto centralizada e grande, ocupando quase toda a carta**: recorte → `object-contain` alinhado embaixo, **topo limpo** (0–3%, apaga a linha que o segmentador deixa na borda), o **peito some embaixo** (70–100% da área), atrás do apelido, e os ombros somem só rente à moldura (1–11% e 89–99%; a face vai de ~4% a ~96% da área); original (só fotos antigas) → `object-cover object-top`, some embaixo (62–100%) e **mais do lado do OVR** (até 40%); sem foto → **iniciais** grandes na cor da faixa. Regra: as **quatro bordas da área terminam transparentes** (borda com opacidade aparece como fio no Safari do iPhone), e as laterais ainda ficam fora do corte da face. (A vinheta oval da versão anterior deixava o rosto pequeno e "flutuando"; foi trocada por esse layout.) Máscara explícita `mask-image` com camadas e `mask-composite: intersect`; não use os utilitários `mask-b-*` do Tailwind, que escondiam a foto inteira. A foto fica em `z-0`, sempre atrás do OVR/posição (`z-10`); pelo enquadramento, a pessoa não passa por baixo do OVR. **Área da foto:** `top 2%`, `left/right -4%` (passa das laterais da face), `altura 62%` (até o apelido); proporção ~1,18, a mesma do enquadramento. Fotos enviadas antes (proporção 0,87) aparecem mais estreitas, centralizadas, até o jogador reenviar.
- **Hoje (sem upload no app):** a foto é recortada fora (rosto/busto, proporção ~0,87, WebP ~640px) e enviada pelo CLI ao bucket público `player-photos` como `<memberId>-vN.webp` (troque o `N` ao substituir, para não pegar cache). Sem fundo: modelo **IS-Net** (`isnet-general-use`, Apache 2.0, entrada 1024) via `onnxruntime-node`, WebP com alfa e `photo_kind = 'cutout'`. Ao voltar a máscara quadrada para o tamanho da foto use `fit: "fill"` (o padrão `cover` estica a silhueta e deixa um halo de parede).

## 🧩 Mesa tática — `/rodadas/[matchId]`

A tela da partida, estilo squad builder do EA FC. **Abre sozinha depois de "Criar rodada"**; também por "Mesa tática" na lista de rodadas, "Abrir a mesa tática" na home e pelo "Avaliar" do aviso de pendência.

- **Dois campos, um por time** ("Time Branco" / "Time Preto", bolinha da cor, titulares e média de OVR), empilhados no celular e lado a lado no desktop (`lg`). Cada campo tem linhas sutis de fundo (área do gol embaixo, meio de campo em cima) e listras de gramado quase invisíveis; neutro, sem lima.
- **Cartas completas** (`PlayerCard size="fill"`) no esquema **1-2-1 do futsal**: pivô no topo, alas nas laterais, fixo e goleiro embaixo (`lib/formation.ts`, `assignFormation`: cada um vai para o slot da sua posição; sobras ocupam vagas vazias, o 5º jogador de um time sem goleiro cai no gol; vaga sem jogador = contorno tracejado).
- **Reservas** numa fileira tracejada abaixo do campo ("Reservas · N"), cartas menores (4 por linha).
- **Selo na base de cada carta:** "+ Avaliar" (nada dado) → "N/6" (parcial) → "✓ 7,5" (lima, completo). "Você" marca a própria carta (não se avalia). Em rodada fechada o selo mostra a nota que a rodada deu ("74 na rodada").
- **Avaliar na mesa:** tocar na carta abre uma folha por baixo (`Sheet`) com a carta pequena e os 6 sliders (mesmo `AttributeSlider` da tela passo a passo); "Pronto" só libera com os 6 atributos, "Limpar" zera. Barra fixa embaixo: "Avaliados X de Y" + "Votar e enviar", que abre a folha de votos (Craque, Gol da Semana, Bola Murcha) e "Enviar notas (N)" (mesma `submitEvaluations`). O link "Prefere um por vez?" leva à tela passo a passo (`/avaliar/[matchId]`), que continua existindo.
- **Sem avaliação possível** (rodada fechada, não jogou, já enviou): as cartas viram links para o perfil do atleta, sem barra de envio; aviso "Você já enviou suas notas".

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

## 🎲 Draft (`draftMatch` em `lib/draft.ts`)

- **Sempre 2 times: Branco (1) e Preto (2)** (`lib/teams.ts`), cada um com **5 titulares** (1 goleiro + 4 na linha). Até 10 confirmados, todo mundo é titular.
- **Quem é titular é sorteado de verdade** (Fisher–Yates, justo para todos): 2 goleiros sorteados vão ao gol; os goleiros a mais disputam a linha com os demais; as vagas restantes da linha são sorteadas.
- Os 2 times de titulares são **equilibrados pelo OVR**: goleiros primeiro (um por time), a linha do maior para o menor OVR, sempre no time com menos jogadores e, no empate, menor soma. Sem nota → média do grupo. Faltou goleiro: um de linha completa o time, marcado "rodízio no gol".
- **O excedente vira reservas, divididos igualmente entre Branco e Preto** (um a mais num dos times se for ímpar), também equilibrando o OVR do elenco todo. Reserva = presente com time e `match_attendance.reserve = true`: avalia e é avaliado.
- No formulário: só "Sortear times"/"Sortear de novo", cards **Time Branco** e **Time Preto** (bolinha da cor, média de OVR dos titulares) com a lista de titulares e, abaixo (tracejado), **Reservas · N**. O organizador ajusta antes de criar: cada jogador tem o seletor Branco / Branco · reserva / Preto / Preto · reserva. Na lista de rodadas: "Branco x Preto · 10 titulares + 3 reservas"; na tela de notas e na votação: "Branco ·", "Preto · reserva ·".
