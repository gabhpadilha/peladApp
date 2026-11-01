# Gols confirmados pelos colegas — design

Data: 2026-11-01. Conversa com o dono do app (brainstorming), aprovada por ele para escrever e começar as telas.

## Intenção e o porquê

O Cancha Club é um "fantasy" da pelada: nota, carta, OVR e sorteio. Falta o dado mais básico do futebol: **quantos gols cada um fez**. O dono quer que cada jogador informe os próprios gols da partida, mas sem dar espaço para o "espertinho" inflar a estatística ("fiz 1000 gols"). A trava é **social**: os colegas que jogaram confirmam. Três confirmações bastam.

A feature precisa ser **leve**. O dono disse que o fluxo de votação já está "meio maçante"; isto não pode alongar o pós-jogo. E tem que acontecer **no pós-jogo, com todo mundo junto**: a graça é ver o resultado na hora, não esperar cada um votar em casa.

## Objetivos

- Cada jogador presente informa quantos gols fez na rodada.
- Os gols só viram estatística oficial com **3 confirmações ("sim") de outros presentes**.
- Gols confirmados aparecem: na **estatística do atleta**, na **mesa tática** (embaixo da carta) e numa **carta nova de destaque, o Goleador da Rodada**.
- Quem não tem celular no jogo não fica de fora: o **organizador** informa por ele.

## Fora do escopo (agora)

- **Peso dos gols em XP e CanchaCoins.** Vai existir, mas o dono quer testar o fluxo antes e calibrar depois. Nesta entrega, gols não mexem em XP nem moedas.
- Assistências (o SofaScore mostra a chuteirinha; aqui é só gol).
- Placar dos times (continua no WhatsApp).
- Gols de rodadas antigas: a contagem começa na primeira rodada criada depois do lançamento.

## Anti-objetivos (seria fracasso mesmo funcionando)

- Votação "democrática" (maioria de sim contra não). **Não é isso**: é só atestar veracidade. 3 "sim" confirmam, não importa quantos "não".
- Obrigar todo mundo a confirmar todo mundo, ou qualquer passo que segure o resultado do pós-jogo.
- Colegas marcando gols uns dos outros (o dono descartou: abre espaço para avacalhar, "fez 4 e o colega põe 2").
- Uma tela a mais que fique "só ocupando espaço" no app.

## Regras (decididas pelo dono)

1. **Quem informa:** cada presente informa os **próprios** gols. Para quem está **sem celular**, quem informa é o **organizador** (qualquer organizador da pelada), e mais ninguém.
2. **Confirmação:** outro presente da mesma rodada confirma com "sim" ou "não". Com **3 "sim"**, os gols estão confirmados, independente dos "não".
3. **Gols informados pelo organizador também precisam dos 3 "sim".** Uma regra só para todos.
4. **Amarrado à votação e ao pós-jogo:** a primeira tela da votação é "Quantos gols você fez?"; a confirmação de cada colega aparece na nota dele. Tudo dentro da rodada aberta.
5. **Goleador da Rodada:** carta nova de destaque, para quem teve mais gols confirmados.
6. **Gols renderão XP e CanchaCoins depois** (peso a definir após o teste).

## Decisões do construtor (aprovadas pelo dono em bloco: "concordo com tudo")

- **0 gols não precisa de confirmação.** Informar 0 é o padrão e não pede voto de ninguém.
- **Só presentes confirmam**, como nas notas; ninguém confirma os próprios gols; o organizador que informou os gols de alguém **pode** confirmar os de outros, mas não conta como "sim" nos gols que ele mesmo informou.
- **O "não" é um aviso**: quem informou vê "N não confirmaram" e pode corrigir o número. **Corrigir zera as confirmações** (sim e não) daquele jogador.
- **Limite de bom senso:** 0 a 15 gols por rodada.
- **Goleiro também informa gols**, igual à linha.
- **Ao fechar a rodada, só os gols com 3 "sim" contam.** Os não confirmados são descartados naquela rodada (não seguram o fechamento).
- **Ordem de quem vota:** como cada um vota numa hora, quem já mandou as notas confirma os gols de quem informou depois **pela mesa tática** (a carta mostra "3 gols? Confirmar"). Nada força esperar ninguém.
- **Gol da Rodada** (voto no gol mais bonito) não muda e não tem relação com a contagem.
- **Quem estava sem celular e aparece depois** pode corrigir o número que o organizador informou (vale como correção: zera as confirmações). O organizador também pode corrigir o que ele informou.
- **Goleador no banco:** os gols vão em `awards.votes` (o rótulo da carta diz "N gols"), sem campo novo.

## Duas etapas: gols antes das notas (decidido pelo dono depois das prévias)

Problema: o último a votar informaria os gols quando todo mundo já mandou as notas, e ninguém mais confirmaria. Solução do dono: **as notas ficam travadas até todos os presentes terem gols informados**.

1. **Etapa dos gols:** ao abrir a votação, cada um informa os próprios gols. Enquanto faltar alguém, a tela mostra "Esperando os gols de N: Fulano, Ciclano" e as notas ficam bloqueadas (na tela passo a passo e na mesa tática).
2. **Destrava:** quando todos os presentes tiverem gols informados (por eles ou pelo organizador), as notas liberam. Na nota de cada colega já aparece o número dele para confirmar.
3. **O organizador destrava** com "Liberar as notas" (`matches.ratings_unlocked_at`): quem ainda não informou fica com 0 naquela rodada. Os gols marcados por ele continuam precisando dos 3 "sim".

Com isso, a confirmação pela mesa tática "para quem votou antes" deixa de ser necessária: a confirmação acontece na nota de cada um. A bolinha dos gols confirmados continua embaixo da carta.

## O fluxo

### 1. Tela "Quantos gols você fez?" (início da votação)

- Primeira tela da votação, tanto na tela passo a passo (`/avaliar/[matchId]`) quanto ao tocar "Votar e enviar"/abrir as notas pela mesa tática. Só para quem jogou e ainda não informou.
- Um seletor grande de 0 a 15 (botões − e + e o número enorme, zona do polegar), começa em 0. "Continuar" leva às notas.
- Pode ser respondida e enviada **separada** das notas (uma Server Action própria), para que o número apareça para os colegas o quanto antes, mesmo antes de o jogador terminar as notas.
- Quem já informou não vê essa tela de novo; pode mudar o número pela mesa tática enquanto a rodada estiver aberta.

### 2. Confirmação na nota de cada colega

- Na tela de nota de um colega que informou **1 gol ou mais**, aparece uma faixa: "Fulano diz que fez **3 gols**" com "Confirmo" / "Não foi isso".
- **Opcional**: não trava o "Próximo" (não pode alongar a votação). Se o colega ainda não informou, a faixa não aparece.
- A confirmação vai junto do envio das notas.

### 3. Mesa tática (`/rodadas/[matchId]`)

- **Gols confirmados:** embaixo da carta, ao lado do selo de nota, uma bolinha com o número (estilo SofaScore: ⚽ 3). Só aparece com 3 "sim".
- **Gols aguardando confirmação** (para quem pode confirmar e ainda não votou nesses gols): a carta mostra "3 gols? Confirmar"; um toque abre uma folha pequena com "Confirmo" / "Não foi isso". Funciona também para quem já enviou as notas.
- **Próprios gols:** o jogador vê o estado dos seus ("2 de 3 confirmações", "1 não confirmou") e pode corrigir o número.
- **Organizador:** um card "Gols de quem está sem celular · Marcar" (no estilo do "Alguém jogou fora da posição? · Ajustar") abre uma folha com os presentes que não informaram e um seletor 0–15 para cada.
- Rodada fechada: só a bolinha dos confirmados.

### 4. Fechar a rodada

- Continua como hoje (mínimo de 5 envios completos). Os gols com 3 "sim" ficam gravados como os gols da rodada; o resto é descartado.
- O `compute_match_awards` (dentro do `close_match`) distribui o **Goleador da Rodada**.

### 5. Goleador da Rodada (carta nova)

- Chave nova `goleador` em `AWARD_KINDS`; visual de **destaque** (`awardDesignKind` → o mesmo dos outros destaques; hoje a água com a nuvem chovendo, e no tema do evento conforme o tema da rodada), ícone da bola.
- Vai para quem tem **mais gols confirmados** na rodada, linha ou gol, com **mínimo de 1**. **Empate: todos ganham.** Sem gol confirmado, sem Goleador.
- +1 em tudo, como os outros prêmios (bônus de `award-bonus`).
- `awards.score` não se aplica; guardar os gols em `awards.votes` (ou campo próprio) para mostrar **"3 gols"** embaixo da carta na revelação e na coleção.
- Entra no passo "Destaques da rodada" da revelação e na coleção, como os outros destaques.

### 6. Estatística do atleta (`/jogadores/[id]`)

- Bloco novo "Gols": **total**, **média por jogo** (sobre as rodadas em que ele jogou desde o lançamento) e **melhor rodada** ("3 gols · R5").
- No histórico por rodada, uma coluna com os gols confirmados daquela rodada.

## Dados (banco)

Tabelas novas (migration nova, RLS, tipos regenerados):

- `match_goals`: uma linha por presente que informou — `match_id`, `member_id`, `goals` (0–15), `reported_by` (o próprio ou um organizador), `updated_at`. FK para `match_attendance` (só presentes). Escrita só por função (`report_goals`), com rodada `open`.
- `match_goal_confirmations`: `match_id`, `member_id` (de quem são os gols), `voter_id`, `confirmed boolean`. Único por (`match_id`, `member_id`, `voter_id`). Só presentes; ninguém vota nos próprios gols; quem informou como organizador não conta nos gols que informou; só rodada `open`. Corrigir o número em `match_goals` apaga as confirmações daquele jogador.
- Gols oficiais = gols com **≥ 3 confirmações `true`**, calculados no fechamento (gravar o resultado final em `match_goals.confirmed_goals` ou equivalente ao fechar, para histórico estável).
- Leitura: todos da pelada leem os gols informados e a **contagem** de sim/não; quem votou o quê fica anônimo (como as notas), cada um só lê as próprias confirmações.

Regras espelhadas no TypeScript (mínimo de 3, limite de 15) numa constante, como `MIN_SUBMISSIONS_TO_CLOSE`.

## Restrições

- Mobile-first; nada de `filter`/`mix-blend-mode` nas cartas (iPhone).
- Mutações só por Server Actions; banco é a fonte das regras (RLS e funções), como o resto do app.
- Projeto sem custos.
- Migration em produção só com o ok do dono e depois do dry-run.

## O que fica para o construtor

- Detalhes de componente (reaproveitar `AttributeSlider`/`Sheet`/selos da mesa).
- Se a tela de gols é um passo do `RatingWizard` ou um componente compartilhado entre a tela passo a passo e a mesa tática.
- Texto exato das faixas e folhas, seguindo o tom do app.
- Onde exatamente cabe o bloco "Gols" no perfil.

## Ordem sugerida

1. Prévias das telas (aprovação visual do dono) — ver abaixo.
2. Migration + funções + tipos (aprovação do dono antes de aplicar).
3. Tela de gols e confirmação na votação.
4. Mesa tática (bolinha, confirmar, organizador).
5. Fechamento + Goleador da Rodada (carta, revelação, coleção).
6. Estatística do atleta.
7. Depois do teste com a galera: peso em XP e CanchaCoins.
