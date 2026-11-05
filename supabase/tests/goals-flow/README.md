# Teste do fluxo dos gols (banco, sem Docker)

Roda todas as migrations num Postgres em memória (PGlite, com `auth`, `storage` e os papéis do Supabase simulados) e
confere as regras da votação dos gols em duas etapas: informar, conferir, confirmar, liberar, enviar as notas e fechar
(45 verificações + 60 rodadas aleatórias contra um modelo independente). Não toca no banco real.

```bash
npm install --no-save @electric-sql/pglite
REPO=$(pwd) node supabase/tests/goals-flow/goals-two-stages.mjs
```

Mudou uma regra em `report_goals`, `confirm_goals`, `finish_goal_check`, `unlock_ratings` ou `ratings_open`? Rode antes de aplicar
a migration. `boot.mjs` aplica `supabase/migrations/*.sql` em ordem; se uma migration futura usar algo do Supabase que o
`boot.mjs` não simula, acrescente o stub lá. Design em `docs/superpowers/specs/2026-11-04-gols-duas-etapas-design.md`.
