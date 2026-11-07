-- Pacotes de skins (design em docs/superpowers/specs/2026-11-07-pacotes-design.md, aprovado em 2026-11-07).
-- Ao fechar uma rodada, cada jogador presente ganha 1 pacote com 1 skin, SORTEADA E LACRADA no servidor na mesma transação.
-- Abrir é só revelar. A chance depende da posição na rodada (faixas A, B, C, D) e há proteção contra azar durante o mês.
-- Nasce DESLIGADO por pelada (`groups.packs_enabled`): fechar rodada continua exatamente como antes até o admin ligar.
-- As tabelas não têm acesso direto: a skin lacrada nunca pode vazar antes de abrir.

-- ---------------------------------------------------------------------------
-- Por pelada: interruptor e mínimo de presentes para a rodada gerar pacote
-- ---------------------------------------------------------------------------

alter table public.groups
  add column packs_enabled boolean not null default false,
  add column pack_min_players integer not null default 10 check (pack_min_players between 2 and 60);

comment on column public.groups.packs_enabled is 'Pacotes ligados nesta pelada. Só o painel de admin grava (o login do jogador não altera groups).';
comment on column public.groups.pack_min_players is 'Mínimo de jogadores presentes para a rodada gerar pacotes (futsal: 10 = 2 times completos; vira parâmetro do formato da pelada).';

-- A posse de skin ganha a origem (loja ou pacote).
alter table public.card_skin_purchases
  add column source text not null default 'shop' check (source in ('shop', 'pack'));

-- ---------------------------------------------------------------------------
-- Dados: conjunto do mês, chances por faixa e parâmetros (calibrados na simulação)
-- ---------------------------------------------------------------------------

create table public.pack_sets (
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  skin text not null,
  -- Design = arte-base; uma arte pode ter várias versões (skins). A garantia de fim de mês é por design.
  design text not null,
  rarity text not null check (rarity in ('comum', 'rara', 'epica', 'lendaria')),
  primary key (month, skin)
);

create table public.pack_tier_odds (
  tier text not null check (tier in ('A', 'B', 'C', 'D')),
  rarity text not null check (rarity in ('comum', 'rara', 'epica', 'lendaria')),
  weight numeric not null check (weight >= 0),
  primary key (tier, rarity)
);

create table public.pack_config (
  key text primary key,
  value numeric not null
);

create table public.pack_rarity_coins (
  rarity text primary key check (rarity in ('comum', 'rara', 'epica', 'lendaria')),
  coins integer not null check (coins >= 0)
);

insert into public.pack_tier_odds (tier, rarity, weight) values
  ('A', 'comum', 45), ('A', 'rara', 33), ('A', 'epica', 17), ('A', 'lendaria', 5),
  ('B', 'comum', 55), ('B', 'rara', 29), ('B', 'epica', 12), ('B', 'lendaria', 4),
  ('C', 'comum', 64), ('C', 'rara', 25), ('C', 'epica', 9), ('C', 'lendaria', 2),
  ('D', 'comum', 72), ('D', 'rara', 21), ('D', 'epica', 6), ('D', 'lendaria', 1);

insert into public.pack_config (key, value) values
  ('boost_max', 20),      -- multiplicador do design que ainda não saiu, no fim do mês
  ('boost_power', 2),     -- subida lenta: 1 + (M - 1) * t^p, t = dia da rodada / dias do mês
  ('forced_cap', 0.3),    -- teto de pacotes forçados por rodada (fração dos pacotes da rodada)
  ('last_days', 7),       -- janela da garantia de fim de mês
  ('bottom_share', 0.3);  -- faixa D: os 30% de baixo

insert into public.pack_rarity_coins (rarity, coins) values ('comum', 10), ('rara', 20), ('epica', 50), ('lendaria', 100);

alter table public.pack_sets enable row level security;
alter table public.pack_tier_odds enable row level security;
alter table public.pack_config enable row level security;
alter table public.pack_rarity_coins enable row level security;
revoke all on public.pack_sets, public.pack_tier_odds, public.pack_config, public.pack_rarity_coins from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pacotes lacrados
-- ---------------------------------------------------------------------------

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  month text not null,
  tier text not null check (tier in ('A', 'B', 'C', 'D')),
  rarity text not null check (rarity in ('comum', 'rara', 'epica', 'lendaria')),
  skin text not null,
  -- Chance real de cada raridade neste pacote (com a proteção contra azar), em %, gravada no sorteio.
  odds jsonb not null,
  was_forced boolean not null default false,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  was_duplicate boolean,
  coins_awarded integer not null default 0,
  unique (match_id, member_id)
);
create index packs_member_idx on public.packs (member_id);
create index packs_group_month_idx on public.packs (group_id, month);
alter table public.packs enable row level security;
revoke all on public.packs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Faixas pela posição na rodada (nota da rodada, a mesma do Melhor Jogador)
-- ---------------------------------------------------------------------------

-- Interna. A: 1º (e empatados); B: 2º e 3º; D: os 30% de baixo e quem ficou sem nota; C: o resto.
-- Para mudar o critério de desempate, é só ajustar o `order by` do rank (um lugar só).
create function public.pack_round_ranking(target_match uuid)
returns table (member_id uuid, round_rank integer, tier text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  target_date date;
  bottom_share numeric;
  present_count integer;
  bottom_count integer;
begin
  select m.group_id, m.played_on into target_group, target_date from public.matches m where m.id = target_match;
  select c.value into bottom_share from public.pack_config c where c.key = 'bottom_share';
  select count(*)::integer into present_count from public.match_attendance a where a.match_id = target_match;
  bottom_count := ceil(bottom_share * present_count)::integer;

  return query
  with scores as (
    select
      c.player_id as scored_member,
      public.round_score(
        target_date,
        avg(c.score) filter (where c.counted),
        avg(c.vel) filter (where c.counted), avg(c.chu) filter (where c.counted), avg(c.pas) filter (where c.counted),
        avg(c.dri) filter (where c.counted), avg(c.def) filter (where c.counted), avg(c.fis) filter (where c.counted),
        avg(c.ref) filter (where c.counted), avg(c.ela) filter (where c.counted), avg(c.pos) filter (where c.counted),
        avg(c.sai) filter (where c.counted), avg(c.rep) filter (where c.counted), avg(c.pes) filter (where c.counted)
      ) as score
    from public.counted_evaluations(target_group) c
    where c.match_id = target_match
    group by c.player_id
  ),
  ranked as (
    select
      a.member_id as present_member,
      s.score,
      rank() over (order by s.score desc nulls last)::integer as r
    from public.match_attendance a
    left join scores s on s.scored_member = a.member_id
    where a.match_id = target_match
  )
  select
    ranked.present_member,
    ranked.r,
    case
      when ranked.score is not null and ranked.r = 1 then 'A'
      when ranked.score is not null and ranked.r between 2 and 3 then 'B'
      when ranked.score is null or ranked.r > present_count - bottom_count then 'D'
      else 'C'
    end
  from ranked;
end;
$$;
revoke execute on function public.pack_round_ranking(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- O sorteio lacrado (chamado dentro de close_match, na mesma transação)
-- ---------------------------------------------------------------------------

create function public.draw_round_packs(target_match uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  played date;
  pack_month text;
  enabled boolean;
  min_players integer;
  present_count integer;
  day_of_month integer;
  days_in_month integer;
  t numeric;
  boost numeric;
  boost_max numeric;
  boost_power numeric;
  forced_cap numeric;
  last_days integer;
  forced_count integer := 0;
  forced_limit integer;
  created integer := 0;
  missing record;
  draw_row record;
  chosen_rarity text;
  pick_member uuid;
  pick_skin text;
  total_w numeric;
  cut numeric;
  odds_json jsonb;
begin
  select m.group_id, m.played_on into target_group, played from public.matches m where m.id = target_match;
  select g.packs_enabled, g.pack_min_players into enabled, min_players from public.groups g where g.id = target_group;
  if not coalesce(enabled, false) then return 0; end if;

  select count(*)::integer into present_count from public.match_attendance a where a.match_id = target_match;
  if present_count < min_players then return 0; end if;

  pack_month := to_char(played, 'YYYY-MM');
  if not exists (select 1 from public.pack_sets s where s.month = pack_month) then return 0; end if;
  if exists (select 1 from public.packs p where p.match_id = target_match) then return 0; end if;

  -- Duas rodadas da mesma pelada fechando juntas não podem se atropelar (a proteção lê o histórico do mês).
  perform pg_advisory_xact_lock(hashtextextended('packs:' || target_group::text, 0));

  select c.value into boost_max from public.pack_config c where c.key = 'boost_max';
  select c.value into boost_power from public.pack_config c where c.key = 'boost_power';
  select c.value into forced_cap from public.pack_config c where c.key = 'forced_cap';
  select c.value::integer into last_days from public.pack_config c where c.key = 'last_days';

  day_of_month := extract(day from played)::integer;
  days_in_month := extract(day from (date_trunc('month', played) + interval '1 month' - interval '1 day'))::integer;
  t := day_of_month::numeric / days_in_month;
  boost := 1 + (boost_max - 1) * power(t, boost_power);

  drop table if exists pg_temp.pack_draw;
  create temp table pack_draw (
    member_id uuid primary key,
    tier text not null,
    forced_skin text
  ) on commit drop;
  drop table if exists pg_temp.pack_dropped;
  create temp table pack_dropped (design text primary key) on commit drop;

  insert into pg_temp.pack_draw (member_id, tier)
  select r.member_id, r.tier from public.pack_round_ranking(target_match) r;

  -- Designs que já saíram nesta pelada neste mês.
  insert into pg_temp.pack_dropped (design)
  select distinct s.design
  from public.packs p
  join public.pack_sets s on s.month = p.month and s.skin = p.skin
  where p.group_id = target_group and p.month = pack_month;

  -- Garantia de fim de mês: nos últimos dias, cobre primeiro os designs que ainda faltam (do mais raro ao mais comum).
  if day_of_month > days_in_month - last_days then
    forced_limit := ceil(forced_cap * present_count)::integer;
    for missing in
      select s.design, max(
        case s.rarity when 'lendaria' then 4 when 'epica' then 3 when 'rara' then 2 else 1 end
      ) as rarity_rank
      from public.pack_sets s
      where s.month = pack_month and s.design not in (select d.design from pg_temp.pack_dropped d)
      group by s.design
      order by rarity_rank desc, random()
    loop
      exit when forced_count >= forced_limit;
      -- Versão sorteada dentro do design: a de maior raridade daquele design.
      select s.skin, s.rarity into pick_skin, chosen_rarity
      from public.pack_sets s
      where s.month = pack_month and s.design = missing.design
      order by case s.rarity when 'lendaria' then 4 when 'epica' then 3 when 'rara' then 2 else 1 end desc, random()
      limit 1;

      -- Em qual pacote cai: sorteio ponderado pela chance daquela raridade em cada faixa (quem foi melhor tem mais chance).
      select sum(o.weight) into total_w
      from pg_temp.pack_draw d join public.pack_tier_odds o on o.tier = d.tier and o.rarity = chosen_rarity
      where d.forced_skin is null;
      exit when total_w is null or total_w = 0;
      cut := random() * total_w;
      select x.member_id into pick_member
      from (
        select d.member_id, sum(o.weight) over (order by d.member_id) as cum
        from pg_temp.pack_draw d join public.pack_tier_odds o on o.tier = d.tier and o.rarity = chosen_rarity
        where d.forced_skin is null
      ) x
      where x.cum >= cut
      order by x.cum
      limit 1;
      exit when pick_member is null;

      update pg_temp.pack_draw set forced_skin = pick_skin where member_id = pick_member;
      insert into pg_temp.pack_dropped (design) values (missing.design) on conflict do nothing;
      forced_count := forced_count + 1;
    end loop;
  end if;

  -- Sorteio dos pacotes restantes, em ordem aleatória; cada um enxerga o que já saiu antes dele.
  for draw_row in select d.member_id, d.tier, d.forced_skin from pg_temp.pack_draw d order by random() loop
    -- Pesos por skin: chance da raridade na faixa dividida entre as skins dela; o design que ainda não saiu ganha o boost.
    select sum(w.w) into total_w from (
      select (o.weight / cnt.c) * case when pd.design is null then boost else 1 end as w
      from public.pack_sets s
      join public.pack_tier_odds o on o.tier = draw_row.tier and o.rarity = s.rarity
      join (select ps.rarity, count(*)::numeric as c from public.pack_sets ps where ps.month = pack_month group by ps.rarity) cnt on cnt.rarity = s.rarity
      left join pg_temp.pack_dropped pd on pd.design = s.design
      where s.month = pack_month
    ) w;

    select jsonb_object_agg(r.rarity, round(100 * r.sw / total_w, 1)) into odds_json from (
      select s.rarity, sum((o.weight / cnt.c) * case when pd.design is null then boost else 1 end) as sw
      from public.pack_sets s
      join public.pack_tier_odds o on o.tier = draw_row.tier and o.rarity = s.rarity
      join (select ps.rarity, count(*)::numeric as c from public.pack_sets ps where ps.month = pack_month group by ps.rarity) cnt on cnt.rarity = s.rarity
      left join pg_temp.pack_dropped pd on pd.design = s.design
      where s.month = pack_month
      group by s.rarity
    ) r;

    if draw_row.forced_skin is not null then
      pick_skin := draw_row.forced_skin;
    else
      cut := random() * total_w;
      select x.skin into pick_skin from (
        select s.skin, sum((o.weight / cnt.c) * case when pd.design is null then boost else 1 end) over (order by s.skin) as cum
        from public.pack_sets s
        join public.pack_tier_odds o on o.tier = draw_row.tier and o.rarity = s.rarity
        join (select ps.rarity, count(*)::numeric as c from public.pack_sets ps where ps.month = pack_month group by ps.rarity) cnt on cnt.rarity = s.rarity
        left join pg_temp.pack_dropped pd on pd.design = s.design
        where s.month = pack_month
      ) x
      where x.cum >= cut
      order by x.cum
      limit 1;
    end if;

    insert into public.packs (group_id, member_id, match_id, month, tier, rarity, skin, odds, was_forced)
    select target_group, draw_row.member_id, target_match, pack_month, draw_row.tier, s.rarity, s.skin, odds_json, draw_row.forced_skin is not null
    from public.pack_sets s
    where s.month = pack_month and s.skin = pick_skin;

    insert into pg_temp.pack_dropped (design)
    select s.design from public.pack_sets s where s.month = pack_month and s.skin = pick_skin
    on conflict do nothing;
    created := created + 1;
  end loop;

  return created;
end;
$$;
revoke execute on function public.draw_round_packs(uuid) from public, anon, authenticated;

-- close_match: igual ao de antes (20261023120000), e depois dos prêmios sorteia os pacotes na mesma transação.
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

  -- Envio completo = nota para todos os outros presentes.
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
    -- Código próprio: app/rodadas/_actions/close-match.ts mostra a mensagem certa.
    raise exception 'at least 5 complete submissions are needed' using errcode = 'PA005';
  end if;

  update public.matches set status = 'closed', closed_at = now() where id = target_match;
  award_count := public.compute_match_awards(target_match, theme_key);
  -- Pacotes (só em pelada com pacotes ligados, com o mínimo de presentes e conjunto do mês).
  perform public.draw_round_packs(target_match);
  return award_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leitura e abertura (o jogador só enxerga os próprios pacotes; a skin só depois de aberto)
-- ---------------------------------------------------------------------------

create function public.get_my_packs()
returns table (
  pack_id uuid,
  match_id uuid,
  round integer,
  month text,
  tier text,
  odds jsonb,
  created_at timestamptz,
  opened_at timestamptz,
  skin text,
  rarity text,
  was_duplicate boolean,
  coins_awarded integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.match_id, m.round, p.month, p.tier, p.odds, p.created_at, p.opened_at,
    case when p.opened_at is not null then p.skin end,
    case when p.opened_at is not null then p.rarity end,
    p.was_duplicate, p.coins_awarded
  from public.packs p
  join public.group_members gm on gm.id = p.member_id
  join public.matches m on m.id = p.match_id
  where gm.user_id = (select auth.uid())
  order by p.created_at, p.id;
$$;
revoke execute on function public.get_my_packs() from public, anon;
grant execute on function public.get_my_packs() to authenticated;

create function public.count_my_unopened_packs()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.packs p
  join public.group_members gm on gm.id = p.member_id
  where gm.user_id = (select auth.uid()) and p.opened_at is null and gm.deactivated_at is null;
$$;
revoke execute on function public.count_my_unopened_packs() from public, anon;
grant execute on function public.count_my_unopened_packs() to authenticated;

-- Abrir: revela a skin lacrada. Primeira vez que a skin chega ao jogador = nova (entra na coleção); depois = repetida (vira moedas).
create function public.open_pack(target_pack uuid)
returns table (skin text, rarity text, was_duplicate boolean, coins_awarded integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pack_row public.packs;
  owner_user uuid;
  is_dup boolean;
  dup_coins integer;
begin
  select p.* into pack_row from public.packs p where p.id = target_pack;
  select gm.user_id into owner_user from public.group_members gm where gm.id = pack_row.member_id and gm.deactivated_at is null;
  if pack_row.id is null or owner_user is distinct from (select auth.uid()) then
    raise exception 'not your pack' using errcode = '42501';
  end if;

  if pack_row.opened_at is not null then
    return query select pack_row.skin, pack_row.rarity, pack_row.was_duplicate, pack_row.coins_awarded;
    return;
  end if;

  select exists (
    select 1 from public.card_skin_purchases cp where cp.member_id = pack_row.member_id and cp.skin = pack_row.skin
  ) into is_dup;

  if is_dup then
    select c.coins into dup_coins from public.pack_rarity_coins c where c.rarity = pack_row.rarity;
  else
    dup_coins := 0;
    insert into public.card_skin_purchases (group_id, member_id, skin, price, source)
    values (pack_row.group_id, pack_row.member_id, pack_row.skin, 0, 'pack');
  end if;

  update public.packs set opened_at = now(), was_duplicate = is_dup, coins_awarded = dup_coins where id = pack_row.id;
  return query select pack_row.skin, pack_row.rarity, is_dup, dup_coins;
end;
$$;
revoke execute on function public.open_pack(uuid) from public, anon;
grant execute on function public.open_pack(uuid) to authenticated;
