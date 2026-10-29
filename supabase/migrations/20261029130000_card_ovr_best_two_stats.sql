-- OVR da carta = média das 2 maiores das 3 estatísticas (decisão do dono do app em
-- 2026-10-29: a mais fraca sai). Antes, desde 20261029120200, era a média das 3.
-- Espelha `getOvrFromStats`/`OVR_COUNTED_STATS` em lib/card-stats.ts: cada estatística é
-- a média do par de atributos, arredondada; o OVR é a média das 2 maiores, arredondada.
-- Só muda o OVR congelado nas cartas de prêmio novas; as já distribuídas ficam.

create or replace function public.card_ovr(variadic vals smallint[])
returns smallint
language sql
immutable
set search_path = ''
as $$
  with stats as (
    select round(avg(v)) as stat
    from unnest(vals) with ordinality as item(v, i)
    group by (i - 1) / 2
  ),
  best as (
    select stat from stats where stat is not null order by stat desc limit 2
  )
  select round(avg(stat))::smallint from best;
$$;

revoke execute on function public.card_ovr(smallint[]) from public, anon, authenticated;
