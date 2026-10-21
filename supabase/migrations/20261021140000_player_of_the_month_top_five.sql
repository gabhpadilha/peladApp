-- Jogador do Mês, regra nova (decisão do dono do app em 2026-10-21): como no
-- Time da Semana, ganham a carta as 4 maiores notas médias do mês na linha e a
-- maior do gol (só rodadas fechadas daquele mês, pelo menos 5 notas no mês).
-- Empate na última vaga: todos os empatados entram. Continua saindo ao fechar a
-- rodada da última quinta-feira do mês. O resto da função não muda.

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
    where match_id = target_match and kind not in ('time_da_semana', 'jogador_do_mes')
    group by kind, nominee_id
  ),
  vote_winners as (
    select vote_counts.kind, vote_counts.nominee_id as member_id, vote_counts.votes, null::numeric as score
    from vote_counts
    where votes = (select max(other.votes) from vote_counts other where other.kind = vote_counts.kind)
  ),
  -- Nota de cada avaliação = média dos atributos dela (lib/ovr.ts).
  scored_evaluations as (
    select
      e.player_id as member_id,
      e.match_id,
      m.played_on,
      (coalesce(e.vel, 0) + coalesce(e.chu, 0) + coalesce(e.pas, 0) + coalesce(e.dri, 0)
        + coalesce(e.def, 0) + coalesce(e.fis, 0) + coalesce(e.ref, 0) + coalesce(e.ela, 0)
        + coalesce(e.pos, 0) + coalesce(e.sai, 0) + coalesce(e.rep, 0) + coalesce(e.pes, 0))::numeric
        / nullif(num_nonnulls(e.vel, e.chu, e.pas, e.dri, e.def, e.fis, e.ref, e.ela, e.pos, e.sai, e.rep, e.pes), 0)
        as score
    from public.evaluations e
    join public.matches m on m.id = e.match_id
    where m.group_id = target_group and m.status = 'closed'
  ),
  round_scores as (
    select member_id, count(*)::integer as ratings, avg(score) as score
    from scored_evaluations
    where match_id = target_match
    group by member_id
    having count(*) >= 3
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
  month_scores as (
    select member_id, count(*)::integer as ratings, avg(score) as score
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
  -- Mesma regra do app (lib/ovr.ts): OVR = média das notas de cada avaliação
  -- recebida em rodadas fechadas; atributo = média daquele atributo.
  cross join lateral (
    select
      avg(received.score) as ovr,
      avg(received.vel) as vel, avg(received.chu) as chu, avg(received.pas) as pas,
      avg(received.dri) as dri, avg(received.def) as def, avg(received.fis) as fis,
      avg(received.ref) as ref, avg(received.ela) as ela, avg(received.pos) as pos,
      avg(received.sai) as sai, avg(received.rep) as rep, avg(received.pes) as pes
    from (
      select
        e.*,
        (coalesce(e.vel, 0) + coalesce(e.chu, 0) + coalesce(e.pas, 0) + coalesce(e.dri, 0)
          + coalesce(e.def, 0) + coalesce(e.fis, 0) + coalesce(e.ref, 0) + coalesce(e.ela, 0)
          + coalesce(e.pos, 0) + coalesce(e.sai, 0) + coalesce(e.rep, 0) + coalesce(e.pes, 0))::numeric
          / nullif(num_nonnulls(e.vel, e.chu, e.pas, e.dri, e.def, e.fis, e.ref, e.ela, e.pos, e.sai, e.rep, e.pes), 0)
          as score
      from public.evaluations e
      join public.matches m on m.id = e.match_id
      where e.player_id = winners.member_id
        and m.group_id = target_group
        and m.status = 'closed'
    ) received
  ) snapshot
  on conflict (match_id, kind, member_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke execute on function public.compute_match_awards(uuid, text) from public, anon, authenticated;
