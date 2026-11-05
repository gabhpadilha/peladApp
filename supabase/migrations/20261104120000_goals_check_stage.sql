-- Etapa de conferência dos gols antes das notas (2026-11-04, decisão do dono do app: "gols é uma coisa,
-- estatísticas são outra"; achados do teste do fluxo em docs/superpowers/specs/2026-11-04-gols-duas-etapas-design.md).
--
-- A votação passa a ter duas etapas fechadas:
--   1. Gols: cada presente informa os seus; com todos informados, cada um confere os gols dos colegas
--      (Confirmo / Não foi isso, ou "Está tudo certo") e conclui a conferência.
--   2. Notas: abrem quando todos informaram E concluíram a conferência (ou o organizador libera).
-- A conferência exige participação, não aprovação: um "não" ou um colega que não confirma nunca trava as notas.
--
-- - `match_attendance.goals_checked_at`: quando cada presente concluiu a conferência (`finish_goal_check`).
-- - `ratings_open` passa a exigir os dois (informou + conferiu), ou a liberação do organizador.
-- - Corrigir um número durante a etapa dos gols apaga as confirmações dele e manda os outros conferirem de novo.
-- - Depois que as notas abrem, o próprio jogador não corrige mais os gols dele (o organizador sim): evita a
--   "zebra" de perder as confirmações quando os colegas já passaram para as notas.
-- - O organizador que informa os gols de alguém dá a conferência dele por feita (quem está sem celular não trava).
-- - `confirm_goals` aceita o número que o colega viu (`expected_goals`) e recusa se ele mudou (PA008).

alter table public.match_attendance add column goals_checked_at timestamptz;

-- Notas liberadas? O organizador liberou, ou todos os presentes informaram e concluíram a conferência.
create or replace function public.ratings_open(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.matches where id = target_match and ratings_unlocked_at is not null)
    or not exists (
      select 1 from public.match_attendance attendance
      where attendance.match_id = target_match
        and (
          attendance.goals_checked_at is null
          or not exists (
            select 1 from public.match_goals goal
            where goal.match_id = attendance.match_id and goal.member_id = attendance.member_id
          )
        )
    );
$$;

-- Conclui a conferência dos gols de quem chama (só depois de todos terem informado).
create function public.finish_goal_check(target_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
  caller uuid;
begin
  select group_id, status into target_group, current_status from public.matches where id = target_match;
  if target_group is null then
    raise exception 'match not found';
  end if;
  caller := public.current_member_id(target_group);
  if caller is null or not exists (
    select 1 from public.match_attendance where match_id = target_match and member_id = caller
  ) then
    raise exception 'only players of this round can check goals' using errcode = '42501';
  end if;
  if current_status <> 'open' then
    raise exception 'round is not open';
  end if;
  if exists (
    select 1 from public.match_attendance attendance
    where attendance.match_id = target_match
      and not exists (
        select 1 from public.match_goals goal
        where goal.match_id = attendance.match_id and goal.member_id = attendance.member_id
      )
  ) then
    raise exception 'wait until everyone reports goals';
  end if;
  update public.match_attendance
    set goals_checked_at = coalesce(goals_checked_at, now())
    where match_id = target_match and member_id = caller;
  -- Etapa dos gols fechada: as notas ficam abertas de vez (uma correção depois não as trava de novo).
  update public.matches set ratings_unlocked_at = coalesce(ratings_unlocked_at, now())
    where id = target_match and public.ratings_open(target_match);
end;
$$;
revoke execute on function public.finish_goal_check(uuid) from public, anon;
grant execute on function public.finish_goal_check(uuid) to authenticated;

-- Informa (ou corrige) os gols de um presente. Regras novas: depois que as notas abrem, só o organizador corrige
-- gols já informados; corrigir um número durante a etapa dos gols manda os outros conferirem de novo; o organizador
-- que informa por outro dá a conferência dele por feita.
create or replace function public.report_goals(target_match uuid, target_member uuid, goal_count integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
  caller uuid;
  previous smallint;
  was_open boolean;
begin
  select group_id, status into target_group, current_status from public.matches where id = target_match;
  if target_group is null then
    raise exception 'match not found';
  end if;
  caller := public.current_member_id(target_group);
  if caller is null then
    raise exception 'not a member' using errcode = '42501';
  end if;
  if caller <> target_member and not public.is_group_organizer(target_group) then
    raise exception 'only organizers can report goals for others' using errcode = '42501';
  end if;
  if current_status <> 'open' then
    raise exception 'round is not open';
  end if;
  if goal_count is null or goal_count < 0 or goal_count > 15 then
    raise exception 'goals must be between 0 and 15';
  end if;
  if not exists (
    select 1 from public.match_attendance where match_id = target_match and member_id = target_member
  ) then
    raise exception 'player was not in this round';
  end if;

  select goals into previous from public.match_goals where match_id = target_match and member_id = target_member;
  was_open := public.ratings_open(target_match);
  if previous is not null
     and previous is distinct from goal_count::smallint
     and caller = target_member
     and not public.is_group_organizer(target_group)
     and was_open then
    raise exception 'the goals stage is closed; ask an organizer to fix it' using errcode = 'PA007';
  end if;

  insert into public.match_goals (group_id, match_id, member_id, goals, reported_by)
  values (target_group, target_match, target_member, goal_count, caller)
  on conflict (match_id, member_id) do update
    set goals = excluded.goals, reported_by = excluded.reported_by, updated_at = now();

  if previous is distinct from goal_count::smallint then
    delete from public.match_goal_confirmations where match_id = target_match and member_id = target_member;
    -- Número corrigido: quem já tinha conferido confere de novo (só enquanto as notas ainda estão fechadas).
    if previous is not null and not was_open then
      update public.match_attendance set goals_checked_at = null
        where match_id = target_match and member_id <> target_member;
    end if;
  end if;
  -- O organizador que informa por outro responde pela conferência dele (quem está sem celular não trava a etapa).
  if caller <> target_member then
    update public.match_attendance set goals_checked_at = coalesce(goals_checked_at, now())
      where match_id = target_match and member_id = target_member;
  end if;
  -- Se isso fechou a etapa dos gols (era o último que faltava), as notas ficam abertas de vez.
  update public.matches set ratings_unlocked_at = coalesce(ratings_unlocked_at, now())
    where id = target_match and public.ratings_open(target_match);
end;
$$;

-- Confirma ("sim") ou não os gols de um presente. Com `expected_goals`, só vale se o número ainda é o que o colega viu.
drop function public.confirm_goals(uuid, uuid, boolean);
create function public.confirm_goals(target_match uuid, target_member uuid, is_confirmed boolean, expected_goals integer default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
  caller uuid;
  reporter uuid;
  goal_count smallint;
begin
  select group_id, status into target_group, current_status from public.matches where id = target_match;
  if target_group is null then
    raise exception 'match not found';
  end if;
  caller := public.current_member_id(target_group);
  if caller is null or not exists (
    select 1 from public.match_attendance where match_id = target_match and member_id = caller
  ) then
    raise exception 'only players of this round can confirm goals' using errcode = '42501';
  end if;
  if current_status <> 'open' then
    raise exception 'round is not open';
  end if;
  if caller = target_member then
    raise exception 'cannot confirm your own goals';
  end if;
  select goals, reported_by into goal_count, reporter
  from public.match_goals where match_id = target_match and member_id = target_member;
  if goal_count is null or goal_count = 0 then
    raise exception 'no goals to confirm';
  end if;
  if expected_goals is not null and expected_goals <> goal_count then
    raise exception 'the goals changed; check again' using errcode = 'PA008';
  end if;
  if reporter = caller then
    raise exception 'who reported the goals cannot confirm them';
  end if;

  insert into public.match_goal_confirmations (group_id, match_id, member_id, voter_id, confirmed)
  values (target_group, target_match, target_member, caller, is_confirmed)
  on conflict (match_id, member_id, voter_id) do update set confirmed = excluded.confirmed, created_at = now();
end;
$$;
revoke execute on function public.confirm_goals(uuid, uuid, boolean, integer) from public, anon;
grant execute on function public.confirm_goals(uuid, uuid, boolean, integer) to authenticated;

-- Rodadas abertas antes desta migration seguem como estavam: notas liberadas, sem etapa nova no meio do caminho.
update public.matches set ratings_unlocked_at = coalesce(ratings_unlocked_at, now()) where status = 'open';
