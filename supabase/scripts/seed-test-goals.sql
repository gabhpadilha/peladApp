-- Rodada de TESTE dos gols confirmados, na etapa dos gols (notas ainda travadas).
-- NÃO é migration: rode à mão com
--   npx supabase db query --linked -f supabase/scripts/seed-test-goals.sql
-- Depois que o Administrador informar os gols dele e marcar os de quem está "sem celular"
-- (ou liberar as notas), os fictícios enviam as notas com
--   npx supabase db query --linked -f supabase/scripts/seed-test-goals-submit.sql
-- Desfaça com supabase/scripts/cleanup-test-round.sql (apaga a rodada e os fictícios).
--
-- Mesmos 10 fictícios da seed-test-round.sql, numa rodada ABERTA de hoje com o Administrador.
-- Gols já informados: Falcão 3 (2 confirmações, falta 1), Tiquinho 2 (3 "sim" e 1 "não":
-- confirmado), Baiano 1 (sem confirmação), Careca 1 (1 "não"), o resto 0.
-- Sem informar: o Gato ("sem celular": o Administrador marca pela mesa tática) e o próprio
-- Administrador (a tela "Quantos gols você fez?"). Ninguém enviou notas ainda.

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
  create temp table seed_goals (member_id uuid primary key, nick text not null, goals smallint) on commit drop;

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

    insert into seed_goals (member_id, nick, goals)
    values (
      new_member,
      player ->> 'nick',
      case player ->> 'nick'
        when 'Gato' then null
        when 'Falcão' then 3
        when 'Tiquinho' then 2
        when 'Baiano' then 1
        when 'Careca' then 1
        else 0
      end
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

  -- Etapa dos gols: todos os fictícios informaram, menos o Gato (sem celular).
  insert into public.match_goals (group_id, match_id, member_id, goals, reported_by)
  select grp, test_match, member_id, goals, member_id
  from seed_goals
  where goals is not null;

  -- Confirmações (quem votou, nos gols de quem, sim ou não).
  insert into public.match_goal_confirmations (group_id, match_id, member_id, voter_id, confirmed)
  select grp, test_match, target.member_id, voter.member_id, vote.confirmed
  from (values
    ('Falcão', 'Paredão', true), ('Falcão', 'Muralha', true),
    ('Tiquinho', 'Paredão', true), ('Tiquinho', 'Falcão', true), ('Tiquinho', 'Careca', true), ('Tiquinho', 'Baiano', false),
    ('Careca', 'Juninho', false)
  ) as vote (target_nick, voter_nick, confirmed)
  join seed_goals target on target.nick = vote.target_nick
  join seed_goals voter on voter.nick = vote.voter_nick;

  raise notice 'Rodada de teste dos gols % criada (% presentes, etapa dos gols).', next_round, (select count(*) from seed_players);
end
$seed$;
