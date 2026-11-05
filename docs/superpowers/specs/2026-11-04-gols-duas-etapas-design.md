# Gols em duas etapas — design

Data: 2026-11-04. Decisão do dono do app depois de testar o fluxo dos gols ("gols é uma coisa, estatísticas são outra";
a galera dá nota em sequência e não pode "passar sem votar" os gols de alguém, nem virar uma "salada de fruta").

## O que o teste achou (antes desta mudança)
- A confirmação dos gols só existia dentro das telas de nota (opcional): quem já enviou as notas não conseguia mais confirmar.
- Corrigir um número zerava as confirmações sem aviso, e quem tinha passado para as notas não podia reconfirmar.
- A confirmação valia para o número atual, não para o que o colega tinha visto (tela desatualizada).
- A tela "Esperando os gols" não tinha saída.

## Fluxo agora (duas votações fechadas)
**Etapa 1, Gols:** (1) cada um informa os seus gols; (2) com todos informados, cada um confere os gols dos colegas
(Confirmo / Não foi isso / "Está tudo certo": confirmar todos) e conclui; (3) as notas abrem quando todos informaram e
concluíram a conferência, ou quando o organizador libera. **Etapa 2, Notas:** só notas, sem nada de gol.

## Regras (banco: `supabase/migrations/20261104120000_goals_check_stage.sql`)
- Concluir exige **participação, não aprovação**: "não" ou colega sem confirmar nunca trava as notas. 3 "sim" continuam
  validando os gols; sem eles, só não há Goleador/XP dos gols.
- `match_attendance.goals_checked_at` + `finish_goal_check`; `ratings_open` = liberado pelo organizador, ou todos informaram
  e conferiram. A abertura é gravada (`ratings_unlocked_at`) e nenhuma correção trava as notas de novo.
- Corrigir um número **durante a etapa dos gols** apaga as confirmações dele e manda os outros conferirem de novo.
- **Depois que as notas abrem**, o jogador não corrige mais os próprios gols (PA007); o organizador corrige e a mesa tática
  mostra "Gols para confirmar" para reconfirmar.
- O organizador que informa por alguém (sem celular, desativado) dá a conferência dele por feita.
- `confirm_goals(..., expected_goals)` recusa se o número mudou (PA008); sem o parâmetro continua valendo (compatível).
- Rodadas abertas antes da migration ficam com as notas liberadas.

## Telas
`/avaliar/[id]`: informar → espera (quem falta informar) → conferir (`GoalsCheckStep`, `GoalsVoteList`) → espera (quem falta
concluir) → notas (`RatingWizard`, sem gols). Todas dizem "Etapa 1 de 2 · Gols" / "Etapa 2 de 2: notas" e a espera tem
"Voltar ao Início". Mesa tática (`RoundGoals`): mensagens por etapa, "Conferir os gols", "Corrigir" só até as notas abrirem
(depois, só o organizador) e "Gols para confirmar".

## Teste
`supabase/tests/goals-flow/` (PGlite): 45 verificações e 60 rodadas aleatórias contra um modelo independente, 0 divergências.
