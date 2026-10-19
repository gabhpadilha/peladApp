-- Banco de reserva: a rodada tem 2 times de 5 e quem sobra fica no banco.
-- Quem está no banco foi à pelada (presente: avalia e é avaliado), mas fica
-- sem time: match_attendance.team = NULL. O app manda o time 0 para o banco.

create or replace function public.create_match(
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

  -- Pelo menos 2 em quadra (time 1 em diante); o resto pode estar no banco (0).
  if (select count(*) from unnest(team_numbers) as t (team) where t.team > 0) < 2 then
    raise exception 'at least two players must be on a team';
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

  insert into public.match_attendance (group_id, match_id, member_id, team)
  select target_group, new_match_id, player.member_id, nullif(player.team, 0)
  from unnest(present_member_ids, team_numbers) as player (member_id, team);

  return new_match_id;
end;
$$;
