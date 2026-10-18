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

- **Faixas de raridade pelo OVR (0–99)**, definidas em `lib/card-tier.ts`:
  - Bronze `< 65` · Prata `65–74` · Ouro `75–84` · Especial `85+`
  - **Craque da Rodada** (`mvp`): carta temporária do melhor avaliado da semana, sobrepõe a faixa.
  - Os limites serão calibrados com dados reais; mude só as constantes.
- **Tokens:** `--rarity-<faixa>-frame` (moldura), `--rarity-<faixa>-from`/`-to` (gradiente da face) e `--rarity-<faixa>-foreground` (texto), expostos como `bg-rarity-gold-frame`, `text-rarity-gold-foreground` etc. Especial = carta preta com detalhes dourados.
- **Formato:** escudo estilo FUT (cantos de cima recortados, ponta embaixo), via `<clipPath>` em `PlayerCardDefs`, renderizado uma vez em `app/layout.tsx`. Face com brilho diagonal e textura de linhas finas.
- **Conteúdo (fiel às referências FUT):** OVR + posição no canto superior esquerdo, foto à direita, **apelido** como escrito (máx. ~12 caracteres; nome completo só no perfil), **6 atributos numa linha só, sigla em cima e valor embaixo**, nome da faixa discreto no rodapé. **Sem** escudo/bandeira; jogos e histórico ficam no perfil.
- **A carta escala pela largura** (`@container` + unidades `cqw`). Os tamanhos saem da prop `size`; nunca ajuste fonte interna por breakpoint.
- **Linha (FIX / ALA / PIV):** `VEL · CHU · PAS · DRI · DEF · FIS`
- **Goleiro (GOL):** `REF · ELA · POS · SAI · REP · PÉS`
  - Mesma moldura, mesmas faixas, mesmo layout; só mudam as siglas e a posição.
- Goleiro é **papel do jogador** (fixo): cada pessoa tem uma única carta.
- Em listas e no cabeçalho, o OVR aparece como `OvrBadge` (cor da faixa); variação da rodada como `OvrDelta` (ícone + número, nunca só cor).

## 🧮 OVR (`lib/ovr.ts`)

- **OVR = soma das notas de todas as avaliações recebidas ÷ quantidade de avaliações**, sobre o histórico inteiro, para a média ser sempre a correta. A nota de uma avaliação é a média dos 6 atributos dela.
- Cada atributo da carta = média daquele atributo em todas as avaliações.
- Escala: notas 1–10 × 10 → carta 0–99 (teto 99).
- Só rodadas **fechadas** contam; notas de rodada aberta não mexem no OVR.
- Sem avaliações → OVR `null` (carta mostra "–").
- O OVR de goleiro nunca é comparado/somado com o de linha (rankings separados).

## 🏠 Telas

- **Home (`/`):** saudação, aviso de avaliação pendente, minha carta (OVR, variação, ranking, jogos, avaliações), próxima pelada, última rodada (Craque da Rodada + top 3 e progresso da rodada em avaliação) e ranking (linha e goleiros).
- **Atleta (`/jogadores/[id]`):** carta + resumo, aviso de pendência (só no próprio perfil), desempenho por rodada (barras, cor única, tooltip por CSS), atributos (barras) e histórico em tabela.
- Superfícies: `rounded-xl border bg-card p-4`; títulos de seção em `font-display` caixa alta.

## 📸 Foto do jogador

1. Jogador escolhe a foto → crop (rosto/busto).
2. **MediaPipe Selfie Segmentation** remove o fundo **no próprio aparelho** (grátis, Apache 2.0; confirmar o model card antes de instalar). Não usar `@imgly/background-removal` (AGPL).
3. Prévia já dentro da carta: **"Usar recorte"** ou **"Usar foto original"**.
4. Storage guarda o **recorte (WebP com transparência)** e a **original** (para reprocessar no futuro).
- Na carta: recorte → `object-contain` alinhado embaixo; original → `object-cover` com máscara em gradiente; sem foto → **iniciais** grandes na cor da faixa.

## 📱 Tela de notas (vestiário, mobile)

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

- Formato típico: times de **4 na linha + 1 goleiro**, com reservas revezando.
- Goleiros são distribuídos primeiro, **um por time**; depois a linha é equilibrada pelo OVR. Time sem goleiro fica marcado como "rodízio no gol".
