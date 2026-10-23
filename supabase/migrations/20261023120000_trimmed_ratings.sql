-- Decisões do dono do app em 2026-10-23, para tirar a "marcação" e a "panela":
--   * Em cada rodada, a maior e a menor nota que um jogador recebeu saem da conta
--     (com 3 notas ou mais). O OVR, os atributos, as cartas e o XP usam só as que
--     ficaram no meio. A nota de uma avaliação continua sendo a média dos atributos
--     dela; a avaliação que sai, sai inteira.
--   * Só dá para fechar a rodada com pelo menos 5 pessoas que avaliaram todos os
--     outros presentes (ou todos os presentes, se a rodada tiver menos de 6).

-- ---------------------------------------------------------------------------
-- Notas que contam
-- ---------------------------------------------------------------------------

-- Avaliações das rodadas fechadas da pelada com a nota (média dos atributos), quantas
-- notas o jogador recebeu na rodada e se esta conta. Empate na maior ou na menor:
-- sai uma só (desempate pelo id, para ser sempre a mesma). Uso interno.
create function public.counted_evaluations(target_group uuid)
returns table (
  id uuid,
  match_id uuid,
  player_id uuid,
  played_on date,
  vel smallint, chu smallint, pas smallint, dri smallint, def smallint, fis smallint,
  ref smallint, ela smallint, pos smallint, sai smallint, rep smallint, pes smallint,
  score numeric,
  ratings integer,
  counted boolean
)
language sql
stable
set search_path = ''
as $$
  with scored as (
    select
      e.id, e.match_id, e.player_id, m.played_on,
      e.vel, e.chu, e.pas, e.dri, e.def, e.fis,
      e.ref, e.ela, e.pos, e.sai, e.rep, e.pes,
      (coalesce(e.vel, 0) + coalesce(e.chu, 0) + coalesce(e.pas, 0) + coalesce(e.dri, 0)
        + coalesce(e.def, 0) + coalesce(e.fis, 0) + coalesce(e.ref, 0) + coalesce(e.ela, 0)
        + coalesce(e.pos, 0) + coalesce(e.sai, 0) + coalesce(e.rep, 0) + coalesce(e.pes, 0))::numeric
        / nullif(num_nonnulls(e.vel, e.chu, e.pas, e.dri, e.def, e.fis, e.ref, e.ela, e.pos, e.sai, e.rep, e.pes), 0)
        as score
    from public.evaluations e
    join public.matches m on m.id = e.match_id
    where m.group_id = target_group and m.status = 'closed'
  ),
  ranked as (
    select
      scored.*,
      count(*) over received as ratings,
      row_number() over (partition by match_id, player_id order by score, id) as low_place,
      row_number() over (partition by match_id, player_id order by score desc, id desc) as high_place
    from scored
    window received as (partition by match_id, player_id)
  )
  select
    id, match_id, player_id, played_on,
    vel, chu, pas, dri, def, fis,
    ref, ela, pos, sai, rep, pes,
    score,
    ratings::integer,
    ratings < 3 or (low_place > 1 and high_place > 1) as counted
  from ranked;
$$;

revoke execute on function public.counted_evaluations(uuid) from public, anon, authenticated;

-- O app (lib/ovr.ts) recebe só as notas que contam: o corte vale igual no app e nas cartas.
create or replace function public.get_group_scores(target_group uuid)
returns table (
  evaluation_id uuid,
  match_id uuid,
  player_id uuid,
  vel smallint, chu smallint, pas smallint, dri smallint, def smallint, fis smallint,
  ref smallint, ela smallint, pos smallint, sai smallint, rep smallint, pes smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, c.match_id, c.player_id,
    c.vel, c.chu, c.pas, c.dri, c.def, c.fis,
    c.ref, c.ela, c.pos, c.sai, c.rep, c.pes
  from public.counted_evaluations(target_group) c
  where c.counted
    and public.is_group_member(target_group);
$$;

-- ---------------------------------------------------------------------------
-- Envios: quantos enviaram e quantos avaliaram todo mundo
-- ---------------------------------------------------------------------------

-- O tipo de retorno muda (coluna nova), então a função é recriada.
drop function public.get_match_submissions(uuid);

create function public.get_match_submissions(target_group uuid)
returns table (match_id uuid, submitted bigint, complete bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with per_evaluator as (
    select e.match_id, e.evaluator_id, count(*) as rated
    from public.evaluations e
    join public.matches m on m.id = e.match_id
    where m.group_id = target_group
      and public.is_group_member(target_group)
    group by e.match_id, e.evaluator_id
  )
  select
    per_evaluator.match_id,
    count(*),
    count(*) filter (where per_evaluator.rated >= present.total - 1)
  from per_evaluator
  cross join lateral (
    select count(*) as total from public.match_attendance a where a.match_id = per_evaluator.match_id
  ) present
  group by per_evaluator.match_id;
$$;

revoke execute on function public.get_match_submissions(uuid) from public, anon;
grant execute on function public.get_match_submissions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Fechar a rodada: mínimo de quem avaliou todo mundo
-- ---------------------------------------------------------------------------

create or replace function public.close_match(target_match uuid, theme_key text default 'default')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
  present_count integer;
  complete_count integer;
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

  -- Mesmo número do app (MIN_COMPLETE_RATERS em lib/round-closing.ts).
  select count(*) into present_count from public.match_attendance where match_id = target_match;
  select count(*) into complete_count
  from (
    select evaluator_id
    from public.evaluations
    where match_id = target_match
    group by evaluator_id
    having count(*) >= present_count - 1
  ) complete;
  if complete_count < least(5, present_count) then
    raise exception 'not enough complete raters' using errcode = 'P0001', hint = 'min_complete_raters';
  end if;

  update public.matches set status = 'closed', closed_at = now() where id = target_match;
  return public.compute_match_awards(target_match, theme_key);
end;
$$;

revoke execute on function public.close_match(uuid, text) from public, anon;
grant execute on function public.close_match(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cartas: as médias usam só as notas que contam
-- ---------------------------------------------------------------------------

create or replace function public.compute_match_awards(target_match uuid, theme_key text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  target_date date;
  is_last_thursday boolean;
  inserted_count integer;
begin
  select group_id, played_on into target_group, target_date from public.matches where id = target_match;
  -- Quinta-feira e, uma semana depois, já é outro mês.
  is_last_thursday := extract(isodow from target_date) = 4
    and date_trunc('month', target_date + 7) <> date_trunc('month', target_date);

  with vote_counts as (
    select kind, nominee_id, count(*)::integer as votes
    from public.round_votes
    where match_id = target_match and kind = 'gol'
    group by kind, nominee_id
  ),
  vote_winners as (
    select vote_counts.kind, vote_counts.nominee_id as member_id, vote_counts.votes, null::numeric as score
    from vote_counts
    where votes = (select max(other.votes) from vote_counts other where other.kind = vote_counts.kind)
  ),
  -- Notas das rodadas fechadas com a marca de quais contam (sem a maior e a menor).
  scored_evaluations as (
    select
      source.player_id as member_id,
      source.match_id,
      source.played_on,
      source.vel,
      source.chu,
      source.pas,
      source.dri,
      source.def,
      source.fis,
      source.score,
      source.ratings,
      source.counted
    from public.counted_evaluations(target_group) source
  ),
  -- Mínimo de notas pelo que a pessoa recebeu; a média só com as que contam.
  round_scores as (
    select
      member_id,
      max(ratings) as ratings,
      avg(score) as score,
      avg(vel) as vel,
      avg(chu) as chu,
      avg(pas) as pas,
      avg(dri) as dri,
      avg(def) as def,
      avg(fis) as fis
    from scored_evaluations
    where match_id = target_match and counted
    group by member_id
    having max(ratings) >= 3
  ),
  ranked as (
    select
      round_scores.*,
      member.position = 'GOL' as is_goalkeeper,
      rank() over (partition by member.position = 'GOL' order by round_scores.score desc) as place
    from round_scores
    join public.group_members member on member.id = round_scores.member_id
  ),
  team_of_the_week as (
    select 'time_da_semana'::public.award_kind as kind, member_id, ratings as votes, round(score, 2) as score
    from ranked
    where (is_goalkeeper and place = 1) or (not is_goalkeeper and place <= 4)
  ),
  -- Quem concorre a cada prêmio das notas e com qual média (arredondada, para o
  -- empate valer o que aparece na carta).
  stat_candidates as (
    select 'craque'::public.award_kind as kind, member_id, ratings, round(score, 2) as value
    from ranked where not is_goalkeeper
    union all
    select 'goleiro', member_id, ratings, round(score, 2) from ranked where is_goalkeeper
    union all
    select 'drible', member_id, ratings, round(dri, 2) from ranked where not is_goalkeeper
    union all
    select 'atacante', member_id, ratings, round(chu, 2) from ranked where not is_goalkeeper
    union all
    select 'defensor', member_id, ratings, round(def, 2) from ranked where not is_goalkeeper
    union all
    select 'foguete', member_id, ratings, round(vel, 2) from ranked where not is_goalkeeper
    union all
    select 'garcom', member_id, ratings, round(pas, 2) from ranked where not is_goalkeeper
    union all
    select 'motor', member_id, ratings, round(fis, 2) from ranked where not is_goalkeeper
  ),
  stat_winners as (
    select candidate.kind, candidate.member_id, candidate.ratings as votes, candidate.value as score
    from stat_candidates candidate
    where candidate.value is not null
      and candidate.value = (select max(other.value) from stat_candidates other where other.kind = candidate.kind)
    union all
    -- Bola Murcha: a menor nota média da rodada na linha.
    select 'bola_murcha'::public.award_kind, member_id, ratings, round(score, 2)
    from ranked
    where not is_goalkeeper
      and round(score, 2) = (select min(round(other.score, 2)) from ranked other where not other.is_goalkeeper)
  ),
  month_scores as (
    select member_id, count(*)::integer as ratings, avg(score) filter (where counted) as score
    from scored_evaluations
    where is_last_thursday
      and date_trunc('month', played_on) = date_trunc('month', target_date)
    group by member_id
    having count(*) >= 5
  ),
  month_ranked as (
    select
      month_scores.*,
      member.position = 'GOL' as is_goalkeeper,
      rank() over (partition by member.position = 'GOL' order by month_scores.score desc) as place
    from month_scores
    join public.group_members member on member.id = month_scores.member_id
  ),
  player_of_the_month as (
    select 'jogador_do_mes'::public.award_kind as kind, member_id, ratings as votes, round(score, 2) as score
    from month_ranked
    where (is_goalkeeper and place = 1) or (not is_goalkeeper and place <= 4)
  ),
  winners as (
    select * from vote_winners
    union all
    select * from team_of_the_week
    union all
    select * from stat_winners
    union all
    select * from player_of_the_month
  )
  insert into public.awards (group_id, match_id, member_id, kind, theme, votes, score, position, ovr, attributes)
  select
    target_group,
    target_match,
    winners.member_id,
    winners.kind,
    theme_key,
    winners.votes,
    winners.score,
    member.position,
    public.award_card_value(snapshot.ovr, bonus.value),
    case
      when member.position = 'GOL' then jsonb_build_object(
        'ref', public.award_card_value(snapshot.ref, bonus.value),
        'ela', public.award_card_value(snapshot.ela, bonus.value),
        'pos', public.award_card_value(snapshot.pos, bonus.value),
        'sai', public.award_card_value(snapshot.sai, bonus.value),
        'rep', public.award_card_value(snapshot.rep, bonus.value),
        'pes', public.award_card_value(snapshot.pes, bonus.value)
      )
      else jsonb_build_object(
        'vel', public.award_card_value(snapshot.vel, bonus.value),
        'chu', public.award_card_value(snapshot.chu, bonus.value),
        'pas', public.award_card_value(snapshot.pas, bonus.value),
        'dri', public.award_card_value(snapshot.dri, bonus.value),
        'def', public.award_card_value(snapshot.def, bonus.value),
        'fis', public.award_card_value(snapshot.fis, bonus.value)
      )
    end
  from winners
  join public.group_members member on member.id = winners.member_id
  cross join lateral (
    select case when winners.kind in ('bola_murcha', 'fair_play', 'fominha') then 0 else 1 end as value
  ) bonus
  -- Mesma regra do app (get_group_scores → lib/ovr.ts): OVR = média das notas que
  -- contam (sem a maior e a menor de cada rodada); atributo = média daquele atributo.
  cross join lateral (
    select
      avg(received.score) as ovr,
      avg(received.vel) as vel, avg(received.chu) as chu, avg(received.pas) as pas,
      avg(received.dri) as dri, avg(received.def) as def, avg(received.fis) as fis,
      avg(received.ref) as ref, avg(received.ela) as ela, avg(received.pos) as pos,
      avg(received.sai) as sai, avg(received.rep) as rep, avg(received.pes) as pes
    from public.counted_evaluations(target_group) received
    where received.player_id = winners.member_id and received.counted
  ) snapshot
  on conflict (match_id, kind, member_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke execute on function public.compute_match_awards(uuid, text) from public, anon, authenticated;
