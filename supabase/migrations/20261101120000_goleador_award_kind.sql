-- Goleador da Rodada (2026-11-01): carta nova de destaque para quem teve mais gols
-- confirmados na rodada. Valor novo do enum numa migration própria (não pode ser usado
-- na mesma transação em que é criado).
alter type public.award_kind add value if not exists 'goleador';
