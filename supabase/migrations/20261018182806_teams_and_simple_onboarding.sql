-- Fluxo simplificado: rodada = data + confirmados divididos em times (sem placar),
-- cadastro pelo link de convite (lido sem login) e mais de um organizador.

-- ---------------------------------------------------------------------------
-- Time de cada presente na rodada (1, 2, 3…). Os times revezam em quadra.
-- ---------------------------------------------------------------------------

alter table public.match_attendance
  add column team smallint check (team between 1 and 12);

-- ---------------------------------------------------------------------------
-- create_match: agora recebe o time de cada presente e não tem placar.
-- ---------------------------------------------------------------------------

drop function public.create_match(uuid, date, uuid[], smallint, smallint);

create function public.create_match(
  target_group uuid,
  match_date date,
  present_member_ids uuid[],
  team_numbers smallint[]
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
  if coalesce(array_length(present_member_ids, 1), 0) < 2 then
    raise exception 'at least two players must be present';
  end if;

  if array_length(present_member_ids, 1) <> coalesce(array_length(team_numbers, 1), 0) then
    raise exception 'every present player needs a team';
  end if;

  select coalesce(max(round), 0) + 1 into next_round
  from public.matches
  where group_id = target_group;

  insert into public.matches (group_id, round, played_on, created_by)
  values (target_group, next_round, match_date, (select auth.uid()))
  returning id into new_match_id;

  insert into public.match_attendance (group_id, match_id, member_id, team)
  select target_group, new_match_id, player.member_id, player.team
  from unnest(present_member_ids, team_numbers) as player (member_id, team);

  return new_match_id;
end;
$$;

revoke execute on function public.create_match(uuid, date, uuid[], smallint[]) from public, anon;
grant execute on function public.create_match(uuid, date, uuid[], smallint[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Convite legível sem login: a tela de cadastro mostra o nome da pelada.
-- Só devolve o nome para quem já tem o código exato (16 hex aleatórios).
-- ---------------------------------------------------------------------------

grant execute on function public.get_invite(text) to anon;

-- ---------------------------------------------------------------------------
-- Organizador promove ou rebaixa membros. Nunca deixa a pelada sem organizador.
-- ---------------------------------------------------------------------------

create function public.set_member_role(target_member uuid, new_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_group_id uuid;
begin
  select group_id into member_group_id from public.group_members where id = target_member;
  if member_group_id is null or not public.is_group_organizer(member_group_id) then
    raise exception 'only organizers can change roles' using errcode = '42501';
  end if;

  if new_role = 'player' and (
    select count(*) from public.group_members
    where group_id = member_group_id and role = 'organizer' and id <> target_member
  ) = 0 then
    raise exception 'the group needs at least one organizer';
  end if;

  update public.group_members set role = new_role where id = target_member;
end;
$$;

revoke execute on function public.set_member_role(uuid, public.member_role) from public, anon;
grant execute on function public.set_member_role(uuid, public.member_role) to authenticated;
