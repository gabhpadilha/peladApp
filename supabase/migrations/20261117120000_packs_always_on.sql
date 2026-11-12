-- Pacotes sempre ligados (decisão do dono do app em 2026-11-12: "não tem por que ligar e desligar").
-- Toda pelada, as que existem e as novas, gera pacotes ao fechar a rodada; o painel de admin não tem mais o interruptor.
-- A coluna fica (as funções `draw_round_packs` e dos objetivos ainda a leem), sempre verdadeira.
-- O mínimo de jogadores presentes (`pack_min_players`, padrão 10) continua valendo.

alter table public.groups alter column packs_enabled set default true;

update public.groups set packs_enabled = true where not packs_enabled;

comment on column public.groups.packs_enabled is 'Sempre verdadeiro desde 2026-11-12: pacotes ligados em toda pelada (não há mais interruptor no painel).';
