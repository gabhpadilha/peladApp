-- Prêmios do mês em pacotes (design em docs/superpowers/specs/2026-11-12-premios-do-mes-design.md, aprovado pelo dono do app em 2026-11-12).
-- Ao fechar a rodada da ÚLTIMA QUINTA do mês, cada jogador do ranking de pontos do mês ganha um pacote (`source = 'monthly'`):
--   1º (Campeão do Mês, empatados todos): pacote de 4 skins diferentes
--   2º e 3º (pela posição com empate): pacote de 3 skins diferentes
--   resto: 30% de cima 1 pacote da faixa A, 30% de baixo faixa C, o meio faixa B
-- Sem mínimo de rodadas; só jogadores ativos que jogaram no mês. As skins dos pacotes de 3 e 4 saem pelas chances da faixa A (Craque),
-- do conjunto do mês, SEM repetir dentro do pacote; skin que o jogador já tem vira cópia extra (como nos outros pacotes).
-- Esses pacotes não são vendidos na Loja. Depende de 20261114120000_spare_copies.sql.
-- A carta do Campeão do Mês continua (compute_match_awards); o ranking aqui é o mesmo dela, lido depois que os prêmios da rodada foram gravados.

alter table public.packs drop constraint packs_source_check;
alter table public.packs add constraint packs_source_check check (source in ('round', 'goal', 'shop', 'gift', 'monthly'));
alter table public.packs add column size integer not null default 1 check (size between 1 and 4);
alter table public.packs add column place integer check (place is null or place > 0);
comment on column public.packs.size is 'Quantas skins o pacote traz (prêmio do mês: 3 ou 4; o resto: 1). As skins dos pacotes de várias ficam em pack_items.';
comment on column public.packs.place is 'Posição no ranking de pontos do mês (só nos pacotes de prêmio do mês).';
create unique index packs_monthly_once_idx on public.packs (group_id, month, member_id) where source = 'monthly';

-- Skins de um pacote de várias (a 1ª, `position` 1, é a mais rara e é a que também fica em packs.skin/rarity para a animação).
create table public.pack_items (
  pack_id uuid not null references public.packs (id) on delete cascade,
  position smallint not null check (position between 1 and 4),
  skin text not null,
  rarity text not null check (rarity in ('comum', 'rara', 'epica', 'lendaria')),
  was_duplicate boolean,
  primary key (pack_id, position),
  unique (pack_id, skin)
);
alter table public.pack_items enable row level security;
revoke all on public.pack_items from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ranking de pontos do mês (interna): o mesmo do Campeão do Mês em compute_match_awards, mas lendo os prêmios já gravados.
-- Por rodada fechada do mês em que esteve presente: nota da rodada x 10 (arredondada, teto 99) + 40 no Melhor Jogador, 20 em cada
-- outro prêmio individual (Time do Mês, Campeão do Mês, Time da Semana, Bola Murcha e Fominha não somam) + 10 por gol confirmado.
-- ---------------------------------------------------------------------------
create function public.month_ranking_points(target_group uuid, month_date date)
returns table (member_id uuid, points integer)
language sql
stable
security definer
set search_path = ''
as $$
  with month_matches as (
    select m.id as match_id
    from public.matches m
    where m.group_id = target_group
      and m.status = 'closed'
      and date_trunc('month', m.played_on) = date_trunc('month', month_date)
  ),
  month_round_scores as (
    select c.match_id, c.player_id as member_id,
      round(least(99, public.round_score(
        max(c.played_on),
        avg(c.score) filter (where c.counted),
        avg(c.vel) filter (where c.counted), avg(c.chu) filter (where c.counted), avg(c.pas) filter (where c.counted),
        avg(c.dri) filter (where c.counted), avg(c.def) filter (where c.counted), avg(c.fis) filter (where c.counted),
        avg(c.ref) filter (where c.counted), avg(c.ela) filter (where c.counted), avg(c.pos) filter (where c.counted),
        avg(c.sai) filter (where c.counted), avg(c.rep) filter (where c.counted), avg(c.pes) filter (where c.counted)
      ) * 10))::integer as base
    from public.counted_evaluations(target_group) c
    where c.match_id in (select match_id from month_matches)
    group by c.match_id, c.player_id
  )
  select
    attendance.member_id,
    sum(
      coalesce(scores.base, 0)
      + (
        select coalesce(sum(case when a.kind = 'craque' then 40 else 20 end), 0)
        from public.awards a
        where a.match_id = attendance.match_id and a.member_id = attendance.member_id
          and a.kind not in ('bola_murcha', 'fominha', 'jogador_do_mes', 'campeao_do_mes', 'time_da_semana')
      )
      + 10 * coalesce((
          select goal.goals from public.match_goals goal
          where goal.match_id = attendance.match_id and goal.member_id = attendance.member_id
            and (
              select count(*) from public.match_goal_confirmations confirmation
              where confirmation.match_id = goal.match_id and confirmation.member_id = goal.member_id and confirmation.confirmed
            ) >= 3
        ), 0)
    )::integer as points
  from public.match_attendance attendance
  join month_matches on month_matches.match_id = attendance.match_id
  join public.group_members active_member on active_member.id = attendance.member_id and active_member.deactivated_at is null
  left join month_round_scores scores on scores.match_id = attendance.match_id and scores.member_id = attendance.member_id
  group by attendance.member_id;
$$;
revoke execute on function public.month_ranking_points(uuid, date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sorteio de várias skins sem repetir (interna): sorteia uma, tira ela da urna e sorteia a próxima.
-- Devolve da mais rara para a mais comum (posição 1 = a mais rara).
-- ---------------------------------------------------------------------------
create function public.draw_pack_multi(p_month text, p_tier text, p_count integer)
returns table (item_position integer, skin text, rarity text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_w numeric;
  cut numeric;
  pick_skin text;
  i integer;
begin
  drop table if exists pg_temp.multi_w;
  create temp table multi_w on commit drop as
    select s.skin, s.rarity, o.weight / cnt.c as w
    from public.pack_sets s
    join public.pack_tier_odds o on o.tier = p_tier and o.rarity = s.rarity
    join (select ps.rarity, count(*)::numeric as c from public.pack_sets ps where ps.month = p_month group by ps.rarity) cnt
      on cnt.rarity = s.rarity
    where s.month = p_month;
  drop table if exists pg_temp.multi_pick;
  create temp table multi_pick (skin text primary key, rarity text not null) on commit drop;

  for i in 1..p_count loop
    select sum(m.w) into total_w from pg_temp.multi_w m where m.w > 0;
    exit when total_w is null or total_w = 0; -- conjunto menor que o pacote: vem o que houver
    cut := random() * total_w;
    select x.skin into pick_skin from (
      select m.skin, sum(m.w) over (order by m.skin) as cum from pg_temp.multi_w m where m.w > 0
    ) x where x.cum >= cut order by x.cum limit 1;
    insert into pg_temp.multi_pick (skin, rarity) select m.skin, m.rarity from pg_temp.multi_w m where m.skin = pick_skin;
    delete from pg_temp.multi_w m where m.skin = pick_skin;
  end loop;

  return query
    select (row_number() over (
        order by case p.rarity when 'lendaria' then 4 when 'epica' then 3 when 'rara' then 2 else 1 end desc, p.skin
      ))::integer, p.skin, p.rarity
    from pg_temp.multi_pick p;
end;
$$;
revoke execute on function public.draw_pack_multi(text, text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Entrega (interna, chamada por close_match depois dos prêmios): só na rodada da última quinta do mês.
-- ---------------------------------------------------------------------------
create function public.grant_monthly_prize_packs(target_match uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  target_date date;
  pack_month text;
  ranked_count integer;
  top_count integer;
  ranked_row record;
  pack_size integer;
  pack_tier text;
  pick record;
  odds_json jsonb;
  new_pack uuid;
  given integer := 0;
begin
  select m.group_id, m.played_on into target_group, target_date from public.matches m where m.id = target_match;
  if target_group is null then return 0; end if;
  -- Quinta-feira e, uma semana depois, já é outro mês (a mesma conta do Time do Mês).
  if not (extract(isodow from target_date) = 4 and date_trunc('month', target_date + 7) <> date_trunc('month', target_date)) then
    return 0;
  end if;
  if not coalesce((select g.packs_enabled from public.groups g where g.id = target_group), false) then return 0; end if;
  pack_month := to_char(target_date, 'YYYY-MM');
  if not exists (select 1 from public.pack_sets s where s.month = pack_month) then return 0; end if;

  perform pg_advisory_xact_lock(hashtextextended('monthly-packs:' || target_group::text, 0));
  if exists (select 1 from public.packs p where p.group_id = target_group and p.month = pack_month and p.source = 'monthly') then
    return 0;
  end if;

  drop table if exists pg_temp.month_rank;
  create temp table month_rank on commit drop as
    select r.member_id, r.points, (rank() over (order by r.points desc))::integer as place
    from public.month_ranking_points(target_group, target_date) r;
  select count(*)::integer into ranked_count from pg_temp.month_rank;
  top_count := ceil(0.3 * ranked_count)::integer;

  for ranked_row in select * from pg_temp.month_rank order by place, member_id loop
    if ranked_row.points > 0 and ranked_row.place = 1 then
      pack_size := 4;
    elsif ranked_row.points > 0 and ranked_row.place <= 3 then
      pack_size := 3;
    else
      pack_size := 1;
    end if;
    pack_tier := case
      when pack_size > 1 then 'A'
      when ranked_row.points > 0 and ranked_row.place <= top_count then 'A'
      when ranked_row.points = 0 or ranked_row.place > ranked_count - top_count then 'C'
      else 'B'
    end;

    -- Chances da faixa (as mesmas para cada skin do pacote).
    select jsonb_object_agg(r.rarity, round(100 * r.sw / r.total, 1)) into odds_json from (
      select s.rarity, sum(o.weight / cnt.c) as sw, sum(sum(o.weight / cnt.c)) over () as total
      from public.pack_sets s
      join public.pack_tier_odds o on o.tier = pack_tier and o.rarity = s.rarity
      join (select ps.rarity, count(*)::numeric as c from public.pack_sets ps where ps.month = pack_month group by ps.rarity) cnt
        on cnt.rarity = s.rarity
      where s.month = pack_month
      group by s.rarity
    ) r;

    drop table if exists pg_temp.monthly_items;
    create temp table monthly_items on commit drop as
      select * from public.draw_pack_multi(pack_month, pack_tier, pack_size);

    insert into public.packs (group_id, member_id, match_id, month, tier, rarity, skin, odds, source, size, place)
    select target_group, ranked_row.member_id, target_match, pack_month, pack_tier, i.rarity, i.skin, odds_json, 'monthly',
      (select count(*)::integer from pg_temp.monthly_items), ranked_row.place
    from pg_temp.monthly_items i where i.item_position = 1
    returning id into new_pack;

    if pack_size > 1 then
      insert into public.pack_items (pack_id, position, skin, rarity)
      select new_pack, i.item_position, i.skin, i.rarity from pg_temp.monthly_items i;
    end if;
    given := given + 1;
  end loop;
  return given;
end;
$$;
revoke execute on function public.grant_monthly_prize_packs(uuid) from public, anon, authenticated;

-- close_match: igual ao de 20261110120000, e por último entrega os prêmios do mês (mesma transação).
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
  perform public.grant_monthly_prize_packs(target_match);
  return award_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Abrir: pacote de uma skin segue igual; o de várias grava a posse de cada uma (cópia extra se o jogador já tem) e devolve todas,
-- da mais rara para a mais comum. Idempotente.
-- ---------------------------------------------------------------------------
create or replace function public.open_pack(target_pack uuid)
returns table (skin text, rarity text, was_duplicate boolean, coins_awarded integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack_row public.packs;
  owner_user uuid;
  is_dup boolean;
  item_row record;
  first_dup boolean;
begin
  select p.* into pack_row from public.packs p where p.id = target_pack for update;
  select gm.user_id into owner_user from public.group_members gm where gm.id = pack_row.member_id and gm.deactivated_at is null;
  if pack_row.id is null or owner_user is distinct from (select auth.uid()) then
    raise exception 'not your pack' using errcode = '42501';
  end if;

  if pack_row.opened_at is not null then
    if exists (select 1 from public.pack_items pi where pi.pack_id = pack_row.id) then
      return query select pi.skin, pi.rarity, pi.was_duplicate, 0 from public.pack_items pi where pi.pack_id = pack_row.id order by pi.position;
    else
      return query select pack_row.skin, pack_row.rarity, pack_row.was_duplicate, pack_row.coins_awarded;
    end if;
    return;
  end if;

  if exists (select 1 from public.pack_items pi where pi.pack_id = pack_row.id) then
    for item_row in select pi.position, pi.skin from public.pack_items pi where pi.pack_id = pack_row.id order by pi.position loop
      select exists (
        select 1 from public.card_skin_purchases cp
         where cp.member_id = pack_row.member_id and cp.skin = item_row.skin and cp.transferred_at is null
      ) into is_dup;
      insert into public.card_skin_purchases (group_id, member_id, skin, price, source, is_spare)
      values (pack_row.group_id, pack_row.member_id, item_row.skin, 0, 'pack', is_dup);
      update public.pack_items set was_duplicate = is_dup where pack_id = pack_row.id and position = item_row.position;
      if item_row.position = 1 then first_dup := is_dup; end if;
    end loop;
    update public.packs set opened_at = now(), was_duplicate = first_dup, coins_awarded = 0 where id = pack_row.id;
    return query select pi.skin, pi.rarity, pi.was_duplicate, 0 from public.pack_items pi where pi.pack_id = pack_row.id order by pi.position;
    return;
  end if;

  select exists (
    select 1 from public.card_skin_purchases cp
     where cp.member_id = pack_row.member_id and cp.skin = pack_row.skin and cp.transferred_at is null
  ) into is_dup;
  insert into public.card_skin_purchases (group_id, member_id, skin, price, source, is_spare)
  values (pack_row.group_id, pack_row.member_id, pack_row.skin, 0, 'pack', is_dup);
  update public.packs set opened_at = now(), was_duplicate = is_dup, coins_awarded = 0 where id = pack_row.id;
  return query select pack_row.skin, pack_row.rarity, is_dup, 0;
end;
$$;
revoke execute on function public.open_pack(uuid) from public, anon;
grant execute on function public.open_pack(uuid) to authenticated;

-- get_my_packs: agora com o tamanho, a posição no ranking do mês e as skins de dentro (só depois de aberto).
drop function public.get_my_packs();
create function public.get_my_packs()
returns table (
  pack_id uuid, group_id uuid, match_id uuid, round integer, month text, tier text, odds jsonb, created_at timestamptz,
  opened_at timestamptz, skin text, rarity text, was_duplicate boolean, coins_awarded integer, source text, price integer,
  size integer, place integer, items jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.group_id, p.match_id, m.round, p.month, p.tier, p.odds, p.created_at, p.opened_at,
    case when p.opened_at is not null then p.skin end,
    case when p.opened_at is not null then p.rarity end,
    p.was_duplicate, p.coins_awarded, p.source, p.price, p.size, p.place,
    case when p.opened_at is not null and p.size > 1 then (
      select jsonb_agg(jsonb_build_object('skin', pi.skin, 'rarity', pi.rarity, 'was_duplicate', pi.was_duplicate) order by pi.position)
      from public.pack_items pi where pi.pack_id = p.id
    ) end
  from public.packs p
  join public.group_members gm on gm.id = p.member_id
  left join public.matches m on m.id = p.match_id
  where gm.user_id = (select auth.uid())
  order by p.created_at, p.id;
$$;
revoke execute on function public.get_my_packs() from public, anon;
grant execute on function public.get_my_packs() to authenticated;
