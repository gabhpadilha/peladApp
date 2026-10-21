-- Prêmios novos dos atributos da linha (decisão do dono do app em 2026-10-21):
-- Foguete da Rodada (VEL), Garçom da Rodada (PAS) e Motor da Rodada (FIS).
-- Fica sozinho nesta migration: o Postgres só deixa usar um valor novo de enum
-- depois que a transação que o criou termina.

alter type public.award_kind add value if not exists 'foguete';
alter type public.award_kind add value if not exists 'garcom';
alter type public.award_kind add value if not exists 'motor';
