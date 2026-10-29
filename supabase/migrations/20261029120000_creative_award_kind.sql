-- Prêmio novo "Mais Criativo" (decisão do dono do app em 2026-10-29): maior média de
-- Criação (passe + drible). Fica sozinho nesta migration: o Postgres só deixa usar um
-- valor novo de enum depois que a transação que o criou termina.

alter type public.award_kind add value if not exists 'criativo';
