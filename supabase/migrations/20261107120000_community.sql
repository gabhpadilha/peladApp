-- Comunidade entre peladas (decisão do dono do app em 2026-11-06; design em docs/superpowers/specs/2026-11-06-comunidade-design.md).
-- Princípio: de fora, ninguém lê tabela privada de outra pelada. A comunidade lê só:
--  - `group_showcase`: recorte público que a própria pelada grava (apelido, carta, OVR, pontos, gols; nunca notas);
--  - `feed_posts`: conquistas que o próprio jogador decidiu publicar.
-- Tudo é desligado por padrão: o Administrador liga a pelada (`listed_at`) e cada jogador liga o próprio perfil (`public_profile_at`).
-- As leituras são funções `security definer` que só devolvem campos seguros; as tabelas novas não têm acesso direto.

alter table public.groups add column listed_at timestamptz;
comment on column public.groups.listed_at is 'A pelada aparece na comunidade (nulo = não aparece). Só o Administrador liga, por set_group_listed.';

alter table public.group_members add column public_profile_at timestamptz;
comment on column public.group_members.public_profile_at is 'O jogador aceitou aparecer fora da pelada (ranking público, perfil e feed). Só por set_public_profile.';

-- ---------------------------------------------------------------------------
-- Liga e desliga
-- ---------------------------------------------------------------------------

create function public.set_group_listed(target_group uuid, listed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_group_owner(target_group) then
    raise exception 'only the group owner lists the group' using errcode = '42501';
  end if;
  update public.groups set listed_at = case when listed then coalesce(listed_at, now()) else null end
  where id = target_group;
end;
$$;
revoke execute on function public.set_group_listed(uuid, boolean) from public, anon;
grant execute on function public.set_group_listed(uuid, boolean) to authenticated;

create function public.set_public_profile(target_member uuid, visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.group_members
  set public_profile_at = case when visible then coalesce(public_profile_at, now()) else null end
  where id = target_member and user_id = (select auth.uid()) and deactivated_at is null;
  if not found then
    raise exception 'not your membership' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.set_public_profile(uuid, boolean) from public, anon;
grant execute on function public.set_public_profile(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Recorte público da pelada (gravado só pela chave secreta, nas actions da própria pelada)
-- ---------------------------------------------------------------------------

create table public.group_showcase (
  group_id uuid primary key references public.groups (id) on delete cascade,
  updated_at timestamptz not null default now(),
  players jsonb not null default '[]'::jsonb
);
alter table public.group_showcase enable row level security;
revoke all on public.group_showcase from anon, authenticated;

-- Peladas que aparecem na comunidade (ligadas e não suspensas).
create function public.get_listed_groups()
returns table (
  group_id uuid,
  name text,
  city text,
  state text,
  play_weekday smallint,
  play_time time,
  active_players integer,
  public_players integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.city, g.state, g.play_weekday, g.play_time,
    (select count(*)::int from public.group_members gm where gm.group_id = g.id and gm.deactivated_at is null),
    (select count(*)::int from public.group_members gm where gm.group_id = g.id and gm.deactivated_at is null and gm.public_profile_at is not null)
  from public.groups g
  where (select auth.uid()) is not null
    and g.listed_at is not null
    and g.suspended_at is null
  order by g.name;
$$;
revoke execute on function public.get_listed_groups() from public, anon;
grant execute on function public.get_listed_groups() to authenticated;

-- Vitrine de uma pelada: só se estiver ligada, e só com os jogadores que aceitaram aparecer.
create function public.get_group_showcase(target_group uuid)
returns table (
  group_id uuid,
  name text,
  city text,
  state text,
  play_weekday smallint,
  play_time time,
  updated_at timestamptz,
  players jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.city, g.state, g.play_weekday, g.play_time, s.updated_at,
    coalesce((
      select jsonb_agg(p)
      from jsonb_array_elements(s.players) as p
      where (p ->> 'id')::uuid in (
        select gm.id from public.group_members gm
        where gm.group_id = g.id and gm.public_profile_at is not null and gm.deactivated_at is null
      )
    ), '[]'::jsonb)
  from public.groups g
  left join public.group_showcase s on s.group_id = g.id
  where (select auth.uid()) is not null
    and g.id = target_group
    and g.listed_at is not null
    and g.suspended_at is null;
$$;
revoke execute on function public.get_group_showcase(uuid) from public, anon;
grant execute on function public.get_group_showcase(uuid) to authenticated;

-- Galeria pública de um atleta: as cartas especiais dele (já congeladas em `awards`), só se ele e a pelada aceitaram.
create function public.get_public_awards(target_member uuid)
returns table (
  award_id uuid,
  kind public.award_kind,
  theme text,
  ovr integer,
  card_position public.player_position,
  score numeric,
  votes integer,
  attributes jsonb,
  round integer,
  played_on date,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.kind, a.theme, a.ovr, a.position, a.score, a.votes, a.attributes, m.round, m.played_on, a.created_at
  from public.awards a
  join public.matches m on m.id = a.match_id
  join public.group_members gm on gm.id = a.member_id
  join public.groups g on g.id = a.group_id
  where (select auth.uid()) is not null
    and a.member_id = target_member
    and gm.public_profile_at is not null and gm.deactivated_at is null
    and g.listed_at is not null and g.suspended_at is null
  order by m.played_on desc, a.created_at desc;
$$;
revoke execute on function public.get_public_awards(uuid) from public, anon;
grant execute on function public.get_public_awards(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Feed de conquistas
-- ---------------------------------------------------------------------------

create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null unique references public.awards (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index feed_posts_created_at_idx on public.feed_posts (created_at desc);
alter table public.feed_posts enable row level security;
revoke all on public.feed_posts from anon, authenticated;

create table public.feed_reactions (
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('clap', 'fire', 'glove', 'laugh')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.feed_reactions enable row level security;
revoke all on public.feed_reactions from anon, authenticated;

-- O dono da carta publica (uma vez), se ele e a pelada aceitaram aparecer.
create function public.publish_award(target_award uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  award_row public.awards;
  post_id uuid;
begin
  select a.* into award_row
  from public.awards a
  join public.group_members gm on gm.id = a.member_id
  join public.groups g on g.id = a.group_id
  where a.id = target_award
    and gm.user_id = (select auth.uid())
    and gm.public_profile_at is not null and gm.deactivated_at is null
    and g.listed_at is not null and g.suspended_at is null;
  if not found then
    raise exception 'cannot publish this award' using errcode = '42501';
  end if;

  insert into public.feed_posts (award_id, group_id, member_id, author_id)
  values (award_row.id, award_row.group_id, award_row.member_id, (select auth.uid()))
  on conflict (award_id) do nothing
  returning id into post_id;

  if post_id is null then
    select p.id into post_id from public.feed_posts p where p.award_id = award_row.id;
  end if;
  return post_id;
end;
$$;
revoke execute on function public.publish_award(uuid) from public, anon;
grant execute on function public.publish_award(uuid) to authenticated;

create function public.unpublish_post(target_post uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.feed_posts where id = target_post and author_id = (select auth.uid());
  if not found then
    raise exception 'not your post' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.unpublish_post(uuid) from public, anon;
grant execute on function public.unpublish_post(uuid) to authenticated;

-- Reagir (um emoji por pessoa por post); emoji nulo tira a reação. Só em post visível.
create function public.set_reaction(target_post uuid, reaction text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if reaction is null then
    delete from public.feed_reactions where post_id = target_post and user_id = (select auth.uid());
    return;
  end if;
  if not exists (
    select 1 from public.feed_posts p
    join public.groups g on g.id = p.group_id
    join public.group_members gm on gm.id = p.member_id
    where p.id = target_post and g.listed_at is not null and g.suspended_at is null
      and gm.public_profile_at is not null and gm.deactivated_at is null
  ) then
    raise exception 'post not visible' using errcode = '42501';
  end if;
  insert into public.feed_reactions (post_id, user_id, emoji)
  values (target_post, (select auth.uid()), reaction)
  on conflict (post_id, user_id) do update set emoji = excluded.emoji;
end;
$$;
revoke execute on function public.set_reaction(uuid, text) from public, anon;
grant execute on function public.set_reaction(uuid, text) to authenticated;

-- O feed: só posts de peladas ligadas, não suspensas, de jogadores que continuam aceitando aparecer.
create function public.get_feed(max_rows integer default 20, before timestamptz default null)
returns table (
  post_id uuid,
  created_at timestamptz,
  award_id uuid,
  kind public.award_kind,
  theme text,
  ovr integer,
  card_position public.player_position,
  score numeric,
  votes integer,
  attributes jsonb,
  round integer,
  played_on date,
  member_id uuid,
  nickname text,
  photo_path text,
  photo_kind text,
  card_skin text,
  group_id uuid,
  group_name text,
  city text,
  state text,
  reactions jsonb,
  my_reaction text,
  is_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.created_at, a.id, a.kind, a.theme, a.ovr, a.position, a.score, a.votes, a.attributes, m.round, m.played_on,
    gm.id, gm.nickname, gm.photo_path, gm.photo_kind, gm.card_skin,
    g.id, g.name, g.city, g.state,
    coalesce((select jsonb_object_agg(r.emoji, r.total) from (
      select fr.emoji, count(*)::int as total from public.feed_reactions fr where fr.post_id = p.id group by fr.emoji
    ) r), '{}'::jsonb),
    (select fr.emoji from public.feed_reactions fr where fr.post_id = p.id and fr.user_id = (select auth.uid())),
    p.author_id = (select auth.uid())
  from public.feed_posts p
  join public.awards a on a.id = p.award_id
  join public.matches m on m.id = a.match_id
  join public.group_members gm on gm.id = p.member_id
  join public.groups g on g.id = p.group_id
  where (select auth.uid()) is not null
    and g.listed_at is not null and g.suspended_at is null
    and gm.public_profile_at is not null and gm.deactivated_at is null
    and (before is null or p.created_at < before)
  order by p.created_at desc
  limit least(greatest(max_rows, 1), 50);
$$;
revoke execute on function public.get_feed(integer, timestamptz) from public, anon;
grant execute on function public.get_feed(integer, timestamptz) to authenticated;
