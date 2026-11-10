-- Venda rápida de skins (2026-11-12): o jogador se desfaz de uma skin na hora, para a "casa", por um valor fixo bem abaixo do Mercado
-- (comum 20, rara 40, épica 70, lendária 150 CC; os valores ficam em `lib/market.ts`). A linha da compra fica (o preço pago continua no
-- saldo) e ganha `transferred_at`, como na venda do Mercado, e `quick_sell_coins` com o que a casa pagou; esse valor entra no saldo
-- como moedas ganhas, junto com as vendas do Mercado (`get_my_market_income`).

alter table public.card_skin_purchases
  add column quick_sell_coins integer check (quick_sell_coins is null or quick_sell_coins > 0);
comment on column public.card_skin_purchases.quick_sell_coins is
  'CanchaCoins pagas pela venda rápida (a skin saiu da posse na hora, sem comprador). Entra no saldo.';

-- Só a chave secreta chama (o servidor confere a sessão e calcula o valor pela raridade). Mesmas recusas do anúncio no Mercado.
create function public.quick_sell_skin(seller uuid, target_purchase uuid, sale_coins integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.group_members;
  purchase_row public.card_skin_purchases;
begin
  select * into member_row from public.group_members where id = seller for update;
  if member_row.id is null or member_row.deactivated_at is not null then
    raise exception 'jogador inativo' using errcode = 'PA020';
  end if;
  if exists (select 1 from public.groups g where g.id = member_row.group_id and g.suspended_at is not null) then
    raise exception 'pelada suspensa' using errcode = 'PA009';
  end if;
  if sale_coins is null or sale_coins <= 0 then
    raise exception 'valor inválido' using errcode = 'PA024';
  end if;

  select * into purchase_row from public.card_skin_purchases where id = target_purchase for update;
  if purchase_row.id is null or purchase_row.member_id <> seller or purchase_row.transferred_at is not null then
    raise exception 'skin não é sua' using errcode = 'PA021';
  end if;
  if purchase_row.skin = 'esmeralda' then
    raise exception 'carta grátis não pode ser vendida' using errcode = 'PA022';
  end if;
  if member_row.card_skin is not distinct from purchase_row.skin then
    raise exception 'skin em uso' using errcode = 'PA023';
  end if;

  perform public.market_release_expired(target_purchase);
  if exists (select 1 from public.market_listings l where l.purchase_id = target_purchase and l.status = 'active') then
    raise exception 'skin já anunciada' using errcode = 'PA025';
  end if;

  update public.card_skin_purchases set transferred_at = now(), quick_sell_coins = sale_coins where id = target_purchase;
end;
$$;
revoke execute on function public.quick_sell_skin(uuid, uuid, integer) from public, anon, authenticated;

-- O que o logado recebeu vendendo (Mercado e venda rápida), na pelada indicada: entra no saldo como moedas ganhas.
create or replace function public.get_my_market_income(target_group uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    coalesce((select sum(l.price)
                from public.market_listings l
                join public.group_members gm on gm.id = l.seller_member_id
               where l.status = 'sold' and gm.group_id = target_group and gm.user_id = (select auth.uid())), 0)
    + coalesce((select sum(cp.quick_sell_coins)
                from public.card_skin_purchases cp
                join public.group_members gm on gm.id = cp.member_id
               where cp.quick_sell_coins is not null and gm.group_id = target_group and gm.user_id = (select auth.uid())), 0)
  )::integer;
$$;
revoke execute on function public.get_my_market_income(uuid) from public, anon;
grant execute on function public.get_my_market_income(uuid) to authenticated;
