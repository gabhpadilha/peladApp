-- Jogadores FICTÍCIOS para testar rodadas, sorteio e notas.
-- NÃO é migration: rode à mão com
--   npx supabase db query --linked -f supabase/scripts/seed-test-players.sql
-- e desfaça com supabase/scripts/cleanup-test-players.sql.
--
-- Cria 12 jogadores (2 goleiros + 10 de linha) na pelada mais antiga e 4 rodadas
-- FECHADAS só com eles (os membros reais não entram), com notas de 1 a 10.
-- Os fictícios não têm senha: não conseguem fazer login. Ficam marcados com
-- raw_user_meta_data.seed = true (e-mail seed.NN@peladapp.test).

do $seed$
declare
  roster constant jsonb := $json$[
    {"n": 1,  "nick": "Paredão",  "name": "Marcos Vinícius Teixeira", "pos": "GOL", "skill": [86, 80, 84, 78, 75, 70]},
    {"n": 2,  "nick": "Gato",     "name": "Rafael Souza Lima",        "pos": "GOL", "skill": [72, 70, 66, 64, 62, 58]},
    {"n": 3,  "nick": "Magrão",   "name": "Anderson Lima Prado",      "pos": "PIV", "skill": [78, 92, 84, 86, 60, 88]},
    {"n": 4,  "nick": "Falcão",   "name": "Bruno Henrique Alves",     "pos": "ALA", "skill": [90, 84, 86, 91, 55, 70]},
    {"n": 5,  "nick": "Tiquinho", "name": "Thiago Costa Nunes",       "pos": "ALA", "skill": [88, 74, 80, 84, 52, 66]},
    {"n": 6,  "nick": "Muralha",  "name": "Diego Ferreira Castro",    "pos": "FIX", "skill": [65, 60, 76, 62, 88, 84]},
    {"n": 7,  "nick": "Juninho",  "name": "José Carlos Júnior",       "pos": "ALA", "skill": [82, 70, 74, 78, 50, 62]},
    {"n": 8,  "nick": "Baiano",   "name": "Lucas Oliveira Brito",     "pos": "PIV", "skill": [64, 78, 68, 70, 54, 80]},
    {"n": 9,  "nick": "Careca",   "name": "Fábio Martins Rocha",      "pos": "FIX", "skill": [60, 58, 70, 56, 80, 76]},
    {"n": 10, "nick": "Neguinho", "name": "Wesley Santos Duarte",     "pos": "ALA", "skill": [80, 62, 64, 72, 48, 58]},
    {"n": 11, "nick": "Alemão",   "name": "Guilherme Schmidt",        "pos": "FIX", "skill": [55, 54, 62, 50, 74, 70]},
    {"n": 12, "nick": "Zeca",     "name": "José Antônio Rocha",       "pos": "PIV", "skill": [52, 64, 56, 54, 48, 68]}
  ]$json$;
  closed_rounds constant int := 4;
  days_between_rounds constant int := 7;
  presence_chance constant numeric := 0.85;
  evaluation_chance constant numeric := 0.85;
  team_count constant int := 3;

  grp uuid;
  org uuid;
  player jsonb;
  new_user uuid;
  new_member uuid;
  current_match uuid;
  next_round int;
  played date;
  k int;
begin
  if exists (select 1 from auth.users where raw_user_meta_data ->> 'seed' = 'true') then
    raise exception 'Já existem jogadores fictícios. Rode cleanup-test-players.sql antes.';
  end if;

  select id into grp from public.groups order by created_at limit 1;
  if grp is null then
    raise exception 'Nenhuma pelada encontrada.';
  end if;

  select user_id into org
  from public.group_members
  where group_id = grp and role = 'organizer'
  order by joined_at
  limit 1;
  if org is null then
    raise exception 'A pelada não tem organizador.';
  end if;

  perform setseed(0.2026);

  create temp table seed_players (
    member_id uuid primary key,
    nickname text not null,
    position public.player_position not null,
    skill int[] not null
  ) on commit drop;

  for player in select value from jsonb_array_elements(roster) loop
    new_user := gen_random_uuid();

    -- Tokens vazios (não NULL): o GoTrue quebra ao ler usuários com token NULL.
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      new_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'seed.' || lpad((player ->> 'n'), 2, '0') || '@peladapp.test', '', now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb, '{"seed": true}'::jsonb, now(), now(),
      '', '', '', ''
    );

    -- O trigger on_auth_user_created já criou o perfil.
    update public.profiles set full_name = player ->> 'name' where id = new_user;

    insert into public.group_members (group_id, user_id, nickname, position)
    values (grp, new_user, player ->> 'nick', (player ->> 'pos')::public.player_position)
    returning id into new_member;

    insert into seed_players (member_id, nickname, position, skill)
    values (
      new_member,
      player ->> 'nick',
      (player ->> 'pos')::public.player_position,
      array(select jsonb_array_elements_text(player -> 'skill')::int)
    );
  end loop;

  for k in 1..closed_rounds loop
    select coalesce(max(round), 0) + 1 into next_round from public.matches where group_id = grp;
    played := current_date - (days_between_rounds * (closed_rounds + 1 - k));

    insert into public.matches (group_id, round, played_on, status, created_by, closed_at)
    values (grp, next_round, played, 'closed', org, (played + 1)::timestamptz)
    returning id into current_match;

    -- Goleiros sempre presentes; a linha falta de vez em quando. Times 1..3 em sequência.
    insert into public.match_attendance (group_id, match_id, member_id, team)
    select grp, current_match, member_id, (((row_number() over (order by random())) - 1) % team_count + 1)::smallint
    from seed_players
    where position = 'GOL' or random() < presence_chance;

    -- Cada presente avalia (quase) todos os outros. Nota = habilidade/10 + fase do
    -- jogador na rodada + ruído, limitada a 1–10. Goleiro usa as colunas de goleiro.
    with present as (
      select s.*
      from seed_players s
      join public.match_attendance a on a.member_id = s.member_id and a.match_id = current_match
    ),
    form as materialized (
      select member_id, (random() - 0.5) * 2.4 as shift from present
    )
    insert into public.evaluations (
      match_id, evaluator_id, player_id,
      vel, chu, pas, dri, def, fis,
      ref, ela, pos, sai, rep, pes
    )
    select
      current_match, e.member_id, p.member_id,
      case when p.position <> 'GOL' then greatest(1, least(10, round(p.skill[1] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position <> 'GOL' then greatest(1, least(10, round(p.skill[2] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position <> 'GOL' then greatest(1, least(10, round(p.skill[3] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position <> 'GOL' then greatest(1, least(10, round(p.skill[4] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position <> 'GOL' then greatest(1, least(10, round(p.skill[5] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position <> 'GOL' then greatest(1, least(10, round(p.skill[6] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position = 'GOL' then greatest(1, least(10, round(p.skill[1] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position = 'GOL' then greatest(1, least(10, round(p.skill[2] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position = 'GOL' then greatest(1, least(10, round(p.skill[3] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position = 'GOL' then greatest(1, least(10, round(p.skill[4] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position = 'GOL' then greatest(1, least(10, round(p.skill[5] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end,
      case when p.position = 'GOL' then greatest(1, least(10, round(p.skill[6] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint end
    from present e
    cross join present p
    join form f on f.member_id = p.member_id
    where e.member_id <> p.member_id
      and random() < evaluation_chance;
  end loop;

  raise notice 'Fictícios criados em % rodadas fechadas.', closed_rounds;
end
$seed$;
