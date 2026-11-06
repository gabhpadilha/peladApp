-- Várias peladas no mesmo app (decisão do dono do app em 2026-11-06; design em docs/superpowers/specs/2026-11-06-multi-pelada-design.md).
--  - nome da pelada único (sem diferenciar maiúsculas, acentos, espaços e pontuação), alterável só pelo dono, por função;
--  - código curto da pelada (`slug`) para os usuários novos (`joao.cancha`); mexer nele só pelo painel de admin (chave secreta);
--  - pelada suspensa: continua visível, mas não cria rodada nova (PA009);
--  - perfil: marca de admin da plataforma (só por SQL) e aceite dos termos (por função);
--  - nenhuma coluna de `groups` e `profiles` além das já liberadas pode ser alterada com o login do jogador.

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------

alter table public.groups
  add column slug text check (slug ~ '^[a-z0-9]{3,6}$'),
  add column suspended_at timestamptz,
  add column name_key text;

comment on column public.groups.slug is
  'Código curto da pelada, sufixo dos usuários novos (joao.cancha). Só o painel de admin (chave secreta) grava. Nulo na pelada antiga.';
comment on column public.groups.suspended_at is
  'Pelada suspensa (inadimplência): os dados ficam e todos veem, mas ninguém cria rodada nova (PA009). Só o painel de admin grava.';

-- Chave de comparação do nome: minúsculas, sem acento e só letras e números.
create function public.group_name_key(group_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(lower(group_name), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+', '', 'g'
  );
$$;

create function public.groups_set_name_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name_key := public.group_name_key(new.name);
  if new.name_key = '' then
    raise exception 'group name needs letters or numbers' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.groups_set_name_key() from public, anon, authenticated;

update public.groups set name_key = public.group_name_key(name);
alter table public.groups alter column name_key set not null;
create unique index groups_name_key_key on public.groups (name_key);
create unique index groups_slug_key on public.groups (slug) where slug is not null;

create trigger groups_name_key
  before insert or update of name on public.groups
  for each row execute function public.groups_set_name_key();

-- O login do jogador não altera `groups` direto: só pelas funções abaixo (o dono renomeia; o resto é do painel de admin).
revoke update on public.groups from authenticated;

-- O dono renomeia a pelada. PA010 = nome já em uso.
create function public.rename_group(target_group uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  if not public.is_group_owner(target_group) then
    raise exception 'only the group owner renames the group' using errcode = '42501';
  end if;
  if char_length(clean_name) not between 2 and 60 then
    raise exception 'group name must have 2 to 60 characters' using errcode = '23514';
  end if;
  begin
    update public.groups set name = clean_name where id = target_group;
  exception when unique_violation then
    raise exception 'group name already in use' using errcode = 'PA010';
  end;
end;
$$;
revoke execute on function public.rename_group(uuid, text) from public, anon;
grant execute on function public.rename_group(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Pelada suspensa não cria rodada nova (o resto continua: ver, fechar a rodada aberta, comprar com o saldo).
-- ---------------------------------------------------------------------------

create or replace function public.create_match(
  target_group uuid,
  match_date date,
  present_member_ids uuid[],
  team_numbers smallint[],
  reserve_flags boolean[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_match_id uuid;
  next_round integer;
begin
  if exists (select 1 from public.groups g where g.id = target_group and g.suspended_at is not null) then
    raise exception 'group suspended' using errcode = 'PA009';
  end if;

  if coalesce(array_length(present_member_ids, 1), 0) < 2 then
    raise exception 'at least two players must be present';
  end if;

  if array_length(present_member_ids, 1) <> coalesce(array_length(team_numbers, 1), 0)
     or array_length(present_member_ids, 1) <> coalesce(array_length(reserve_flags, 1), 0) then
    raise exception 'every present player needs a team and a reserve flag';
  end if;

  if exists (select 1 from unnest(team_numbers) as t (team) where t.team not in (1, 2)) then
    raise exception 'teams are 1 (white) and 2 (black)';
  end if;

  -- Pelo menos 2 titulares em quadra.
  if (select count(*) from unnest(reserve_flags) as r (reserve) where not r.reserve) < 2 then
    raise exception 'at least two starters are needed';
  end if;

  if exists (
    select 1
    from unnest(present_member_ids) as present (member_id)
    where not exists (
      select 1 from public.group_members gm
      where gm.id = present.member_id
        and gm.group_id = target_group
        and gm.deactivated_at is null
    )
  ) then
    raise exception 'only active players of the group can be present';
  end if;

  select coalesce(max(round), 0) + 1 into next_round
  from public.matches
  where group_id = target_group;

  insert into public.matches (group_id, round, played_on, created_by)
  values (target_group, next_round, match_date, (select auth.uid()))
  returning id into new_match_id;

  insert into public.match_attendance (group_id, match_id, member_id, team, reserve)
  select target_group, new_match_id, player.member_id, player.team, player.reserve
  from unnest(present_member_ids, team_numbers, reserve_flags) as player (member_id, team, reserve);

  return new_match_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: admin da plataforma e aceite dos termos
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column is_platform_admin boolean not null default false,
  add column terms_accepted_at timestamptz,
  add column terms_version text;

comment on column public.profiles.is_platform_admin is
  'Admin da plataforma (painel /admin). Só se liga por SQL, uma vez; o jogador nunca escreve aqui (só full_name é liberado).';

-- Cada um aceita os termos por esta função (o grant de update em profiles só libera full_name).
create function public.accept_terms(terms_version_accepted text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  update public.profiles
  set terms_accepted_at = now(), terms_version = left(terms_version_accepted, 20)
  where id = (select auth.uid());
end;
$$;
revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;
