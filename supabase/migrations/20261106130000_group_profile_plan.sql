-- Cadastro detalhado da pelada e plano (decisão do dono do app em 2026-11-06):
--  - cidade, dia e horário do jogo, local e tamanho usual: informação (o dia só gera aviso no app, nunca bloqueia);
--  - plano e limite de rodadas por semana (`weekly_round_limit`, nulo = sem limite); estourou = PA011;
--  - contato do dono e observações do admin numa tabela à parte, que o login do jogador nunca lê.
-- Quem grava tudo isso é só o painel de admin (chave secreta): `groups` já não aceita update do jogador.

alter table public.groups
  add column city text check (char_length(city) between 2 and 60),
  add column state text check (state ~ '^[A-Z]{2}$'),
  add column play_weekday smallint check (play_weekday between 0 and 6),
  add column play_time time,
  add column venue text check (char_length(venue) between 2 and 80),
  add column usual_players smallint check (usual_players between 4 and 30),
  add column plan text not null default 'free',
  add column weekly_round_limit smallint check (weekly_round_limit > 0);

comment on column public.groups.play_weekday is 'Dia da semana do jogo (0 = domingo ... 6 = sábado). Informação: o app só avisa se a rodada cai em outro dia.';
comment on column public.groups.plan is 'Plano da pelada (hoje só "free"). Só o painel de admin grava.';
comment on column public.groups.weekly_round_limit is 'Rodadas que a pelada pode criar por semana (semana de segunda a domingo, pela data da rodada). Nulo = sem limite (peladas antigas).';

create table public.group_private (
  group_id uuid primary key references public.groups (id) on delete cascade,
  owner_contact text check (char_length(owner_contact) <= 40),
  admin_notes text check (char_length(admin_notes) <= 1000),
  updated_at timestamptz not null default now()
);
alter table public.group_private enable row level security;
-- Sem policy e sem privilégio: só a chave secreta (painel de admin) lê e grava.
revoke all on public.group_private from anon, authenticated;

-- create_match: além da suspensão (PA009), o limite de rodadas por semana (PA011).
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

  if exists (
    select 1 from public.groups g
    where g.id = target_group
      and g.weekly_round_limit is not null
      and g.weekly_round_limit <= (
        select count(*) from public.matches m
        where m.group_id = target_group
          and date_trunc('week', m.played_on::timestamp) = date_trunc('week', match_date::timestamp)
      )
  ) then
    raise exception 'weekly round limit reached' using errcode = 'PA011';
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
