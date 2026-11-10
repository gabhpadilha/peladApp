-- Objetivos do mês (design em docs/superpowers/specs/2026-11-09-objetivos-mensais-design.md).
-- 3 vagas por jogador por mês (fácil, médio, difícil); em cada uma o jogador escolhe UMA opção, sem troca, e só conta o que
-- acontece depois do aceite. Cumprir = pacote de skin (fácil C, médio B, difícil A). O progresso NÃO é gravado: sai das
-- rodadas fechadas, como o XP; só a escolha (e a hora do aceite) fica na tabela. Cumprir é decidido dentro de `close_match`.
-- Só existe em pelada com pacotes ligados (`packs_enabled`) e conjunto do mês cadastrado (`pack_sets`).

-- 1. Catálogo de opções (fonte única: o banco avalia e o app lê; mudar um número = um update) ---------------------------
create table public.goal_options (
  key text primary key,
  level text not null check (level in ('easy', 'medium', 'hard')),
  role text not null check (role in ('line', 'goalkeeper')),
  -- rounds = jogar N rodadas · goals_total = N gols confirmados no mês · goals_game = N gols confirmados numa rodada só
  -- score_rounds = N rodadas com nota acima de `score_min` (escala 0-99) · prizes = N cartas de prêmio individual
  -- best_gk = N vezes Melhor Goleiro
  metric text not null check (metric in ('rounds', 'goals_total', 'goals_game', 'score_rounds', 'prizes', 'best_gk')),
  target integer not null check (target > 0),
  score_min integer check (score_min between 1 and 99),
  label text not null,
  sort_order integer not null,
  check ((metric = 'score_rounds') = (score_min is not null))
);
alter table public.goal_options enable row level security;
revoke all on public.goal_options from anon, authenticated;

insert into public.goal_options (key, level, role, metric, target, score_min, label, sort_order) values
  ('line_easy_rounds2',   'easy',   'line', 'rounds',       2, null, 'Jogar 2 rodadas', 1),
  ('line_easy_goals2',    'easy',   'line', 'goals_total',  2, null, 'Fazer 2 gols no mês', 2),
  ('line_easy_score60',   'easy',   'line', 'score_rounds', 2, 60,   'Nota acima de 60 em 2 rodadas', 3),
  ('line_medium_rounds3', 'medium', 'line', 'rounds',       3, null, 'Jogar 3 rodadas', 1),
  ('line_medium_goals5',  'medium', 'line', 'goals_total',  5, null, 'Fazer 5 gols no mês', 2),
  ('line_medium_score70', 'medium', 'line', 'score_rounds', 2, 70,   'Nota acima de 70 em 2 rodadas', 3),
  ('line_medium_prizes1', 'medium', 'line', 'prizes',       1, null, 'Ganhar 1 carta de prêmio', 4),
  ('line_hard_game3',     'hard',   'line', 'goals_game',   3, null, 'Fazer 3 gols num jogo só', 1),
  ('line_hard_goals10',   'hard',   'line', 'goals_total', 10, null, 'Fazer 10 gols no mês', 2),
  ('line_hard_score75',   'hard',   'line', 'score_rounds', 3, 75,   'Nota acima de 75 em 3 rodadas', 3),
  ('line_hard_prizes2',   'hard',   'line', 'prizes',       2, null, 'Ganhar 2 cartas de prêmio', 4),
  ('gk_easy_rounds2',     'easy',   'goalkeeper', 'rounds',       2, null, 'Jogar 2 rodadas', 1),
  ('gk_easy_score60',     'easy',   'goalkeeper', 'score_rounds', 2, 60,   'Nota acima de 60 em 2 rodadas', 2),
  ('gk_medium_rounds3',   'medium', 'goalkeeper', 'rounds',       3, null, 'Jogar 3 rodadas', 1),
  ('gk_medium_score70',   'medium', 'goalkeeper', 'score_rounds', 2, 70,   'Nota acima de 70 em 2 rodadas', 2),
  ('gk_medium_best1',     'medium', 'goalkeeper', 'best_gk',      1, null, 'Ganhar Melhor Goleiro 1 vez', 3),
  ('gk_hard_score75',     'hard',   'goalkeeper', 'score_rounds', 3, 75,   'Nota acima de 75 em 3 rodadas', 1),
  ('gk_hard_best2',       'hard',   'goalkeeper', 'best_gk',      2, null, 'Ganhar Melhor Goleiro 2 vezes', 2),
  ('gk_hard_rounds4',     'hard',   'goalkeeper', 'rounds',       4, null, 'Jogar 4 rodadas', 3);

-- 2. Escolhas (uma por jogador, mês e nível; sem troca) -----------------------------------------------------------------
create table public.goal_choices (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  level text not null check (level in ('easy', 'medium', 'hard')),
  option_key text not null references public.goal_options (key),
  accepted_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (member_id, month, level)
);
create index goal_choices_group_month_idx on public.goal_choices (group_id, month);
alter table public.goal_choices enable row level security;
revoke all on public.goal_choices from anon, authenticated;

-- 3. Pacote de objetivo: mesma tabela dos pacotes da rodada, com origem própria ---------------------------------------
-- `match_id` = a rodada cujo fechamento cumpriu o objetivo (assim o resto do app, que lê o pacote pela rodada, segue igual).
alter table public.packs
  add column source text not null default 'round' check (source in ('round', 'goal')),
  add column goal_choice_id uuid references public.goal_choices (id) on delete cascade,
  add constraint packs_source_goal_check check ((source = 'goal') = (goal_choice_id is not null));
alter table public.packs drop constraint packs_match_id_member_id_key;
create unique index packs_round_once_idx on public.packs (match_id, member_id) where source = 'round';
create unique index packs_goal_once_idx on public.packs (goal_choice_id) where goal_choice_id is not null;

drop function public.get_my_packs();
create function public.get_my_packs()
returns table (
  pack_id uuid, match_id uuid, round integer, month text, tier text, odds jsonb, created_at timestamptz,
  opened_at timestamptz, skin text, rarity text, was_duplicate boolean, coins_awarded integer, source text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.match_id, m.round, p.month, p.tier, p.odds, p.created_at, p.opened_at,
    case when p.opened_at is not null then p.skin end,
    case when p.opened_at is not null then p.rarity end,
    p.was_duplicate, p.coins_awarded, p.source
  from public.packs p
  join public.group_members gm on gm.id = p.member_id
  join public.matches m on m.id = p.match_id
  where gm.user_id = (select auth.uid())
  order by p.created_at, p.id;
$$;
revoke execute on function public.get_my_packs() from public, anon;
grant execute on function public.get_my_packs() to authenticated;

-- 4. Progresso (interna): só rodadas fechadas DEPOIS do aceite -----------------------------------------------------------
-- Conta a rodada se ela fechou depois do aceite e a data dela não é anterior ao dia do aceite (fuso de Brasília), no mês da escolha.
create function public.goal_progress(
  p_group uuid, p_member uuid, p_month text, p_accepted timestamptz, p_metric text, p_score_min integer
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  accepted_day date := (p_accepted at time zone 'America/Sao_Paulo')::date;
  result integer;
begin
  if p_metric = 'rounds' then
    select count(*)::integer into result
    from public.match_attendance a join public.matches m on m.id = a.match_id
    where a.member_id = p_member and m.group_id = p_group and m.status = 'closed'
      and to_char(m.played_on, 'YYYY-MM') = p_month and m.closed_at > p_accepted and m.played_on >= accepted_day;

  elsif p_metric in ('goals_total', 'goals_game') then
    -- Gols confirmados: 3 "sim" ou mais (a mesma conta do Goleador da Rodada).
    select case when p_metric = 'goals_total' then coalesce(sum(g.goals), 0) else coalesce(max(g.goals), 0) end::integer into result
    from public.match_goals g join public.matches m on m.id = g.match_id
    where g.member_id = p_member and g.goals > 0 and m.group_id = p_group and m.status = 'closed'
      and to_char(m.played_on, 'YYYY-MM') = p_month and m.closed_at > p_accepted and m.played_on >= accepted_day
      and (select count(*) from public.match_goal_confirmations c
            where c.match_id = g.match_id and c.member_id = g.member_id and c.confirmed) >= 3;

  elsif p_metric = 'score_rounds' then
    -- Nota da rodada (a mesma do Melhor Jogador, escala 1-10) x 10 = escala da carta (0-99); "acima de" = maior que.
    select count(*)::integer into result from (
      select c.match_id,
        public.round_score(
          min(c.played_on),
          avg(c.score) filter (where c.counted),
          avg(c.vel) filter (where c.counted), avg(c.chu) filter (where c.counted), avg(c.pas) filter (where c.counted),
          avg(c.dri) filter (where c.counted), avg(c.def) filter (where c.counted), avg(c.fis) filter (where c.counted),
          avg(c.ref) filter (where c.counted), avg(c.ela) filter (where c.counted), avg(c.pos) filter (where c.counted),
          avg(c.sai) filter (where c.counted), avg(c.rep) filter (where c.counted), avg(c.pes) filter (where c.counted)
        ) as score
      from public.counted_evaluations(p_group) c
      join public.matches m on m.id = c.match_id
      where c.player_id = p_member and m.status = 'closed'
        and to_char(m.played_on, 'YYYY-MM') = p_month and m.closed_at > p_accepted and m.played_on >= accepted_day
      group by c.match_id
    ) s
    where s.score * 10 > p_score_min;

  elsif p_metric in ('prizes', 'best_gk') then
    -- Prêmio individual da rodada: tudo que é carta de jogador, menos Bola Murcha e os de equipe (Time da Semana, Time do Mês, Campeão do Mês).
    select count(*)::integer into result
    from public.awards a join public.matches m on m.id = a.match_id
    where a.member_id = p_member and a.group_id = p_group and m.status = 'closed'
      and to_char(m.played_on, 'YYYY-MM') = p_month and m.closed_at > p_accepted and m.played_on >= accepted_day
      and case when p_metric = 'best_gk' then a.kind = 'goleiro'::public.award_kind
        else a.kind in ('craque', 'gol', 'goleiro', 'atacante', 'criativo', 'defensor', 'goleador', 'foguete', 'garcom', 'drible', 'motor') end;
  end if;

  return coalesce(result, 0);
end;
$$;
revoke execute on function public.goal_progress(uuid, uuid, text, timestamptz, text, integer) from public, anon, authenticated;

-- 5. Sorteio do pacote do objetivo (interna): faixa pelo nível, skin pelo conjunto do mês e as chances da faixa -----------
create function public.draw_goal_pack(target_choice uuid, target_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  choice_row public.goal_choices;
  pack_tier text;
  total_w numeric;
  cut numeric;
  pick_skin text;
  odds_json jsonb;
begin
  select * into choice_row from public.goal_choices where id = target_choice;
  pack_tier := case choice_row.level when 'easy' then 'C' when 'medium' then 'B' else 'A' end;

  drop table if exists pg_temp.goal_w;
  create temp table goal_w on commit drop as
    select s.skin, s.rarity, o.weight / cnt.c as w
    from public.pack_sets s
    join public.pack_tier_odds o on o.tier = pack_tier and o.rarity = s.rarity
    join (select ps.rarity, count(*)::numeric as c from public.pack_sets ps where ps.month = choice_row.month group by ps.rarity) cnt
      on cnt.rarity = s.rarity
    where s.month = choice_row.month;

  select sum(w) into total_w from pg_temp.goal_w;
  if total_w is null or total_w = 0 then
    raise exception 'sem conjunto de pacotes para o mês' using errcode = 'PA042';
  end if;
  select jsonb_object_agg(r.rarity, round(100 * r.sw / total_w, 1)) into odds_json
  from (select rarity, sum(w) as sw from pg_temp.goal_w group by rarity) r;

  cut := random() * total_w;
  select x.skin into pick_skin from (
    select skin, sum(w) over (order by skin) as cum from pg_temp.goal_w
  ) x where x.cum >= cut order by x.cum limit 1;

  insert into public.packs (group_id, member_id, match_id, month, tier, rarity, skin, odds, source, goal_choice_id)
  select choice_row.group_id, choice_row.member_id, target_match, choice_row.month, pack_tier, s.rarity, s.skin, odds_json, 'goal', target_choice
  from public.pack_sets s where s.month = choice_row.month and s.skin = pick_skin;
end;
$$;
revoke execute on function public.draw_goal_pack(uuid, uuid) from public, anon, authenticated;

-- 6. Cumprir (interna, chamada por close_match): só quem jogou a rodada pode ter mudado de progresso ---------------------
create function public.evaluate_goals(target_match uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  match_month text;
  choice_row record;
  done_count integer := 0;
begin
  select m.group_id, to_char(m.played_on, 'YYYY-MM') into target_group, match_month from public.matches m where m.id = target_match;
  if not coalesce((select g.packs_enabled from public.groups g where g.id = target_group), false) then return 0; end if;
  if not exists (select 1 from public.pack_sets s where s.month = match_month) then return 0; end if;

  -- Fechamentos simultâneos da mesma pelada não podem completar o mesmo objetivo duas vezes.
  perform pg_advisory_xact_lock(hashtextextended('goals:' || target_group::text, 0));

  for choice_row in
    select gc.id, gc.member_id, gc.month, gc.accepted_at, o.metric, o.target, o.score_min
    from public.goal_choices gc
    join public.goal_options o on o.key = gc.option_key
    join public.match_attendance a on a.member_id = gc.member_id and a.match_id = target_match
    join public.group_members gm on gm.id = gc.member_id and gm.deactivated_at is null
    where gc.group_id = target_group and gc.month = match_month and gc.completed_at is null
  loop
    if public.goal_progress(target_group, choice_row.member_id, choice_row.month, choice_row.accepted_at, choice_row.metric, choice_row.score_min)
       >= choice_row.target then
      update public.goal_choices set completed_at = now() where id = choice_row.id and completed_at is null;
      if found then
        perform public.draw_goal_pack(choice_row.id, target_match);
        done_count := done_count + 1;
      end if;
    end if;
  end loop;
  return done_count;
end;
$$;
revoke execute on function public.evaluate_goals(uuid) from public, anon, authenticated;

-- close_match: igual ao de 20261108120000, e depois dos pacotes da rodada cumpre os objetivos (mesma transação).
create or replace function public.close_match(target_match uuid, theme_key text default 'default')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
  others_count integer;
  complete_submissions integer;
  award_count integer;
begin
  select group_id, status into target_group, current_status
  from public.matches
  where id = target_match;

  if target_group is null or not public.is_group_organizer(target_group) then
    raise exception 'only organizers can close rounds' using errcode = '42501';
  end if;
  if current_status <> 'open' then
    raise exception 'round is not open';
  end if;
  if theme_key !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'invalid theme';
  end if;

  select count(*) - 1 into others_count from public.match_attendance where match_id = target_match;
  select count(*) into complete_submissions
  from (
    select e.evaluator_id
    from public.evaluations e
    where e.match_id = target_match
    group by e.evaluator_id
    having count(*) >= others_count
  ) complete;
  if complete_submissions < 5 then
    raise exception 'at least 5 complete submissions are needed' using errcode = 'PA005';
  end if;

  update public.matches set status = 'closed', closed_at = now() where id = target_match;
  award_count := public.compute_match_awards(target_match, theme_key);
  perform public.draw_round_packs(target_match);
  perform public.evaluate_goals(target_match);
  return award_count;
end;
$$;

-- 7. Leitura e aceite (o jogador só enxerga e mexe nos próprios objetivos) ---------------------------------------------
-- Opções do mês para a posição do logado (goleiro ou linha), com a escolha, o progresso e o cumprimento. Sem pacotes ligados
-- na pelada, ou sem conjunto do mês, não devolve nada (o app esconde o cartão).
create function public.get_my_goals(target_group uuid)
returns table (
  level text, option_key text, label text, target integer, sort_order integer,
  chosen boolean, accepted_at timestamptz, progress integer, completed_at timestamptz, tier text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me record;
  this_month text := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM');
  my_role text;
begin
  select gm.id, gm.position::text as pos into me
  from public.group_members gm
  where gm.group_id = target_group and gm.user_id = (select auth.uid()) and gm.deactivated_at is null;
  if me.id is null then return; end if;
  if not coalesce((select g.packs_enabled from public.groups g where g.id = target_group), false) then return; end if;
  if not exists (select 1 from public.pack_sets s where s.month = this_month) then return; end if;
  my_role := case when me.pos = 'GOL' then 'goalkeeper' else 'line' end;

  return query
  select o.level, o.key, o.label, o.target, o.sort_order,
    gc.id is not null,
    gc.accepted_at,
    case when gc.id is not null then least(o.target,
      public.goal_progress(target_group, me.id, this_month, gc.accepted_at, o.metric, o.score_min)) end,
    gc.completed_at,
    case o.level when 'easy' then 'C' when 'medium' then 'B' else 'A' end
  from public.goal_options o
  left join public.goal_choices gc on gc.member_id = me.id and gc.month = this_month and gc.level = o.level and gc.option_key = o.key
  where o.role = my_role
  order by case o.level when 'easy' then 1 when 'medium' then 2 else 3 end, o.sort_order;
end;
$$;
revoke execute on function public.get_my_goals(uuid) from public, anon;
grant execute on function public.get_my_goals(uuid) to authenticated;

-- Aceita um objetivo (escolha única por nível e mês; o progresso conta a partir de agora).
create function public.accept_goal(target_group uuid, chosen_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me record;
  option_row public.goal_options;
  this_month text := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM');
  my_role text;
begin
  select gm.id, gm.position::text as pos into me
  from public.group_members gm
  where gm.group_id = target_group and gm.user_id = (select auth.uid()) and gm.deactivated_at is null;
  if me.id is null then
    raise exception 'jogador inativo' using errcode = 'PA020';
  end if;
  if exists (select 1 from public.groups g where g.id = target_group and g.suspended_at is not null) then
    raise exception 'pelada suspensa' using errcode = 'PA009';
  end if;
  if not coalesce((select g.packs_enabled from public.groups g where g.id = target_group), false)
     or not exists (select 1 from public.pack_sets s where s.month = this_month) then
    raise exception 'objetivos desligados' using errcode = 'PA042';
  end if;

  my_role := case when me.pos = 'GOL' then 'goalkeeper' else 'line' end;
  select * into option_row from public.goal_options where key = chosen_key;
  if option_row.key is null or option_row.role <> my_role then
    raise exception 'objetivo indisponível' using errcode = 'PA041';
  end if;

  begin
    insert into public.goal_choices (group_id, member_id, month, level, option_key)
    values (target_group, me.id, this_month, option_row.level, chosen_key);
  exception when unique_violation then
    raise exception 'objetivo já escolhido' using errcode = 'PA040';
  end;
end;
$$;
revoke execute on function public.accept_goal(uuid, text) from public, anon;
grant execute on function public.accept_goal(uuid, text) to authenticated;
