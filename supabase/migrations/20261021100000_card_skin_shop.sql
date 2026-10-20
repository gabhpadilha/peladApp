-- Loja de personalizações de carta (PeladaCoins).
-- O XP, o nível e as PeladaCoins ganhas são calculados no app a partir das
-- notas e prêmios (como o OVR); aqui ficam só as compras e a carta em uso.
-- Quem grava é o servidor (chave secreta), depois de conferir nível e saldo.

-- Carta em uso de cada jogador (null = carta padrão, pela faixa do OVR).
alter table public.group_members add column card_skin text;

create table public.card_skin_purchases (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  skin text not null,
  -- Preço pago (o saldo = PeladaCoins ganhas − soma do que já foi pago).
  price integer not null check (price >= 0),
  created_at timestamptz not null default now(),
  unique (member_id, skin)
);

create index card_skin_purchases_group_id_idx on public.card_skin_purchases (group_id);

alter table public.card_skin_purchases enable row level security;

-- Todos da pelada veem as compras (o saldo de cada um aparece na loja dele).
-- Sem policy de escrita: só a chave secreta grava.
create policy "card_skin_purchases: membros leem"
  on public.card_skin_purchases for select to authenticated
  using (public.is_group_member(group_id));

-- O jogador continua editando o próprio apelido, mas não a carta em uso: ela só
-- muda pelo servidor, que confere se a carta foi comprada.
create or replace function public.guard_member_self_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.position is distinct from old.position
    and (select auth.uid()) is not null
    and not public.is_group_owner(new.group_id) then
    raise exception 'only the group owner can change positions' using errcode = '42501';
  end if;
  if new.card_skin is distinct from old.card_skin and (select auth.uid()) is not null then
    raise exception 'card skins change only through the shop' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_member_self_update() from public, anon, authenticated;

-- Quem enviou notas em cada rodada fechada (só quem, nunca as notas): o XP e as
-- PeladaCoins dão bônus para quem avalia.
create function public.get_member_submissions(target_group uuid)
returns table (match_id uuid, member_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct e.match_id, e.evaluator_id
  from public.evaluations e
  join public.matches m on m.id = e.match_id
  where m.group_id = target_group
    and m.status = 'closed'
    and public.is_group_member(target_group);
$$;

revoke execute on function public.get_member_submissions(uuid) from public, anon;
grant execute on function public.get_member_submissions(uuid) to authenticated;
