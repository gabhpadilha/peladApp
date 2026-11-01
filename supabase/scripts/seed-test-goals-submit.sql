-- Segunda parte do teste dos gols (depois de seed-test-goals.sql): os 8 fictícios que
-- "enviam" mandam as notas para todos os outros presentes e o voto no Gol da Rodada,
-- e 3 deles confirmam os gols do Administrador e do Gato (se informados e maiores que 0).
-- Só roda com as notas liberadas (todos informaram os gols ou o organizador liberou).
-- NÃO é migration:
--   npx supabase db query --linked -f supabase/scripts/seed-test-goals-submit.sql

do $submit$
declare
  test_match uuid;
  grp uuid;
begin
  select m.id, m.group_id into test_match, grp
  from public.matches m
  where m.status = 'open'
    and exists (
      select 1 from public.match_attendance a
      join public.group_members gm on gm.id = a.member_id
      join auth.users u on u.id = gm.user_id
      where a.match_id = m.id and u.raw_user_meta_data ->> 'seed' = 'true'
    )
  order by m.created_at desc
  limit 1;
  if test_match is null then
    raise exception 'Nenhuma rodada de teste aberta. Rode seed-test-goals.sql antes.';
  end if;
  if not public.ratings_open(test_match) then
    raise exception 'As notas ainda estão travadas: informe os gols do Administrador e do Gato (ou libere as notas) antes.';
  end if;

  create temp table seed_voters on commit drop as
  select gm.id as member_id, row_number() over (order by u.email) as n
  from public.match_attendance a
  join public.group_members gm on gm.id = a.member_id
  join auth.users u on u.id = gm.user_id
  where a.match_id = test_match
    and u.raw_user_meta_data ->> 'seed' = 'true'
    and u.email between 'seed.01@peladapp.test' and 'seed.08@peladapp.test';

  -- Notas para todos os outros presentes (papel da rodada: quem jogou no gol, notas de goleiro).
  insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis, ref, ela, pos, sai, rep, pes)
  select
    test_match, v.member_id, a.member_id,
    case when not is_gk then 5 + floor(random() * 5)::smallint end,
    case when not is_gk then 5 + floor(random() * 5)::smallint end,
    case when not is_gk then 5 + floor(random() * 5)::smallint end,
    case when not is_gk then 5 + floor(random() * 5)::smallint end,
    case when not is_gk then 5 + floor(random() * 5)::smallint end,
    case when not is_gk then 5 + floor(random() * 5)::smallint end,
    case when is_gk then 5 + floor(random() * 5)::smallint end,
    case when is_gk then 5 + floor(random() * 5)::smallint end,
    case when is_gk then 5 + floor(random() * 5)::smallint end,
    case when is_gk then 5 + floor(random() * 5)::smallint end,
    case when is_gk then 5 + floor(random() * 5)::smallint end,
    case when is_gk then 5 + floor(random() * 5)::smallint end
  from seed_voters v
  join public.match_attendance a on a.match_id = test_match and a.member_id <> v.member_id
  join public.group_members gm on gm.id = a.member_id
  cross join lateral (select coalesce(a.plays_in_goal, gm.position = 'GOL') as is_gk) role
  on conflict do nothing;

  insert into public.round_votes (match_id, voter_id, kind, nominee_id)
  select test_match, v.member_id, 'gol',
    (select a.member_id from public.match_attendance a where a.match_id = test_match and a.member_id <> v.member_id order by random() limit 1)
  from seed_voters v
  on conflict do nothing;

  -- Os 3 primeiros confirmam os gols de quem não é fictício (o Administrador) e do Gato.
  insert into public.match_goal_confirmations (group_id, match_id, member_id, voter_id, confirmed)
  select grp, test_match, g.member_id, v.member_id, true
  from public.match_goals g
  join seed_voters v on v.n <= 3 and v.member_id <> g.member_id and v.member_id <> g.reported_by
  where g.match_id = test_match
    and g.goals > 0
    and (g.reported_by <> g.member_id or not exists (
      select 1 from seed_voters s where s.member_id = g.member_id
    ))
  on conflict do nothing;

  raise notice '8 fictícios enviaram as notas na rodada de teste.';
end
$submit$;
