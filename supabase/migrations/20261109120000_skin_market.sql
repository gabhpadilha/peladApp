-- Mercado de transferências de skins (design em docs/superpowers/specs/2026-11-09-mercado-skins-design.md).
-- Aberto entre todas as peladas, só "Comprar agora", anúncio de 24 h, sem taxa, faixa de preço validada no servidor.
--
-- Posse: `card_skin_purchases` continua sendo o histórico do que cada um pagou (o saldo = moedas ganhas − soma de `price`).
-- Uma skin vendida no Mercado NÃO sai da tabela (senão o vendedor recuperaria o preço pago): a linha ganha `transferred_at`
-- e deixa de contar como posse. Quem compra ganha uma linha nova com `source = 'market'` e o preço do anúncio.
-- O que o vendedor recebe vem dos anúncios vendidos (`get_my_market_income`), somado às moedas ganhas no app.

-- 1. Posse transferível -------------------------------------------------------------------------------------------------
alter table public.card_skin_purchases
  add column transferred_at timestamptz;

comment on column public.card_skin_purchases.transferred_at is
  'Quando a skin foi vendida no Mercado (a linha fica, porque o preço pago entra no saldo; deixa de contar como posse).';

alter table public.card_skin_purchases drop constraint if exists card_skin_purchases_source_check;
alter table public.card_skin_purchases
  add constraint card_skin_purchases_source_check check (source in ('shop', 'pack', 'market'));

-- Uma cópia em posse por jogador e skin (quem vendeu pode comprar a mesma skin de novo).
alter table public.card_skin_purchases drop constraint if exists card_skin_purchases_member_id_skin_key;
create unique index card_skin_purchases_owned_key
  on public.card_skin_purchases (member_id, skin) where transferred_at is null;

-- 2. Anúncios -----------------------------------------------------------------------------------------------------------
create table public.market_listings (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.card_skin_purchases (id) on delete cascade,
  seller_member_id uuid not null references public.group_members (id) on delete cascade,
  seller_group_id uuid not null references public.groups (id) on delete cascade,
  skin text not null,
  price integer not null check (price > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_member_id uuid references public.group_members (id) on delete set null,
  sold_at timestamptz,
  check (expires_at > created_at),
  check ((status = 'sold') = (sold_at is not null))
);

comment on table public.market_listings is
  'Anúncios do Mercado. "Vencido" não é um estado gravado: é ativo com expires_at no passado (a skin volta a ficar livre).';

create index market_listings_open_idx on public.market_listings (expires_at desc) where status = 'active';
create index market_listings_seller_idx on public.market_listings (seller_member_id, created_at desc);
-- Uma skin só pode estar num anúncio ativo por vez (o vencido é liberado pela função ao anunciar de novo).
create unique index market_listings_one_active_idx on public.market_listings (purchase_id) where status = 'active';

alter table public.market_listings enable row level security;
revoke all on public.market_listings from anon, authenticated;
-- Sem policy: ninguém lê nem grava direto. Leitura pelo servidor (chave secreta) e pelas funções abaixo.

-- 3. Funções (só a chave secreta chama as que mudam dados; o servidor confere a sessão, o nível de acesso e o saldo) ---

-- Fecha um anúncio vencido (ativo com prazo no passado) como cancelado, liberando a skin. Interna.
create function public.market_release_expired(target_purchase uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.market_listings
     set status = 'cancelled'
   where purchase_id = target_purchase and status = 'active' and expires_at <= now();
$$;
revoke execute on function public.market_release_expired(uuid) from public, anon, authenticated;

-- Anuncia uma skin em posse. O preço já vem validado pela faixa no servidor (lib/market.ts).
create function public.market_list(seller uuid, target_purchase uuid, ask_price integer, hours integer default 24)
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
  if member_row.card_skin is not distinct from purchase_row.skin then
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

-- Cancela um anúncio ativo do próprio jogador.
create function public.market_cancel(seller uuid, target_listing uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.market_listings
     set status = 'cancelled'
   where id = target_listing and seller_member_id = seller and status = 'active';
  if not found then
    raise exception 'anúncio não encontrado' using errcode = 'PA027';
  end if;
end;
$$;
revoke execute on function public.market_cancel(uuid, uuid) from public, anon, authenticated;

-- Compra na hora. `earned` = moedas ganhas no app (rodadas, pacotes e vendas), calculadas no servidor; o que já foi gasto
-- é somado aqui dentro, com a linha do comprador travada: duas compras ao mesmo tempo não gastam o mesmo saldo.
create function public.market_buy(buyer uuid, target_listing uuid, earned integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  buyer_row public.group_members;
  listing_row public.market_listings;
  spent integer;
begin
  select * into buyer_row from public.group_members where id = buyer for update;
  if buyer_row.id is null or buyer_row.deactivated_at is not null then
    raise exception 'jogador inativo' using errcode = 'PA020';
  end if;
  if exists (select 1 from public.groups g where g.id = buyer_row.group_id and g.suspended_at is not null) then
    raise exception 'pelada suspensa' using errcode = 'PA009';
  end if;

  select * into listing_row from public.market_listings where id = target_listing for update;
  if listing_row.id is null or listing_row.status <> 'active' or listing_row.expires_at <= now() then
    raise exception 'anúncio indisponível' using errcode = 'PA028';
  end if;
  if listing_row.seller_member_id = buyer then
    raise exception 'anúncio próprio' using errcode = 'PA029';
  end if;
  if exists (select 1 from public.group_members gm join public.groups g on g.id = gm.group_id
              where gm.id = listing_row.seller_member_id and (gm.deactivated_at is not null or g.suspended_at is not null)) then
    raise exception 'anúncio indisponível' using errcode = 'PA028';
  end if;
  if exists (select 1 from public.card_skin_purchases cp
              where cp.member_id = buyer and cp.skin = listing_row.skin and cp.transferred_at is null) then
    raise exception 'já tem a skin' using errcode = 'PA030';
  end if;

  select coalesce(sum(cp.price), 0) into spent from public.card_skin_purchases cp where cp.member_id = buyer;
  if earned - spent < listing_row.price then
    raise exception 'saldo insuficiente' using errcode = 'PA031';
  end if;

  update public.card_skin_purchases set transferred_at = now() where id = listing_row.purchase_id;
  -- Segurança: a skin vendida nunca fica em uso por quem vendeu (o servidor já impede usar skin anunciada).
  update public.group_members set card_skin = null where id = listing_row.seller_member_id and card_skin = listing_row.skin;
  insert into public.card_skin_purchases (group_id, member_id, skin, price, source)
  values (buyer_row.group_id, buyer, listing_row.skin, listing_row.price, 'market');
  update public.market_listings set status = 'sold', buyer_member_id = buyer, sold_at = now() where id = listing_row.id;
  return listing_row.skin;
end;
$$;
revoke execute on function public.market_buy(uuid, uuid, integer) from public, anon, authenticated;

-- O que o logado já recebeu vendendo no Mercado, na pelada indicada (entra no saldo como moedas ganhas).
create function public.get_my_market_income(target_group uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(l.price), 0)::integer
    from public.market_listings l
    join public.group_members gm on gm.id = l.seller_member_id
   where l.status = 'sold' and gm.group_id = target_group and gm.user_id = (select auth.uid());
$$;
revoke execute on function public.get_my_market_income(uuid) from public, anon;
grant execute on function public.get_my_market_income(uuid) to authenticated;

-- 4. Usar uma skin exige tê-la em posse e não anunciada (o servidor também confere) -----------------------------------
-- Pacote: "repetida" passa a ser só a cópia ainda em posse (quem vendeu e tira de novo ganha a skin de volta).
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
    select c.coins into dup_coins from public.pack_rarity_coins c where c.rarity = pack_row.rarity;
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
