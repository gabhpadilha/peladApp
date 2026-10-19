-- Reservas por time: a rodada tem 2 times (1 = Branco, 2 = Preto), cada um com
-- titulares e reservas. Todo presente tem time; `reserve` marca quem começa no
-- banco do seu time. Substitui o "banco geral" da migration anterior
-- (team NULL), que deixa de existir.

alter table public.match_attendance add column reserve boolean not null default false;

-- Quem estava no banco geral (team NULL) vira reserva do time 1.
update public.match_attendance set team = 1, reserve = true where team is null;

alter table public.match_attendance alter column team set not null;

drop function public.create_match(uuid, date, uuid[], smallint[]);

create function public.create_match(
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

revoke execute on function public.create_match(uuid, date, uuid[], smallint[], boolean[]) from public, anon;
grant execute on function public.create_match(uuid, date, uuid[], smallint[], boolean[]) to authenticated;
