# Objetivos do mês (design)

Decidido com o dono do app em 2026-11-09. Primeira versão: **só o conjunto mensal**. O conjunto semanal e o passe de batalha ficam para depois.

## Intenção

Dar a cada jogador metas pessoais do mês, tiradas do que ele já faz no jogo (jogar, marcar gols, receber notas, ganhar cartas de prêmio), e premiar quem cumpre com um pacote de skin. Em três níveis de dificuldade, para que todo mundo consiga cumprir pelo menos um, e para que o objetivo difícil seja de verdade difícil.

**Sucesso:** a galera abre os objetivos no começo do mês, escolhe o que quer perseguir e sente que cumprir é justo, seja na linha ou no gol.

## Regras (decididas pelo dono)

- **Três vagas por jogador por mês:** fácil, médio e difícil.
- **Em cada vaga o jogador escolhe uma opção** entre as do catálogo (abaixo).
- **A escolha é única e travada até o fim do mês.** Escolheu, não troca.
- **Só conta o que acontece depois de aceitar o objetivo no app.** Quem escolhe no dia 20 não leva o que fez antes (6 gols no dia 10 não valem se ele aceita "10 gols no mês" no dia 20).
- **Quanto mais difícil o objetivo, melhor o pacote.** Palpite meu para o mapa, a confirmar: fácil = faixa **C** (Pelada), médio = faixa **B** (Destaque), difícil = faixa **A** (Craque), as faixas que os pacotes já têm.
- **Justiça entre linha e goleiro:** o goleiro tem catálogo próprio, com a mesma escada de dificuldade.
- **Os objetivos só existem quando os pacotes estiverem no ar** (decisão do dono, 2026-11-10): o prêmio é um pacote. Dá para construir antes, desligado, e ligar junto com os pacotes (lançamento planejado para 1/12); sem `packs_enabled` na pelada, o cartão nem aparece.
- Só mensal agora. Os objetivos são os mesmos para todos; cada um só escolhe a opção dentro de cada nível.

## Catálogo da primeira versão (números são palpite meu; o dono aprovou o desenho)

Premissa: ~4 rodadas por mês. "Nota" = nota da rodada (o OVR da rodada). Os números devem ser conferidos com o histórico real antes de ligar.

**Linha**

| Nível | Opções |
|---|---|
| Fácil | Jogar 2 rodadas · Fazer 2 gols no mês · Nota acima de 60 em 2 rodadas |
| Médio | Jogar 3 rodadas · Fazer 5 gols no mês · Nota acima de 70 em 2 rodadas · Ganhar 1 carta de prêmio |
| Difícil | Fazer 3 gols num jogo só · Fazer 10 gols no mês · Nota acima de 75 em 3 rodadas · Ganhar 2 cartas de prêmio |

**Goleiro**

| Nível | Opções |
|---|---|
| Fácil | Jogar 2 rodadas · Nota acima de 60 em 2 rodadas |
| Médio | Jogar 3 rodadas · Nota acima de 70 em 2 rodadas · Ganhar Melhor Goleiro 1 vez |
| Difícil | Nota acima de 75 em 3 rodadas · Ganhar Melhor Goleiro 2 vezes · Jogar 4 rodadas |

"Carta de prêmio" = prêmio individual da rodada (Melhor Jogador, destaques, Goleador, Melhor Goleiro), nunca Bola Murcha nem Time do Mês.

## Onde aparece

- Um **cartão na Home**, perto do "Agora" ("Objetivos do mês", com o progresso das 3 vagas), que leva à página **`/objetivos`**. A barra de baixo continua com 5 botões. (Decisão do dono: "tem que ser na home".)
- Na página: as 3 vagas, cada uma com as opções para escolher (antes de aceitar) ou o progresso da opção escolhida (depois), e o pacote que ela paga.

## Metas e antimetas

**Metas**
- Escolher e aceitar objetivos no app, com travamento.
- Progresso certo e visível (ex.: "6 de 10 gols"), sem poder contar o que veio antes do aceite.
- Pacote entregue sozinho ao cumprir, uma vez por vaga por mês.

**Fora da primeira versão**
- Objetivos semanais, passe de batalha, troca de objetivo, notificações ("você cumpriu o objetivo").
- Objetivos entre peladas ou coletivos.

**Antimetas (seria fracasso mesmo funcionando)**
- Pacote duplicado ou perdido por corrida (mesmo objetivo cumprido duas vezes, ou na mesma hora que outro).
- Contar gol ou nota de antes do aceite, ou de rodada que ainda não fechou.
- Objetivo que só um tipo de jogador (linha ou goleiro) consegue.
- Dado privado de outra pelada aparecendo, ou nota individual vazando (as notas são anônimas).

## Como funciona por baixo (partes decididas e chamadas minhas)

**Decidido pelo dono:** as regras acima.

**Chamadas minhas (o dono confere):**
- **Estado gravado só da escolha:** uma tabela de objetivos escolhidos (jogador, pelada, mês, nível, opção, `accepted_at`, pacote entregue em). O **progresso não é gravado**: sai do histórico das rodadas fechadas, como o XP e o ranking, só que contando rodadas **depois do aceite**.
- **"Depois do aceite" = rodadas fechadas depois do aceite cuja data não é anterior ao dia do aceite.** Rodada já jogada mas ainda aberta no momento do aceite não conta. Uma rodada aberta que fecha depois conta se a data dela é do dia do aceite ou depois.
- **Cumprir é decidido ao fechar a rodada**, dentro da mesma transação do `close_match`, junto com os prêmios (assim o pacote nasce uma vez só e o fechamento já é atômico). Rodada excluída pelo admin não conta (o dado some junto).
- **Pacote do objetivo:** a tabela `packs` hoje exige `match_id` e tem `unique (match_id, member_id)`, então o pacote do objetivo precisa de uma origem própria (ex.: coluna `source` e referência ao objetivo, com unicidade por objetivo escolhido). Reaproveita o sorteio de skin por faixa (`pack_tier_odds`, conjunto do mês, proteção contra azar não se aplica ou se aplica como definir o construtor).
- **Dependência:** só entrega pacote em pelada com `packs_enabled` e com conjunto do mês cadastrado (`pack_sets`), como o pacote da rodada. Sem isso, o cartão de objetivos nem aparece.
- **Catálogo no banco, não no código** (mudou na construção, porque quem avalia é o banco): tabela `goal_options` (chave, nível, linha ou goleiro, métrica, meta, nota mínima, texto), lida pelo app. Mudar um número = um `update`, sem migration de código. O app só guarda os nomes dos níveis e a faixa do pacote (`lib/goals.ts`).
- **Segurança:** a escolha e a leitura do próprio progresso por funções `security definer`/Server Action que conferem quem chama, como a Comunidade e o Mercado; nada de acesso direto às tabelas novas.
- **Goleiro que joga na linha (ou o contrário) numa rodada:** a posição da rodada decide quais regras valem para a nota (como já é no OVR); a escolha do jogador continua a do catálogo do cadastro. Chamada minha, simples.
- **Mês:** o mês do calendário, no fuso de Brasília, como o ranking mensal. Objetivo não aceito até o fim do mês some, sem pacote.

## Testes esperados

No PGlite, como os pacotes e o Mercado: escolha só uma vez por nível e mês; aceite no meio do mês (o que veio antes não conta); fechar rodada cumpre o objetivo e gera exatamente um pacote; fechar duas rodadas seguidas não duplica; objetivo de linha e de goleiro; pelada sem pacotes ligados; isolamento entre peladas; rodada excluída.

## Ficam para quem constrói

- Layout das telas e textos (dentro do design-system), com **prévia visual aprovada pelo dono antes do código** (regra do projeto): o cartão da Home e a página `/objetivos`.
- Os números exatos do catálogo, conferidos com o histórico real.
- Como o sorteio de skin do pacote de objetivo reaproveita o do pacote da rodada.
- Slide novo no `NewsSlider` quando for ao ar.

## Como ficou no banco (construído em 2026-11-10; migration `20261110120000_monthly_goals.sql`, teste `supabase/tests/goals/goals.mjs`, 68 verificações)

- `goal_options` (catálogo semeado com as opções do desenho) e `goal_choices` (uma escolha por jogador, mês e nível; `accepted_at`; `completed_at`), sem acesso direto.
- `accept_goal(grupo, opção)` e `get_my_goals(grupo)` para o logado (erros PA040 a PA042); `goal_progress`, `draw_goal_pack` e `evaluate_goals` internas. `close_match` chama `evaluate_goals` depois dos prêmios e dos pacotes da rodada.
- **Conta do progresso:** conta a rodada fechada depois do aceite, com data não anterior ao dia do aceite (Brasília) e no mês da escolha. Gols = confirmados (3 "sim"); "nota acima de N" = nota da rodada x 10 maior que N (estrito); carta de prêmio = prêmio individual (sem Bola Murcha, Time da Semana, Time do Mês e Campeão do Mês).
- **Pacote do objetivo** na tabela `packs` com `source = 'goal'` e `goal_choice_id`; `match_id` = a rodada que cumpriu. Unicidade: um pacote por rodada e jogador só vale para `source = 'round'`. Sorteio simples pelas chances da faixa (fácil C, médio B, difícil A), **sem** a proteção contra azar nem o boost de design (chamada minha). `get_my_packs` ganhou a coluna `source`.
- Só funciona com `packs_enabled` na pelada e `pack_sets` do mês; senão o cartão nem aparece.
- Rodada excluída pelo admin leva embora o progresso e, em cascata, o pacote de objetivo que ela tenha gerado (o objetivo continua marcado como cumprido). Caso raro, aceito.
- App: `app/_actions/goals.ts`, `app/objetivos/` (página e leitura), `app/_components/goals-card.tsx` (Home), "Objetivo cumprido" nos pacotes da Loja.
