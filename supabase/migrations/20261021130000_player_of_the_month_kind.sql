-- Carta especial Jogador do Mês. Fica sozinho nesta migration: o Postgres só
-- deixa usar um valor novo de enum depois que a transação que o criou termina.

alter type public.award_kind add value if not exists 'jogador_do_mes';
