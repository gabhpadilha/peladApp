-- Decisões do dono do app em 2026-10-21:
--   * Um prêmio para cada atributo da linha: além de Drible (DRI), Atacante (CHU)
--     e Defensor (DEF), agora Foguete (VEL), Garçom (PAS) e Motor (FIS), pela
--     maior média do atributo recebida na rodada.
--   * Bola Murcha sai das notas: a MENOR nota média da rodada na linha.
--   * Fominha saiu do jogo (o valor continua no enum, ninguém ganha mais).
--   * Por voto fica só o Gol da Rodada.
--   Todos os prêmios das notas: só linha (menos o Goleiro), pelo menos 3 notas na
--   rodada, empate leva todos.

-- ---------------------------------------------------------------------------
-- Voto só no Gol da Rodada
-- ---------------------------------------------------------------------------

create or replace function public.guard_round_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'gol' then
    raise exception 'this award is not voted' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_round_vote() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Distribuição das cartas
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
  -- Nota de cada avaliação = média dos atributos dela (lib/ovr.ts).
  scored_evaluations as (
    select
      e.player_id as member_id,
      e.match_id,
      m.played_on,
      e.vel,
      e.chu,
      e.pas,
      e.dri,
      e.def,
      e.fis,
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
    select
      member_id,
      count(*)::integer as ratings,
      avg(score) as score,
      avg(vel) as vel,
      avg(chu) as chu,
      avg(pas) as pas,
      avg(dri) as dri,
      avg(def) as def,
      avg(fis) as fis
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
