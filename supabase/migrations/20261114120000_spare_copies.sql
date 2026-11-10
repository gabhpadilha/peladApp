-- Skin repetida vira cópia extra (2026-11-14, pedido do dono do app): ao abrir um pacote com uma skin que o jogador já tem, em vez de virar
-- moedas na hora, ela fica guardada como cópia extra ("Repetida") e o jogador escolhe depois entre vender no Mercado e a venda rápida
-- (20/40/70/150 CC). A cópia extra é uma linha de `card_skin_purchases` com `is_spare` (preço 0); a posse "de verdade" continua sendo
-- uma só por skin. Vender usa a cópia extra primeiro, e ela pode ser vendida mesmo com a skin em uso. Depende das migrations do Mercado
-- (20261109120000) e da venda rápida (20261112120000).

alter table public.card_skin_purchases add column is_spare boolean not null default false;
comment on column public.card_skin_purchases.is_spare is
  'Cópia extra de uma skin que o jogador já tem (repetida de pacote): só serve para vender; não conta como posse.';
drop index public.card_skin_purchases_owned_key;
create unique index card_skin_purchases_owned_key
  on public.card_skin_purchases (member_id, skin) where transferred_at is null and not is_spare;

create or replace function public.market_list(seller uuid, target_purchase uuid, ask_price integer, hours integer default 24)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.group_members;
  purchase_row public.card_skin_purchases;
  listing_id uuid;
begin
  select * into member_row from public.group_members where id = seller for update;
  if member_row.id is null or member_row.deactivated_at is not null then
    raise exception 'jogador inativo' using errcode = 'PA020';
  end if;
  if exists (select 1 from public.groups g where g.id = member_row.group_id and g.suspended_at is not null) then
    raise exception 'pelada suspensa' using errcode = 'PA009';
  end if;

  select * into purchase_row from public.card_skin_purchases where id = target_purchase for update;
  if purchase_row.id is null or purchase_row.member_id <> seller or purchase_row.transferred_at is not null then
    raise exception 'skin não é sua' using errcode = 'PA021';
  end if;
  if purchase_row.skin = 'esmeralda' then
    raise exception 'carta grátis não pode ser vendida' using errcode = 'PA022';
  end if;
  if member_row.card_skin is not distinct from purchase_row.skin and not purchase_row.is_spare then
    raise exception 'skin em uso' using errcode = 'PA023';
  end if;
  if ask_price is null or ask_price <= 0 or hours is null or hours <= 0 or hours > 72 then
    raise exception 'anúncio inválido' using errcode = 'PA024';
  end if;

  perform public.market_release_expired(target_purchase);
  if exists (select 1 from public.market_listings l where l.purchase_id = target_purchase and l.status = 'active') then
    raise exception 'skin já anunciada' using errcode = 'PA025';
  end if;
  if (select count(*) from public.market_listings l
       where l.seller_member_id = seller and l.status = 'active' and l.expires_at > now()) >= 10 then
    raise exception 'limite de anúncios' using errcode = 'PA026';
  end if;

  insert into public.market_listings (purchase_id, seller_member_id, seller_group_id, skin, price, expires_at)
  values (target_purchase, seller, member_row.group_id, purchase_row.skin, ask_price, now() + make_interval(hours => hours))
  returning id into listing_id;
  return listing_id;
end;
$$;
revoke execute on function public.market_list(uuid, uuid, integer, integer) from public, anon, authenticated;

create or replace function public.quick_sell_skin(seller uuid, target_purchase uuid, sale_coins integer)
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
  if member_row.card_skin is not distinct from purchase_row.skin and not purchase_row.is_spare then
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

create or replace function public.open_pack(target_pack uuid)
returns table (skin text, rarity text, was_duplicate boolean, coins_awarded integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack_row public.packs;
  owner_user uuid;
  is_dup boolean;
  dup_coins integer;
begin
  select p.* into pack_row from public.packs p where p.id = target_pack;
  select gm.user_id into owner_user from public.group_members gm where gm.id = pack_row.member_id and gm.deactivated_at is null;
  if pack_row.id is null or owner_user is distinct from (select auth.uid()) then
    raise exception 'not your pack' using errcode = '42501';
  end if;

  if pack_row.opened_at is not null then
    return query select pack_row.skin, pack_row.rarity, pack_row.was_duplicate, pack_row.coins_awarded;
    return;
  end if;

  select exists (
    select 1 from public.card_skin_purchases cp
     where cp.member_id = pack_row.member_id and cp.skin = pack_row.skin and cp.transferred_at is null
  ) into is_dup;

  if is_dup then
    -- Repetida: vira uma cópia extra na coleção (sem moedas na hora); o jogador decide depois entre o Mercado e a venda rápida.
    dup_coins := 0;
    insert into public.card_skin_purchases (group_id, member_id, skin, price, source, is_spare)
    values (pack_row.group_id, pack_row.member_id, pack_row.skin, 0, 'pack', true);
  else
    dup_coins := 0;
    insert into public.card_skin_purchases (group_id, member_id, skin, price, source)
    values (pack_row.group_id, pack_row.member_id, pack_row.skin, 0, 'pack');
  end if;

  update public.packs set opened_at = now(), was_duplicate = is_dup, coins_awarded = dup_coins where id = pack_row.id;
  return query select pack_row.skin, pack_row.rarity, is_dup, dup_coins;
end;
$$;
revoke execute on function public.open_pack(uuid) from public, anon;
grant execute on function public.open_pack(uuid) to authenticated;
