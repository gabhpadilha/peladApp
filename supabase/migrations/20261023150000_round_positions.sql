-- Decisões do dono do app em 2026-10-23 ("Jogou no gol"):
--   * O organizador marca, na rodada aberta, quem jogou fora da posição do
--     cadastro (linha no gol ou goleiro na linha). Naquela rodada a pessoa é
--     avaliada com os atributos da posição em que jogou.
--   * Essas notas valem só para a rodada (nota da rodada, XP, moedas e prêmios),
--     nunca para o OVR nem para os atributos da carta: cada um tem uma carta só.
--   * Prêmios pela posição da rodada: Melhor Goleiro e a vaga do gol no Time da
--     Semana para quem jogou no gol; prêmios de atributo e Bola Murcha só para quem
--     jogou na linha; Melhor Jogador para todos (linha ou gol), pela maior nota.

-- ---------------------------------------------------------------------------
-- Posição na rodada
-- ---------------------------------------------------------------------------

-- `null` = a posição do cadastro; `true` = linha que jogou no gol; `false` =
-- goleiro que jogou na linha. Só `set_round_position` grava (e normaliza).
alter table public.match_attendance add column plays_in_goal boolean;

-- Troca a posição de um presente na rodada aberta (só organizador). Notas que ele
-- já recebeu no tipo errado saem: quem deu volta a ter a nota dele pendente.
-- Devolve quantas notas saíram.
create function public.set_round_position(target_match uuid, target_member uuid, in_goal boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
  registered_goalkeeper boolean;
  removed_count integer;
begin
  select group_id, status into target_group, current_status from public.matches where id = target_match;
  if target_group is null or not public.is_group_organizer(target_group) then
    raise exception 'only organizers can change round positions' using errcode = '42501';
  end if;
  if current_status <> 'open' then
    raise exception 'round is not open';
  end if;

  select member.position = 'GOL' into registered_goalkeeper
  from public.match_attendance attendance
  join public.group_members member on member.id = attendance.member_id
  where attendance.match_id = target_match and attendance.member_id = target_member;
  if registered_goalkeeper is null then
    raise exception 'player was not in this round';
  end if;

  update public.match_attendance
  set plays_in_goal = case when in_goal = registered_goalkeeper then null else in_goal end
  where match_id = target_match and member_id = target_member;

  delete from public.evaluations e
  where e.match_id = target_match
    and e.player_id = target_member
    and case
      when in_goal then num_nonnulls(e.vel, e.chu, e.pas, e.dri, e.def, e.fis) > 0
      else num_nonnulls(e.ref, e.ela, e.pos, e.sai, e.rep, e.pes) > 0
    end;
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

revoke execute on function public.set_round_position(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_round_position(uuid, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Base do cálculo: agora diz também quais notas foram fora da posição
-- ---------------------------------------------------------------------------

drop function public.get_group_scores(uuid);
drop function public.counted_evaluations(uuid);

-- `off_position` = o jogador jogou fora da posição do cadastro naquela rodada:
-- a nota entra na nota da rodada e nos prêmios, mas não no OVR.
create function public.counted_evaluations(target_group uuid)
returns table (
  evaluation_id uuid,
  match_id uuid,
  player_id uuid,
  played_on date,
  vel smallint, chu smallint, pas smallint, dri smallint, def smallint, fis smallint,
  ref smallint, ela smallint, pos smallint, sai smallint, rep smallint, pes smallint,
  score numeric,
  received integer,
  counted boolean,
  off_position boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with scored as (
    select
      e.id, e.match_id, e.player_id, m.played_on,
      e.vel, e.chu, e.pas, e.dri, e.def, e.fis,
      e.ref, e.ela, e.pos, e.sai, e.rep, e.pes,
      -- Nota de cada avaliação = média dos atributos dela (lib/ovr.ts).
      (coalesce(e.vel, 0) + coalesce(e.chu, 0) + coalesce(e.pas, 0) + coalesce(e.dri, 0)
        + coalesce(e.def, 0) + coalesce(e.fis, 0) + coalesce(e.ref, 0) + coalesce(e.ela, 0)
        + coalesce(e.pos, 0) + coalesce(e.sai, 0) + coalesce(e.rep, 0) + coalesce(e.pes, 0))::numeric
        / nullif(num_nonnulls(e.vel, e.chu, e.pas, e.dri, e.def, e.fis, e.ref, e.ela, e.pos, e.sai, e.rep, e.pes), 0)
        as score,
      attendance.plays_in_goal is not null as off_position
    from public.evaluations e
    join public.matches m on m.id = e.match_id
    join public.match_attendance attendance on attendance.match_id = e.match_id and attendance.member_id = e.player_id
    where m.group_id = target_group
      and m.status = 'closed'
  ),
  ranked as (
    select
      scored.*,
      count(*) over (partition by scored.match_id, scored.player_id) as received,
      row_number() over (partition by scored.match_id, scored.player_id order by scored.score desc, scored.id) as from_top,
      row_number() over (partition by scored.match_id, scored.player_id order by scored.score asc, scored.id desc) as from_bottom
    from scored
  )
  select
    id, match_id, player_id, played_on,
    vel, chu, pas, dri, def, fis,
    ref, ela, pos, sai, rep, pes,
    score,
    received::integer,
    received < 4 or (from_top > 1 and from_bottom > 1),
    off_position
  from ranked;
$$;

revoke execute on function public.counted_evaluations(uuid) from public, anon, authenticated;

-- Notas que contam (média aparada), sem o avaliador (anonimato), com a marca de
-- fora da posição. Base do OVR (sem as de fora) e da nota da rodada (todas) no app.
create function public.get_group_scores(target_group uuid)
returns table (
  evaluation_id uuid,
  match_id uuid,
  player_id uuid,
  vel smallint, chu smallint, pas smallint, dri smallint, def smallint, fis smallint,
  ref smallint, ela smallint, pos smallint, sai smallint, rep smallint, pes smallint,
  off_position boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.evaluation_id, c.match_id, c.player_id,
    c.vel, c.chu, c.pas, c.dri, c.def, c.fis,
    c.ref, c.ela, c.pos, c.sai, c.rep, c.pes,
    c.off_position
  from public.counted_evaluations(target_group) c
  where c.counted
    and public.is_group_member(target_group);
$$;

revoke execute on function public.get_group_scores(uuid) from public, anon;
grant execute on function public.get_group_scores(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Distribuição das cartas pela posição da rodada
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
  scored_evaluations as (
    select c.player_id as member_id, c.match_id, c.played_on, c.vel, c.chu, c.pas, c.dri, c.def, c.fis,
      c.score, c.counted, c.off_position
    from public.counted_evaluations(target_group) c
  ),
  round_scores as (
    select
      member_id,
      count(*)::integer as ratings,
      avg(score) filter (where counted) as score,
      avg(vel) filter (where counted) as vel,
      avg(chu) filter (where counted) as chu,
      avg(pas) filter (where counted) as pas,
      avg(dri) filter (where counted) as dri,
      avg(def) filter (where counted) as def,
      avg(fis) filter (where counted) as fis
    from scored_evaluations
    where match_id = target_match
    group by member_id
    having count(*) >= 3
  ),
  -- Goleiro ou linha pela posição em que jogou NESTA rodada.
  ranked as (
    select
      round_scores.*,
      coalesce(attendance.plays_in_goal, member.position = 'GOL') as is_goalkeeper,
      rank() over (
        partition by coalesce(attendance.plays_in_goal, member.position = 'GOL')
        order by round_scores.score desc
      ) as place
    from round_scores
    join public.group_members member on member.id = round_scores.member_id
    join public.match_attendance attendance on attendance.match_id = target_match and attendance.member_id = round_scores.member_id
  ),
  team_of_the_week as (
    select 'time_da_semana'::public.award_kind as kind, member_id, ratings as votes, round(score, 2) as score
    from ranked
    where (is_goalkeeper and place = 1) or (not is_goalkeeper and place <= 4)
  ),
  -- Quem concorre a cada prêmio das notas e com qual média (arredondada, para o
  -- empate valer o que aparece na carta). Melhor Jogador: todos.
  stat_candidates as (
    select 'craque'::public.award_kind as kind, member_id, ratings, round(score, 2) as value
    from ranked
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
  -- Time do Mês: como o OVR, só notas na posição do cadastro.
  month_scores as (
    select member_id, count(*)::integer as ratings, avg(score) filter (where counted) as score
    from scored_evaluations
    where is_last_thursday
      and not off_position
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
    card.position,
    public.award_card_value(card.ovr, bonus.value),
    case
      when card.position = 'GOL' then jsonb_build_object(
        'ref', public.award_card_value(card.ref, bonus.value),
        'ela', public.award_card_value(card.ela, bonus.value),
        'pos', public.award_card_value(card.pos, bonus.value),
        'sai', public.award_card_value(card.sai, bonus.value),
        'rep', public.award_card_value(card.rep, bonus.value),
        'pes', public.award_card_value(card.pes, bonus.value)
      )
      else jsonb_build_object(
        'vel', public.award_card_value(card.vel, bonus.value),
        'chu', public.award_card_value(card.chu, bonus.value),
        'pas', public.award_card_value(card.pas, bonus.value),
        'dri', public.award_card_value(card.dri, bonus.value),
        'def', public.award_card_value(card.def, bonus.value),
        'fis', public.award_card_value(card.fis, bonus.value)
      )
    end
  from winners
  join public.group_members member on member.id = winners.member_id
  -- Quem ganhou o Time do Mês pode não ter jogado esta rodada.
  left join lateral (
    select attendance.plays_in_goal
    from public.match_attendance attendance
    where attendance.match_id = target_match and attendance.member_id = winners.member_id
  ) round_slot on true
  cross join lateral (
    select case when winners.kind in ('bola_murcha', 'fair_play', 'fominha') then 0 else 1 end as value
  ) bonus
  -- Carta de sempre: OVR = média das notas que contam em rodadas fechadas, na
  -- posição do cadastro (lib/ovr.ts sobre get_group_scores); atributo = média dele.
  cross join lateral (
    select
      avg(received.score) as ovr,
      avg(received.vel) as vel, avg(received.chu) as chu, avg(received.pas) as pas,
      avg(received.dri) as dri, avg(received.def) as def, avg(received.fis) as fis,
      avg(received.ref) as ref, avg(received.ela) as ela, avg(received.pos) as pos,
      avg(received.sai) as sai, avg(received.rep) as rep, avg(received.pes) as pes
    from public.counted_evaluations(target_group) received
    where received.player_id = winners.member_id
      and received.counted
      and not received.off_position
  ) snapshot
  -- Carta da rodada, para quem jogou fora da posição: só as notas desta rodada.
  -- Atributo sem nota daquele tipo (rodada corrigida depois) usa a nota da rodada.
  cross join lateral (
    select
      avg(received.score) as ovr,
      avg(received.vel) as vel, avg(received.chu) as chu, avg(received.pas) as pas,
      avg(received.dri) as dri, avg(received.def) as def, avg(received.fis) as fis,
      avg(received.ref) as ref, avg(received.ela) as ela, avg(received.pos) as pos,
      avg(received.sai) as sai, avg(received.rep) as rep, avg(received.pes) as pes
    from public.counted_evaluations(target_group) received
    where received.player_id = winners.member_id
      and received.match_id = target_match
      and received.counted
  ) round_snapshot
  cross join lateral (
    select
      case
        when not flag.is_round_card then member.position
        when round_slot.plays_in_goal then 'GOL'::public.player_position
        else 'FIX'::public.player_position
      end as position,
      case when flag.is_round_card then round_snapshot.ovr else snapshot.ovr end as ovr,
      case when flag.is_round_card then coalesce(round_snapshot.vel, round_snapshot.ovr) else snapshot.vel end as vel,
      case when flag.is_round_card then coalesce(round_snapshot.chu, round_snapshot.ovr) else snapshot.chu end as chu,
      case when flag.is_round_card then coalesce(round_snapshot.pas, round_snapshot.ovr) else snapshot.pas end as pas,
      case when flag.is_round_card then coalesce(round_snapshot.dri, round_snapshot.ovr) else snapshot.dri end as dri,
      case when flag.is_round_card then coalesce(round_snapshot.def, round_snapshot.ovr) else snapshot.def end as def,
      case when flag.is_round_card then coalesce(round_snapshot.fis, round_snapshot.ovr) else snapshot.fis end as fis,
      case when flag.is_round_card then coalesce(round_snapshot.ref, round_snapshot.ovr) else snapshot.ref end as ref,
      case when flag.is_round_card then coalesce(round_snapshot.ela, round_snapshot.ovr) else snapshot.ela end as ela,
      case when flag.is_round_card then coalesce(round_snapshot.pos, round_snapshot.ovr) else snapshot.pos end as pos,
      case when flag.is_round_card then coalesce(round_snapshot.sai, round_snapshot.ovr) else snapshot.sai end as sai,
      case when flag.is_round_card then coalesce(round_snapshot.rep, round_snapshot.ovr) else snapshot.rep end as rep,
      case when flag.is_round_card then coalesce(round_snapshot.pes, round_snapshot.ovr) else snapshot.pes end as pes
    from (
      select round_slot.plays_in_goal is not null and winners.kind <> 'jogador_do_mes' as is_round_card
    ) flag
  ) card
  on conflict (match_id, kind, member_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke execute on function public.compute_match_awards(uuid, text) from public, anon, authenticated;
