-- PeladApp: schema inicial.
-- Grupos (várias peladas), membros com apelido/posição por grupo, partidas,
-- presenças e avaliações anônimas. Tudo protegido por RLS.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('organizer', 'player');
create type public.player_position as enum ('FIX', 'ALA', 'PIV', 'GOL');
create type public.match_status as enum ('open', 'closed');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

-- Um perfil por usuário do Auth. Nome completo é preenchido no onboarding.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) between 2 and 80),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  -- Código do link de convite (/convite/<código>).
  invite_code text not null unique default encode(extensions.gen_random_bytes(8), 'hex'),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- O jogador dentro de um grupo: apelido, posição e foto valem por grupo.
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'player',
  nickname text not null check (char_length(nickname) between 1 and 12),
  position public.player_position not null,
  photo_path text,
  photo_kind text check (photo_kind in ('cutout', 'original')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id),
  -- Alvo das FKs compostas que garantem "mesmo grupo".
  unique (group_id, id)
);

create index group_members_user_id_idx on public.group_members (user_id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  round integer not null check (round > 0),
  played_on date not null,
  -- open: notas chegando, não contam no OVR. closed: contam.
  status public.match_status not null default 'open',
  score_a smallint check (score_a >= 0),
  score_b smallint check (score_b >= 0),
  created_by uuid not null references auth.users (id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, round),
  unique (group_id, id)
);

-- Quem esteve presente. Só presentes avaliam e são avaliados.
create table public.match_attendance (
  group_id uuid not null,
  match_id uuid not null,
  member_id uuid not null,
  primary key (match_id, member_id),
  foreign key (group_id, match_id) references public.matches (group_id, id) on delete cascade,
  foreign key (group_id, member_id) references public.group_members (group_id, id) on delete cascade
);

-- Notas (1 a 10) que um presente deu a outro. Linha: 6 atributos de linha;
-- goleiro: 6 atributos de goleiro. Imutável depois de enviada.
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  evaluator_id uuid not null,
  player_id uuid not null,
  vel smallint check (vel between 1 and 10),
  chu smallint check (chu between 1 and 10),
  pas smallint check (pas between 1 and 10),
  dri smallint check (dri between 1 and 10),
  def smallint check (def between 1 and 10),
  fis smallint check (fis between 1 and 10),
  ref smallint check (ref between 1 and 10),
  ela smallint check (ela between 1 and 10),
  pos smallint check (pos between 1 and 10),
  sai smallint check (sai between 1 and 10),
  rep smallint check (rep between 1 and 10),
  pes smallint check (pes between 1 and 10),
  created_at timestamptz not null default now(),
  unique (match_id, evaluator_id, player_id),
  -- Sem autoavaliação.
  check (evaluator_id <> player_id),
  -- Ou todos os atributos de linha, ou todos os de goleiro.
  check (
    (
      num_nonnulls(vel, chu, pas, dri, def, fis) = 6
      and num_nonnulls(ref, ela, pos, sai, rep, pes) = 0
    )
    or (
      num_nonnulls(ref, ela, pos, sai, rep, pes) = 6
      and num_nonnulls(vel, chu, pas, dri, def, fis) = 0
    )
  ),
  -- Avaliador e avaliado precisam estar na lista de presença da partida.
  foreign key (match_id, evaluator_id)
    references public.match_attendance (match_id, member_id) on delete cascade,
  foreign key (match_id, player_id)
    references public.match_attendance (match_id, member_id) on delete cascade
);

create index evaluations_player_id_idx on public.evaluations (player_id);
create index evaluations_evaluator_id_idx on public.evaluations (evaluator_id);

-- ---------------------------------------------------------------------------
-- Perfil automático para cada usuário novo
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Funções auxiliares de acesso (usadas nas policies)
-- ---------------------------------------------------------------------------

create function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group and user_id = (select auth.uid())
  );
$$;

create function public.is_group_organizer(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group
      and user_id = (select auth.uid())
      and role = 'organizer'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_attendance enable row level security;
alter table public.evaluations enable row level security;

-- profiles: o próprio usuário e quem divide algum grupo com ele.
create policy "profiles: ver o próprio e colegas de grupo"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = (select auth.uid()) and theirs.user_id = profiles.id
    )
  );

create policy "profiles: editar o próprio"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- groups: criação e entrada só pelas funções create_group/join_group.
create policy "groups: membros veem"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy "groups: organizador edita"
  on public.groups for update to authenticated
  using (public.is_group_organizer(id))
  with check (public.is_group_organizer(id));

-- group_members
create policy "group_members: membros veem o elenco"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy "group_members: editar a si mesmo ou, se organizador, qualquer um"
  on public.group_members for update to authenticated
  using (user_id = (select auth.uid()) or public.is_group_organizer(group_id))
  with check (user_id = (select auth.uid()) or public.is_group_organizer(group_id));

create policy "group_members: organizador remove"
  on public.group_members for delete to authenticated
  using (public.is_group_organizer(group_id));

-- O papel (role) não pode ser trocado por update direto: só estas colunas.
revoke update on public.group_members from authenticated;
grant update (nickname, position, photo_path, photo_kind) on public.group_members to authenticated;

-- matches
create policy "matches: membros veem"
  on public.matches for select to authenticated
  using (public.is_group_member(group_id));

create policy "matches: organizador cria"
  on public.matches for insert to authenticated
  with check (public.is_group_organizer(group_id) and created_by = (select auth.uid()));

create policy "matches: organizador edita"
  on public.matches for update to authenticated
  using (public.is_group_organizer(group_id))
  with check (public.is_group_organizer(group_id));

create policy "matches: organizador apaga"
  on public.matches for delete to authenticated
  using (public.is_group_organizer(group_id));

-- match_attendance
create policy "match_attendance: membros veem"
  on public.match_attendance for select to authenticated
  using (public.is_group_member(group_id));

create policy "match_attendance: organizador marca presença"
  on public.match_attendance for insert to authenticated
  with check (public.is_group_organizer(group_id));

create policy "match_attendance: organizador desmarca presença"
  on public.match_attendance for delete to authenticated
  using (public.is_group_organizer(group_id));

-- evaluations: anônimas. Cada um só lê as notas que ele mesmo deu; médias e
-- contagens saem pelas funções get_group_scores/get_match_submissions.
create policy "evaluations: ver as próprias notas dadas"
  on public.evaluations for select to authenticated
  using (
    evaluator_id in (
      select id from public.group_members where user_id = (select auth.uid())
    )
  );

create policy "evaluations: enviar notas em rodada aberta"
  on public.evaluations for insert to authenticated
  with check (
    evaluator_id in (
      select id from public.group_members where user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.matches
      where matches.id = evaluations.match_id and matches.status = 'open'
    )
  );

-- ---------------------------------------------------------------------------
-- Funções de negócio (RPC)
-- ---------------------------------------------------------------------------

-- Cria um grupo e torna quem criou o organizador. Retorna o id do grupo.
create function public.create_group(
  group_name text,
  member_nickname text,
  member_position public.player_position
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_group_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  insert into public.groups (name, created_by)
  values (group_name, (select auth.uid()))
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role, nickname, position)
  values (new_group_id, (select auth.uid()), 'organizer', member_nickname, member_position);

  return new_group_id;
end;
$$;

-- Nome do grupo de um convite, para a tela de convite (antes de entrar).
create function public.get_invite(code text)
returns table (group_id uuid, group_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select id, name from public.groups where invite_code = code;
$$;

-- Entra no grupo pelo código do convite. Idempotente. Retorna o id do grupo.
create function public.join_group(
  code text,
  member_nickname text,
  member_position public.player_position
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  select id into target_group_id from public.groups where invite_code = code;
  if target_group_id is null then
    raise exception 'invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id, nickname, position)
  values (target_group_id, (select auth.uid()), member_nickname, member_position)
  on conflict (group_id, user_id) do nothing;

  return target_group_id;
end;
$$;

-- Notas das rodadas fechadas de um grupo, sem o avaliador (anonimato).
-- É a base do OVR: soma das avaliações ÷ quantidade (calculado em lib/ovr.ts).
create function public.get_group_scores(target_group uuid)
returns table (
  evaluation_id uuid,
  match_id uuid,
  player_id uuid,
  vel smallint, chu smallint, pas smallint, dri smallint, def smallint, fis smallint,
  ref smallint, ela smallint, pos smallint, sai smallint, rep smallint, pes smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.match_id, e.player_id,
    e.vel, e.chu, e.pas, e.dri, e.def, e.fis,
    e.ref, e.ela, e.pos, e.sai, e.rep, e.pes
  from public.evaluations e
  join public.matches m on m.id = e.match_id
  where m.group_id = target_group
    and m.status = 'closed'
    and public.is_group_member(target_group);
$$;

-- Quantos presentes já enviaram notas em cada partida do grupo.
create function public.get_match_submissions(target_group uuid)
returns table (match_id uuid, submitted bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.match_id, count(distinct e.evaluator_id)
  from public.evaluations e
  join public.matches m on m.id = e.match_id
  where m.group_id = target_group
    and public.is_group_member(target_group)
  group by e.match_id;
$$;

-- Funções só para usuários logados.
revoke execute on function
  public.is_group_member(uuid),
  public.is_group_organizer(uuid),
  public.create_group(text, text, public.player_position),
  public.get_invite(text),
  public.join_group(text, text, public.player_position),
  public.get_group_scores(uuid),
  public.get_match_submissions(uuid)
from public, anon;

grant execute on function
  public.is_group_member(uuid),
  public.is_group_organizer(uuid),
  public.create_group(text, text, public.player_position),
  public.get_invite(text),
  public.join_group(text, text, public.player_position),
  public.get_group_scores(uuid),
  public.get_match_submissions(uuid)
to authenticated;
