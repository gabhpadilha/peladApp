-- Cria uma rodada e a lista de presença numa transação só.
-- security invoker: as policies de matches/match_attendance (só organizador)
-- continuam valendo, então não precisa checar papel aqui.
create function public.create_match(
  target_group uuid,
  match_date date,
  present_member_ids uuid[],
  goals_a smallint default null,
  goals_b smallint default null
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

  select coalesce(max(round), 0) + 1 into next_round
  from public.matches
  where group_id = target_group;

  insert into public.matches (group_id, round, played_on, score_a, score_b, created_by)
  values (target_group, next_round, match_date, goals_a, goals_b, (select auth.uid()))
  returning id into new_match_id;

  insert into public.match_attendance (group_id, match_id, member_id)
  select target_group, new_match_id, member_id
  from unnest(present_member_ids) as member_id;

  return new_match_id;
end;
$$;

revoke execute on function public.create_match(uuid, date, uuid[], smallint, smallint) from public, anon;
grant execute on function public.create_match(uuid, date, uuid[], smallint, smallint) to authenticated;
