-- Corrigir a presença e os times de uma rodada ABERTA, sem excluir (decisão do dono do app em 2026-11-06):
-- só o organizador, só com a rodada aberta e ANTES de as notas abrirem (etapa dos gols). Quem já tem nota dada ou
-- recebida não sai. Quem sai leva junto os gols que informou (cascata); quem entra precisa informar os gols; a
-- conferência dos gols recomeça para todos (a lista mudou). PA012 = lista travada (rodada fechada, notas já abertas
-- ou alguém com nota).

create function public.update_match_roster(
  target_match uuid,
  present_member_ids uuid[],
  team_numbers smallint[],
  reserve_flags boolean[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  match_state public.match_status;
begin
  select m.group_id, m.status into target_group, match_state from public.matches m where m.id = target_match;
  if target_group is null or not public.is_group_organizer(target_group) then
    raise exception 'only an organizer edits the roster' using errcode = '42501';
  end if;
  if match_state <> 'open' or public.ratings_open(target_match) then
    raise exception 'roster is locked' using errcode = 'PA012';
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
  if (select count(*) from unnest(reserve_flags) as r (reserve) where not r.reserve) < 2 then
    raise exception 'at least two starters are needed';
  end if;
  if (select count(distinct m) from unnest(present_member_ids) as m) <> array_length(present_member_ids, 1) then
    raise exception 'a player appears twice';
  end if;
  if exists (
    select 1 from unnest(present_member_ids) as present (member_id)
    where not exists (
      select 1 from public.group_members gm
      where gm.id = present.member_id and gm.group_id = target_group and gm.deactivated_at is null
    )
  ) then
    raise exception 'only active players of the group can be present';
  end if;

  -- Quem já deu ou recebeu nota (ou voto) não sai: ninguém perde voto, e nota ruim não some pela lista.
  if exists (
    select 1 from public.evaluations e
    where e.match_id = target_match
      and (e.player_id <> all (present_member_ids) or e.evaluator_id <> all (present_member_ids))
  ) or exists (
    select 1 from public.round_votes v
    where v.match_id = target_match
      and (v.voter_id <> all (present_member_ids) or v.nominee_id <> all (present_member_ids))
  ) then
    raise exception 'someone with ratings cannot leave the round' using errcode = 'PA012';
  end if;

  -- Sai quem não está mais na lista (os gols dele saem em cascata).
  delete from public.match_attendance a
  where a.match_id = target_match and a.member_id <> all (present_member_ids);

  -- Quem ficou muda de time ou de reserva; quem é novo entra.
  update public.match_attendance a
  set team = p.team, reserve = p.reserve
  from unnest(present_member_ids, team_numbers, reserve_flags) as p (member_id, team, reserve)
  where a.match_id = target_match and a.member_id = p.member_id;

  insert into public.match_attendance (group_id, match_id, member_id, team, reserve)
  select target_group, target_match, p.member_id, p.team, p.reserve
  from unnest(present_member_ids, team_numbers, reserve_flags) as p (member_id, team, reserve)
  where not exists (select 1 from public.match_attendance a where a.match_id = target_match and a.member_id = p.member_id);

  -- A lista mudou: todo mundo confere os gols de novo antes de as notas abrirem.
  update public.match_attendance set goals_checked_at = null where match_id = target_match;
end;
$$;
revoke execute on function public.update_match_roster(uuid, uuid[], smallint[], boolean[]) from public, anon;
grant execute on function public.update_match_roster(uuid, uuid[], smallint[], boolean[]) to authenticated;
