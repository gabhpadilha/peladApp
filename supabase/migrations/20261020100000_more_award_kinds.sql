-- Novas cartas especiais. Fica sozinho nesta migration: o Postgres só deixa usar
-- um valor novo de enum depois que a transação que o criou termina.
--   Por voto: Drible da Rodada, Melhor Atacante, Melhor Defensor, Melhor Goleiro,
--   Fair Play e Fominha (além de craque = Melhor Jogador, gol = Gol da Rodada e
--   bola_murcha, que mantêm a chave antiga).
--   Sem voto: Time da Semana, calculado pelas notas ao fechar a rodada.

alter type public.award_kind add value if not exists 'drible';
alter type public.award_kind add value if not exists 'atacante';
alter type public.award_kind add value if not exists 'defensor';
alter type public.award_kind add value if not exists 'goleiro';
alter type public.award_kind add value if not exists 'fair_play';
alter type public.award_kind add value if not exists 'fominha';
alter type public.award_kind add value if not exists 'time_da_semana';
