-- Pacote de boas-vindas (2026-11-13, pedido do dono do app): um pacote básico (faixa D, Reserva) de presente para cada jogador ativo,
-- para ele conhecer a mecânica e a animação de abertura. Entra em `packs` com `source = 'gift'` (sem rodada e sem preço), no máximo
-- um por jogador, sorteado do conjunto do mês pelas chances da faixa D (sem proteção contra azar). Depende da migration da Loja
-- (20261111120000). Quem roda é o dono, no SQL Editor: `select public.give_welcome_packs();` (devolve quantos pacotes saíram).

alter table public.packs drop constraint packs_source_check;
alter table public.packs add constraint packs_source_check check (source in ('round', 'goal', 'shop', 'gift'));
alter table public.packs drop constraint packs_match_check;
alter table public.packs add constraint packs_match_check check (source in ('shop', 'gift') or match_id is not null);
create unique index packs_gift_once_idx on public.packs (member_id) where source = 'gift';

-- Sorteio de uma skin do conjunto do mês pelas chances da faixa (interna): devolve a skin, a raridade e a chance real de cada raridade.
create function public.draw_pack_pick(p_month text, p_tier text)
returns table (skin text, rarity text, odds jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_w numeric;
  cut numeric;
  pick_skin text;
  odds_json jsonb;
begin
  drop table if exists pg_temp.pick_w;
  create temp table pick_w on commit drop as
    select s.skin, s.rarity, o.weight / cnt.c as w
    from public.pack_sets s
    join public.pack_tier_odds o on o.tier = p_tier and o.rarity = s.rarity
    join (select ps.rarity, count(*)::numeric as c from public.pack_sets ps where ps.month = p_month group by ps.rarity) cnt
      on cnt.rarity = s.rarity
    where s.month = p_month;
  select sum(w) into total_w from pg_temp.pick_w;
  if total_w is null or total_w = 0 then
    raise exception 'sem conjunto de pacotes para o mês' using errcode = 'PA042';
  end if;
  select jsonb_object_agg(r.rarity, round(100 * r.sw / total_w, 1)) into odds_json
  from (select p.rarity, sum(p.w) as sw from pg_temp.pick_w p group by p.rarity) r;
  cut := random() * total_w;
  select x.skin into pick_skin from (
    select p.skin, sum(p.w) over (order by p.skin) as cum from pg_temp.pick_w p
  ) x where x.cum >= cut order by x.cum limit 1;
  return query select s.skin, s.rarity, odds_json from public.pack_sets s where s.month = p_month and s.skin = pick_skin;
end;
$$;
revoke execute on function public.draw_pack_pick(text, text) from public, anon, authenticated;

-- Dá o pacote de boas-vindas (faixa D) a cada jogador ativo que ainda não ganhou um. Pode rodar de novo sem duplicar.
create function public.give_welcome_packs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack_month text := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM');
  member_row record;
  pick record;
  given integer := 0;
begin
  for member_row in
    select gm.id, gm.group_id
    from public.group_members gm
    where gm.deactivated_at is null
      and not exists (select 1 from public.packs p where p.member_id = gm.id and p.source = 'gift')
  loop
    select * into pick from public.draw_pack_pick(pack_month, 'D');
    insert into public.packs (group_id, member_id, match_id, month, tier, rarity, skin, odds, source)
    values (member_row.group_id, member_row.id, null, pack_month, 'D', pick.rarity, pick.skin, pick.odds, 'gift');
    given := given + 1;
  end loop;
  return given;
end;
$$;
revoke execute on function public.give_welcome_packs() from public, anon, authenticated;
