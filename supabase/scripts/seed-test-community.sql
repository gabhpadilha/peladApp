-- Jogadores FICTÍCIOS na pelada "teste" para ver a Comunidade (ranking público, perfil do atleta, galeria e feed).
-- NÃO é migration: rode à mão (ou pela API de gerenciamento) e desfaça com cleanup-test-community.sql.
--
-- Cria 9 jogadores (1 goleiro + 8 de linha, e-mail seed.teste.NN@peladapp.test, sem senha: não fazem login) e 3 rodadas
-- FECHADAS (22/10, 29/10 e 05/11, esta de 3 notas) só com eles, com cartas especiais calculadas por compute_match_awards.
-- 6 aceitam aparecer na comunidade e 3 não (para ver que quem não aceitou some). O dono real da pelada não entra nas rodadas.
-- Depois, o Administrador da "teste" liga "Aparecer na comunidade" em Elenco, o que grava o recorte público.

do $seed$
declare
  roster constant jsonb := $json$[
    {"n": 1, "nick": "Paredão",  "name": "Marcos Vinícius Teixeira", "pos": "GOL", "skill": [86, 80, 84, 78, 75, 70], "pub": true},
    {"n": 2, "nick": "Magrão2",  "name": "Anderson Lima Prado",      "pos": "PIV", "skill": [78, 92, 84, 86, 60, 88], "pub": true},
    {"n": 3, "nick": "Falcão",   "name": "Bruno Henrique Alves",     "pos": "ALA", "skill": [90, 84, 86, 91, 55, 70], "pub": true},
    {"n": 4, "nick": "Tiquinho", "name": "Thiago Costa Nunes",       "pos": "ALA", "skill": [88, 74, 80, 84, 52, 66], "pub": true},
    {"n": 5, "nick": "Muralha",  "name": "Diego Ferreira Castro",    "pos": "FIX", "skill": [65, 60, 76, 62, 88, 84], "pub": true},
    {"n": 6, "nick": "Juninho",  "name": "José Carlos Júnior",       "pos": "ALA", "skill": [82, 70, 74, 78, 50, 62], "pub": true},
    {"n": 7, "nick": "Baiano",   "name": "Lucas Oliveira Brito",     "pos": "PIV", "skill": [64, 78, 68, 70, 54, 80], "pub": false},
    {"n": 8, "nick": "Careca",   "name": "Fábio Martins Rocha",      "pos": "FIX", "skill": [60, 58, 70, 56, 80, 76], "pub": false},
    {"n": 9, "nick": "Zeca",     "name": "José Antônio Rocha",       "pos": "PIV", "skill": [52, 64, 56, 54, 48, 68], "pub": false}
  ]$json$;
  rounds constant jsonb := $json$[
    {"on": "2026-10-22", "theme": "halloween"},
    {"on": "2026-10-29", "theme": "halloween"},
    {"on": "2026-11-05", "theme": "temporal"}
  ]$json$;

  grp uuid;
  org uuid;
  player jsonb;
  round_def jsonb;
  new_user uuid;
  new_member uuid;
  current_match uuid;
  next_round int;
  played date;
begin
  select id into grp from public.groups where name_key = 'teste';
  if grp is null then raise exception 'Pelada "teste" não encontrada.'; end if;
  if exists (select 1 from auth.users where raw_user_meta_data ->> 'seed_group' = 'teste') then
    raise exception 'Já existem jogadores fictícios da "teste". Rode cleanup-test-community.sql antes.';
  end if;
  select user_id into org from public.group_members where group_id = grp and role = 'organizer' order by joined_at limit 1;

  perform setseed(0.2026);

  create temp table seed_players (
    member_id uuid primary key, nickname text not null, position public.player_position not null, skill int[] not null
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
      'seed.teste.' || lpad((player ->> 'n'), 2, '0') || '@peladapp.test', '', now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb, '{"seed": true, "seed_group": "teste"}'::jsonb, now(), now(),
      '', '', '', ''
    );
    update public.profiles set full_name = player ->> 'name' where id = new_user;
    insert into public.group_members (group_id, user_id, nickname, position, public_profile_at)
    values (grp, new_user, player ->> 'nick', (player ->> 'pos')::public.player_position,
            case when (player ->> 'pub')::boolean then now() end)
    returning id into new_member;
    insert into seed_players values (new_member, player ->> 'nick', (player ->> 'pos')::public.player_position,
      array(select jsonb_array_elements_text(player -> 'skill')::int));
  end loop;

  for round_def in select value from jsonb_array_elements(rounds) loop
    played := (round_def ->> 'on')::date;
    select coalesce(max(round), 0) + 1 into next_round from public.matches where group_id = grp;

    -- ratings_unlocked_at: sem a etapa dos gols, que não faz parte deste teste.
    insert into public.matches (group_id, round, played_on, status, created_by, closed_at, ratings_unlocked_at)
    values (grp, next_round, played, 'open', org, null, now())
    returning id into current_match;

    insert into public.match_attendance (group_id, match_id, member_id, team)
    select grp, current_match, member_id, (((row_number() over (order by random())) - 1) % 2 + 1)::smallint
    from seed_players;

    -- Nota = habilidade/10 + fase do jogador na rodada + ruído, de 1 a 10. Goleiro usa as colunas de goleiro.
    -- A partir de 02/11 a votação é de 3 notas: cada par de atributos recebe o mesmo valor.
    with present as (select s.* from seed_players s),
    form as materialized (select member_id, (random() - 0.5) * 2.4 as shift from present),
    raw as (
      select e.member_id as evaluator, p.member_id as rated, p.position as pos_kind,
        greatest(1, least(10, round(p.skill[1] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint as s1,
        greatest(1, least(10, round(p.skill[2] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint as s2,
        greatest(1, least(10, round(p.skill[3] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint as s3,
        greatest(1, least(10, round(p.skill[4] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint as s4,
        greatest(1, least(10, round(p.skill[5] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint as s5,
        greatest(1, least(10, round(p.skill[6] / 10.0 + f.shift + (random() - 0.5) * 1.6)))::smallint as s6
      from present e cross join present p join form f on f.member_id = p.member_id
      where e.member_id <> p.member_id
    ),
    paired as (
      select *,
        case when played >= date '2026-11-02' then s1 else s1 end as a1,
        case when played >= date '2026-11-02' then s1 else s2 end as a2,
        case when played >= date '2026-11-02' then s3 else s3 end as b1,
        case when played >= date '2026-11-02' then s3 else s4 end as b2,
        case when played >= date '2026-11-02' then s5 else s5 end as c1,
        case when played >= date '2026-11-02' then s5 else s6 end as c2
      from raw
    )
    insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis, ref, ela, pos, sai, rep, pes)
    select current_match, evaluator, rated,
      case when pos_kind <> 'GOL' then a1 end, case when pos_kind <> 'GOL' then a2 end,
      case when pos_kind <> 'GOL' then b1 end, case when pos_kind <> 'GOL' then b2 end,
      case when pos_kind <> 'GOL' then c1 end, case when pos_kind <> 'GOL' then c2 end,
      case when pos_kind = 'GOL' then a1 end, case when pos_kind = 'GOL' then a2 end,
      case when pos_kind = 'GOL' then b1 end, case when pos_kind = 'GOL' then b2 end,
      case when pos_kind = 'GOL' then c1 end, case when pos_kind = 'GOL' then c2 end
    from paired;

    update public.matches set status = 'closed', closed_at = (played + 1)::timestamptz where id = current_match;
    perform public.compute_match_awards(current_match, round_def ->> 'theme');
  end loop;

  raise notice 'Fictícios da "teste" criados: 9 jogadores e 3 rodadas fechadas.';
end
$seed$;
