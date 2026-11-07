-- Rodada de TESTE dos pacotes de skins numa pelada de teste.
-- NÃO é migration: rode à mão com
--   npx supabase db query --linked -f supabase/scripts/seed-test-packs.sql
-- e desfaça com supabase/scripts/cleanup-test-packs.sql.
--
-- Pré-requisito: a pelada "Teste Pacotes" criada pelo painel /admin (com a conta do dono, que é quem testa).
-- O script: liga os pacotes nela (mínimo 10, sem limite de rodadas); põe no mês de novembro/2026 um conjunto
-- PROVISÓRIO de skins que já existem (só para testar; o conjunto real é o de dezembro); cria 11 jogadores fictícios
-- (sem senha, marcados com raw_user_meta_data.seed = true e e-mail seed.pk.NN@peladapp.test) e uma rodada ABERTA
-- de hoje com o dono + eles (12 presentes, 6 por time, 2 reservas), com as notas já liberadas. 10 fictícios já
-- enviaram as notas; o dono NÃO enviou: ele avalia pela mesa tática e fecha a rodada, e os 12 ganham pacote.
-- Rode de novo para outra rodada (os fictícios já existentes são reaproveitados; não pode haver rodada aberta).

do $seed$
declare
  roster constant jsonb := $json$[
    {"n": 1,  "nick": "Paredão",  "name": "Marcos Vinícius Teixeira", "pos": "GOL", "team": 1, "reserve": false, "submits": true,  "skill": [86, 80, 84, 78, 75, 70]},
    {"n": 2,  "nick": "Gato",     "name": "Rafael Souza Lima",        "pos": "GOL", "team": 2, "reserve": false, "submits": true,  "skill": [72, 70, 66, 64, 62, 58]},
    {"n": 3,  "nick": "Falcão",   "name": "Bruno Henrique Alves",     "pos": "ALA", "team": 1, "reserve": false, "submits": true,  "skill": [90, 84, 86, 91, 55, 70]},
    {"n": 4,  "nick": "Tiquinho", "name": "Thiago Costa Nunes",       "pos": "ALA", "team": 2, "reserve": false, "submits": true,  "skill": [88, 74, 80, 84, 52, 66]},
    {"n": 5,  "nick": "Muralha",  "name": "Diego Ferreira Castro",    "pos": "FIX", "team": 2, "reserve": false, "submits": true,  "skill": [65, 60, 76, 62, 88, 84]},
    {"n": 6,  "nick": "Juninho",  "name": "José Carlos Júnior",       "pos": "ALA", "team": 1, "reserve": false, "submits": true,  "skill": [82, 70, 74, 78, 50, 62]},
    {"n": 7,  "nick": "Baiano",   "name": "Lucas Oliveira Brito",     "pos": "PIV", "team": 2, "reserve": false, "submits": true,  "skill": [64, 78, 68, 70, 54, 80]},
    {"n": 8,  "nick": "Careca",   "name": "Fábio Martins Rocha",      "pos": "PIV", "team": 1, "reserve": false, "submits": true,  "skill": [60, 58, 70, 56, 80, 76]},
    {"n": 9,  "nick": "Neguinho", "name": "Wesley Santos Duarte",     "pos": "ALA", "team": 1, "reserve": false, "submits": true,  "skill": [80, 62, 64, 72, 48, 58]},
    {"n": 10, "nick": "Zeca",     "name": "José Antônio Rocha",       "pos": "FIX", "team": 1, "reserve": true,  "submits": true,  "skill": [52, 64, 56, 54, 48, 68]},
    {"n": 11, "nick": "Pelé Jr",  "name": "André Luiz Pereira",       "pos": "FIX", "team": 2, "reserve": true,  "submits": false, "skill": [58, 62, 60, 66, 60, 64]}
  ]$json$;
  -- Nota-base do dono nas notas que os fictícios dão a ele.
  owner_skill constant int[] := array[76, 72, 78, 74, 70, 75];
  test_month constant text := '2026-11';

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
  select id, created_by into grp, owner_user from public.groups where name = 'Teste Pacotes';
  if grp is null then
    raise exception 'Crie a pelada "Teste Pacotes" pelo painel /admin antes (com a conta do dono).';
  end if;

  select id, position into owner_member, owner_position
  from public.group_members
  where group_id = grp and user_id = owner_user and deactivated_at is null;
  if owner_member is null then
    raise exception 'O dono não está ativo na pelada de teste.';
  end if;

  if exists (select 1 from public.matches where group_id = grp and status = 'open') then
    raise exception 'Já existe uma rodada aberta na pelada de teste. Feche ou exclua antes.';
  end if;

  -- Pacotes ligados, mínimo de 10 e sem limite de rodadas por semana (só nesta pelada de teste).
  update public.groups set packs_enabled = true, pack_min_players = 10, weekly_round_limit = null where id = grp;

  -- Conjunto provisório do mês de teste (skins que já existem): 1 lendária, 2 épicas, 4 raras e 4 comuns.
  if not exists (select 1 from public.pack_sets where month = test_month) then
    insert into public.pack_sets (month, skin, design, rarity) values
      (test_month, 'destino', 'destino', 'lendaria'),
      (test_month, 'lenda', 'lenda', 'epica'),
      (test_month, 'relampago', 'relampago', 'epica'),
      (test_month, 'rubi', 'rubi', 'rara'),
      (test_month, 'icone', 'icone', 'rara'),
      (test_month, 'nuvem', 'nuvem', 'rara'),
      (test_month, 'ametista', 'ametista', 'rara'),
      (test_month, 'esmeralda', 'esmeralda', 'comum'),
      (test_month, 'safira', 'safira', 'comum'),
      (test_month, 'lobisomem', 'lobisomem', 'comum'),
      (test_month, 'vampiro', 'vampiro', 'comum');
  end if;

  perform setseed(0.2211);

  create temp table seed_players (
    member_id uuid primary key,
    position public.player_position not null,
    team smallint not null,
    reserve boolean not null,
    submits boolean not null,
    skill int[] not null
  ) on commit drop;

  for player in select value from jsonb_array_elements(roster) loop
    select id into new_user from auth.users where email = 'seed.pk.' || lpad((player ->> 'n'), 2, '0') || '@peladapp.test';
    if new_user is null then
      new_user := gen_random_uuid();
      -- Tokens vazios (não NULL): o GoTrue quebra ao ler usuários com token NULL.
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        new_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'seed.pk.' || lpad((player ->> 'n'), 2, '0') || '@peladapp.test', '', now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb, '{"seed": true}'::jsonb, now(), now(),
        '', '', '', ''
      );
      -- O trigger on_auth_user_created já criou o perfil.
      update public.profiles set full_name = player ->> 'name' where id = new_user;
    end if;

    select id into new_member from public.group_members where group_id = grp and user_id = new_user;
    if new_member is null then
      insert into public.group_members (group_id, user_id, nickname, position)
      values (grp, new_user, player ->> 'nick', (player ->> 'pos')::public.player_position)
      returning id into new_member;
    end if;

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

  -- O dono joga no Preto, como titular, e ainda não enviou as notas.
  insert into seed_players (member_id, position, team, reserve, submits, skill)
  values (owner_member, owner_position, 2, false, false, owner_skill);

  select coalesce(max(round), 0) + 1 into next_round from public.matches where group_id = grp;

  -- Notas liberadas direto (os gols dos fictícios não são informados: o teste é dos pacotes).
  insert into public.matches (group_id, round, played_on, status, created_by, ratings_unlocked_at)
  values (grp, next_round, today, 'open', owner_user, now())
  returning id into test_match;

  insert into public.match_attendance (group_id, match_id, member_id, team, reserve)
  select grp, test_match, member_id, team, reserve from seed_players;

  -- Quem enviou avaliou todos os outros presentes. Nota = habilidade/10 + fase do jogador na rodada + ruído, limitada a 1-10.
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

  raise notice 'Rodada de teste % criada (% presentes, 10 fictícios já enviaram).', next_round, (select count(*) from seed_players);
end
$seed$;
