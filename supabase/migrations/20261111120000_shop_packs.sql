-- Pacotes à venda na Loja (2026-11-11). A Loja deixa de vender skins de evento e passa a vender pacotes por faixa (A Craque, B Destaque,
-- C Pelada, D Reserva) com CanchaCoins. O pacote comprado entra em `packs` com `source = 'shop'`, sem rodada (`match_id` nulo) e com o
-- preço pago (`price`). Sorteio simples pelas chances da faixa, sem proteção contra azar nem garantia (essas ficam nos pacotes de rodada).
-- O saldo é calculado no app: o preço dos pacotes comprados é descontado das moedas ganhas (`get_my_packs` devolve o preço).

alter table public.packs drop constraint packs_source_check;
alter table public.packs add constraint packs_source_check check (source in ('round', 'goal', 'shop'));
alter table public.packs alter column match_id drop not null;
alter table public.packs add column price integer check (price is null or price > 0);
alter table public.packs
  add constraint packs_shop_check check ((source = 'shop') = (price is not null)),
  add constraint packs_match_check check (source = 'shop' or match_id is not null);

-- get_my_packs: agora com a pelada e o preço, e rodada opcional (pacote da Loja não tem rodada).
drop function public.get_my_packs();
create function public.get_my_packs()
returns table (
  pack_id uuid, group_id uuid, match_id uuid, round integer, month text, tier text, odds jsonb, created_at timestamptz,
  opened_at timestamptz, skin text, rarity text, was_duplicate boolean, coins_awarded integer, source text, price integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.group_id, p.match_id, m.round, p.month, p.tier, p.odds, p.created_at, p.opened_at,
    case when p.opened_at is not null then p.skin end,
    case when p.opened_at is not null then p.rarity end,
    p.was_duplicate, p.coins_awarded, p.source, p.price
  from public.packs p
  join public.group_members gm on gm.id = p.member_id
  left join public.matches m on m.id = p.match_id
  where gm.user_id = (select auth.uid())
  order by p.created_at, p.id;
$$;
revoke execute on function public.get_my_packs() from public, anon;
grant execute on function public.get_my_packs() to authenticated;

-- Compra (só a chave secreta chama; o servidor confere a sessão e calcula o preço e `earned_gross`, as moedas ganhas SEM descontar
-- os pacotes da Loja). Com a linha do comprador travada, duas compras ao mesmo tempo não gastam o mesmo saldo.
create function public.shop_buy_pack(buyer uuid, target_tier text, target_price integer, earned_gross integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  buyer_row public.group_members;
  pack_month text := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM');
  spent integer;
  total_w numeric;
  cut numeric;
  pick_skin text;
  odds_json jsonb;
  new_id uuid;
begin
  if target_tier not in ('A', 'B', 'C', 'D') or target_price is null or target_price <= 0 then
    raise exception 'pacote inválido' using errcode = 'PA043';
  end if;
  select * into buyer_row from public.group_members where id = buyer for update;
  if buyer_row.id is null or buyer_row.deactivated_at is not null then
    raise exception 'jogador inativo' using errcode = 'PA020';
  end if;
  if exists (select 1 from public.groups g where g.id = buyer_row.group_id and g.suspended_at is not null) then
    raise exception 'pelada suspensa' using errcode = 'PA009';
  end if;

  select coalesce((select sum(cp.price) from public.card_skin_purchases cp where cp.member_id = buyer), 0)
       + coalesce((select sum(p.price) from public.packs p where p.member_id = buyer and p.source = 'shop'), 0)
    into spent;
  if earned_gross - spent < target_price then
    raise exception 'saldo insuficiente' using errcode = 'PA031';
  end if;

  drop table if exists pg_temp.shop_w;
  create temp table shop_w on commit drop as
    select s.skin, s.rarity, o.weight / cnt.c as w
    from public.pack_sets s
    join public.pack_tier_odds o on o.tier = target_tier and o.rarity = s.rarity
    join (select ps.rarity, count(*)::numeric as c from public.pack_sets ps where ps.month = pack_month group by ps.rarity) cnt
      on cnt.rarity = s.rarity
    where s.month = pack_month;
  select sum(w) into total_w from pg_temp.shop_w;
  if total_w is null or total_w = 0 then
    raise exception 'sem conjunto de pacotes para o mês' using errcode = 'PA042';
  end if;
  select jsonb_object_agg(r.rarity, round(100 * r.sw / total_w, 1)) into odds_json
  from (select rarity, sum(w) as sw from pg_temp.shop_w group by rarity) r;

  cut := random() * total_w;
  select x.skin into pick_skin from (
    select skin, sum(w) over (order by skin) as cum from pg_temp.shop_w
  ) x where x.cum >= cut order by x.cum limit 1;

  insert into public.packs (group_id, member_id, match_id, month, tier, rarity, skin, odds, source, price)
  select buyer_row.group_id, buyer, null, pack_month, target_tier, s.rarity, s.skin, odds_json, 'shop', target_price
  from public.pack_sets s where s.month = pack_month and s.skin = pick_skin
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.shop_buy_pack(uuid, text, integer, integer) from public, anon, authenticated;
