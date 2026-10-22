-- Rodada de TESTE aberta, pronta para o Administrador fechar.
-- NÃO é migration: rode à mão com
--   npx supabase db query --linked -f supabase/scripts/seed-test-round.sql
-- e desfaça com supabase/scripts/cleanup-test-round.sql ANTES da rodada real
-- (senão os fictícios aparecem nos confirmados do sorteio).
--
-- Cria 10 jogadores fictícios (2 goleiros + 8 de linha) na pelada mais antiga e
-- uma rodada ABERTA de hoje (data de Brasília) com o Administrador e eles:
-- Branco x Preto, 5 titulares em cada e 1 reserva no Branco.
-- 8 fictícios já enviaram as notas (todos os outros presentes, inclusive o
-- Administrador) e o voto no Gol da Rodada; 2 fictícios ficam sem enviar, para
-- aparecer "Aguardando". O Administrador NÃO enviou: ele avalia pela mesa tática
-- e depois fecha a rodada. Todo presente recebe pelo menos 7 notas (o mínimo
-- dos prêmios é 3), então o pacote sai completo.
-- Os fictícios não têm senha (não fazem login) e ficam marcados com
-- raw_user_meta_data.seed = true (e-mail seed.NN@peladapp.test).

do $seed$
declare
  -- skill: 6 notas-base (×10) na ordem dos atributos de linha ou de goleiro.
  -- team/reserve: o time na rodada (1 = Branco, 2 = Preto). submits: já enviou as notas.
  roster constant jsonb := $json$[
    {"n": 1,  "nick": "Paredão",  "name": "Marcos Vinícius Teixeira", "pos": "GOL", "team": 1, "reserve": false, "submits": true,  "skill": [86, 80, 84, 78, 75, 70]},
    {"n": 2,  "nick": "Gato",     "name": "Rafael Souza Lima",        "pos": "GOL", "team": 2, "reserve": false, "submits": true,  "skill": [72, 70, 66, 64, 62, 58]},
    {"n": 3,  "nick": "Falcão",   "name": "Bruno Henrique Alves",     "pos": "ALA", "team": 1, "reserve": false, "submits": true,  "skill": [90, 84, 86, 91, 55, 70]},
    {"n": 4,  "nick": "Tiquinho", "name": "Thiago Costa Nunes",       "pos": "ALA", "team": 2, "reserve": false, "submits": true,  "skill": [88, 74, 80, 84, 52, 66]},
    {"n": 5,  "nick": "Muralha",  "name": "Diego Ferreira Castro",    "pos": "FIX", "team": 2, "reserve": false, "submits": true,  "skill": [65, 60, 76, 62, 88, 84]},
    {"n": 6,  "nick": "Juninho",  "name": "José Carlos Júnior",       "pos": "ALA", "team": 1, "reserve": false, "submits": true,  "skill": [82, 70, 74, 78, 50, 62]},
    {"n": 7,  "nick": "Baiano",   "name": "Lucas Oliveira Brito",     "pos": "PIV", "team": 2, "reserve": false, "submits": true,  "skill": [64, 78, 68, 70, 54, 80]},
    {"n": 8,  "nick": "Careca",   "name": "Fábio Martins Rocha",      "pos": "PIV", "team": 1, "reserve": false, "submits": true,  "skill": [60, 58, 70, 56, 80, 76]},
    {"n": 9,  "nick": "Neguinho", "name": "Wesley Santos Duarte",     "pos": "ALA", "team": 1, "reserve": false, "submits": false, "skill": [80, 62, 64, 72, 48, 58]},
    {"n": 10, "nick": "Zeca",     "name": "José Antônio Rocha",       "pos": "FIX", "team": 1, "reserve": true,  "submits": false, "skill": [52, 64, 56, 54, 48, 68]}
  ]$json$;
  -- Nota-base do Administrador nas notas que os fictícios dão a ele.
  owner_skill constant int[] := array[76, 72, 78, 74, 70, 75];

  grp uuid;
  owner_user uuid;
  owner_member uuid;
  owner_position public.player_position;
  player jsonb;
  new_user uuid;
  new_member uuid;
  test_match uuid;
  next_round int;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if exists (select 1 from auth.users where raw_user_meta_data ->> 'seed' = 'true') then
    raise exception 'Já existem jogadores fictícios. Rode cleanup-test-round.sql (ou cleanup-test-players.sql) antes.';
  end if;

  select id, created_by into grp, owner_user from public.groups order by created_at limit 1;
  if grp is null then
    raise exception 'Nenhuma pelada encontrada.';
  end if;

  select id, position into owner_member, owner_position
  from public.group_members
  where group_id = grp and user_id = owner_user and deactivated_at is null;
  if owner_member is null then
    raise exception 'O Administrador não está ativo na pelada.';
  end if;

  if exists (select 1 from public.matches where group_id = grp and status = 'open') then
    raise exception 'Já existe uma rodada aberta na pelada. Feche ou exclua antes do teste.';
  end if;

  perform setseed(0.2210);

  create temp table seed_players (
    member_id uuid primary key,
    position public.player_position not null,
    team smallint not null,
    reserve boolean not null,
    submits boolean not null,
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

    insert into seed_players (member_id, position, team, reserve, submits, skill)
    values (
      new_member,
      (player ->> 'pos')::public.player_position,
      (player ->> 'team')::smallint,
      (player ->> 'reserve')::boolean,
      (player ->> 'submits')::boolean,
      array(select jsonb_array_elements_text(player -> 'skill')::int)
    );
  end loop;

  -- O Administrador joga no Preto, como titular, e ainda não enviou as notas.
  insert into seed_players (member_id, position, team, reserve, submits, skill)
  values (owner_member, owner_position, 2, false, false, owner_skill);

  select coalesce(max(round), 0) + 1 into next_round from public.matches where group_id = grp;

  insert into public.matches (group_id, round, played_on, status, created_by)
  values (grp, next_round, today, 'open', owner_user)
  returning id into test_match;

  insert into public.match_attendance (group_id, match_id, member_id, team, reserve)
  select grp, test_match, member_id, team, reserve from seed_players;

  -- Quem enviou avaliou todos os outros presentes. Nota = habilidade/10 + fase do
  -- jogador na rodada + ruído, limitada a 1–10. Goleiro usa as colunas de goleiro.
  with form as materialized (
    select member_id, (random() - 0.5) * 2.4 as shift from seed_players
  )
  insert into public.evaluations (
    match_id, evaluator_id, player_id,
    vel, chu, pas, dri, def, fis,
    ref, ela, pos, sai, rep, pes
  )
  select
    test_match, e.member_id, p.member_id,
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
  from seed_players e
  cross join seed_players p
  join form f on f.member_id = p.member_id
  where e.submits and e.member_id <> p.member_id;

  -- Voto no Gol da Rodada de quem enviou (o único prêmio votado), em outro presente.
  insert into public.round_votes (match_id, voter_id, kind, nominee_id)
  select test_match, e.member_id, 'gol', (
    select p.member_id from seed_players p
    where p.member_id <> e.member_id
    order by random()
    limit 1
  )
  from seed_players e
  where e.submits;

  raise notice 'Rodada de teste % criada (% presentes, 8 já enviaram).', next_round, (select count(*) from seed_players);
end
$seed$;
