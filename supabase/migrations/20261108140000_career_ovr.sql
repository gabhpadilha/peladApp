-- Carreira (decisão do dono do app em 2026-11-08): o OVR do jogador é a média dos OVRs das rodadas e cada atributo a
-- média dele nas rodadas (sem tirar nenhuma; em cada rodada já saem a maior e a menor nota), e cada gol confirmado soma 1 ponto no
-- Ataque (VEL e CHU, teto de 10, sem goleiro). Aqui, a carta congelada dos prêmios (`compute_match_awards`); o resto igual a 20261108130000.
-- Espelha `computeCareerCard` em lib/ovr.ts. A carta da rodada (fora da posição) não muda.

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
      c.ref, c.ela, c.pos, c.sai, c.rep, c.pes,
      c.score, c.counted, c.off_position
    from public.counted_evaluations(target_group) c
  ),
  -- Desempate: OVR geral e média de todas as notas (nulos antes de 2026-11-08, o que mantém o empate).
  overall as (
    select
      member_id,
      case when target_date >= date '2026-11-08' then
        public.round_score(
          date '2026-11-02', avg(score) filter (where counted and not off_position),
          avg(vel) filter (where counted and not off_position), avg(chu) filter (where counted and not off_position),
          avg(pas) filter (where counted and not off_position), avg(dri) filter (where counted and not off_position),
          avg(def) filter (where counted and not off_position), avg(fis) filter (where counted and not off_position),
          avg(ref) filter (where counted and not off_position), avg(ela) filter (where counted and not off_position),
          avg(pos) filter (where counted and not off_position), avg(sai) filter (where counted and not off_position),
          avg(rep) filter (where counted and not off_position), avg(pes) filter (where counted and not off_position)
        ) end as general_ovr,
      case when target_date >= date '2026-11-08' then avg(score) filter (where counted and not off_position) end as general_mean
    from scored_evaluations
    group by member_id
  ),
  round_scores as (
    select
      member_id,
      count(*)::integer as ratings,
      -- Nota da rodada: a média dos 6 atributos até 2026-11-01 e, daí em diante, o OVR da rodada (`round_score`).
      public.round_score(
        target_date,
        avg(score) filter (where counted),
        avg(vel) filter (where counted), avg(chu) filter (where counted), avg(pas) filter (where counted),
        avg(dri) filter (where counted), avg(def) filter (where counted), avg(fis) filter (where counted),
        avg(ref) filter (where counted), avg(ela) filter (where counted), avg(pos) filter (where counted),
        avg(sai) filter (where counted), avg(rep) filter (where counted), avg(pes) filter (where counted)
      ) as score,
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
  -- Quem concorre a cada prêmio das notas e com qual média (arredondada, para o
  -- empate valer o que aparece na carta). Melhor Jogador: todos.
  stat_candidates as (
    select 'craque'::public.award_kind as kind, member_id, ratings, round(score, 2) as value
    from ranked
    union all
    select 'goleiro', member_id, ratings, round(score, 2) from ranked where is_goalkeeper
    union all
    -- As 3 estatísticas da carta (lib/card-stats.ts): média de cada par de atributos.
    select 'atacante', member_id, ratings, round((vel + chu) / 2, 2) from ranked where not is_goalkeeper
    union all
    select 'criativo', member_id, ratings, round((pas + dri) / 2, 2) from ranked where not is_goalkeeper
    union all
    select 'defensor', member_id, ratings, round((def + fis) / 2, 2) from ranked where not is_goalkeeper
  ),
  stat_winners as (
    select t.kind, t.member_id, t.ratings as votes, t.value as score
    from (
      select candidate.kind, candidate.member_id, candidate.ratings, candidate.value,
        rank() over (
          partition by candidate.kind
          order by candidate.value desc, o.general_ovr desc nulls last, o.general_mean desc nulls last
        ) as place
      from stat_candidates candidate
      left join overall o on o.member_id = candidate.member_id
      where candidate.value is not null
    ) t
    where t.place = 1
    union all
    -- Bola Murcha: a menor nota média da rodada na linha (desempate inverso: menor OVR, depois menor média).
    select 'bola_murcha'::public.award_kind, t.member_id, t.ratings, t.value
    from (
      select r.member_id, r.ratings, round(r.score, 2) as value,
        rank() over (
          order by round(r.score, 2) asc, o.general_ovr asc nulls last, o.general_mean asc nulls last
        ) as place
      from ranked r
      left join overall o on o.member_id = r.member_id
      where not r.is_goalkeeper
    ) t
    where t.place = 1
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
    -- Até 2026-11-01: 4 maiores médias do mês na linha e a maior do gol (o de outubro).
    where target_date < date '2026-11-02'
      and ((is_goalkeeper and place = 1) or (not is_goalkeeper and place <= 4))
  ),
  -- Goleador da Rodada: mais gols confirmados (3 "sim" ou mais), mínimo 1; empate leva todos.
  confirmed_goals as (
    select goal.member_id, goal.goals::integer as goals
    from public.match_goals goal
    where goal.match_id = target_match
      and goal.goals > 0
      and (
        select count(*) from public.match_goal_confirmations confirmation
        where confirmation.match_id = goal.match_id
          and confirmation.member_id = goal.member_id
          and confirmation.confirmed
      ) >= 3
  ),
  goal_winners as (
    select 'goleador'::public.award_kind as kind, t.member_id, t.goals as votes, null::numeric as score
    from (
      select g.member_id, g.goals,
        rank() over (order by g.goals desc, o.general_ovr desc nulls last, o.general_mean desc nulls last) as place
      from confirmed_goals g
      left join overall o on o.member_id = g.member_id
    ) t
    where t.place = 1
  ),
  -- Campeão do Mês (2026-11-02): na rodada da última quinta, quem terminou o mês em primeiro no ranking
  -- de pontos; empate no primeiro lugar leva todos. Espelha `lib/ranking-points.ts`: por rodada fechada do
  -- mês em que esteve presente, nota da rodada x 10 (arredondada, teto 99) + 40 no Melhor Jogador, 20 em cada
  -- outro prêmio individual (Time do Mês, Time da Semana, Bola Murcha e Fominha não somam) + 10 por gol
  -- confirmado. Só jogadores ativos. Os prêmios desta rodada ainda não estão na tabela: vêm dos CTEs acima.
  month_matches as (
    select m.id as match_id
    from public.matches m
    where is_last_thursday
      and m.group_id = target_group
      and m.status = 'closed'
      and date_trunc('month', m.played_on) = date_trunc('month', target_date)
  ),
  base_winners as (
    select kind, member_id from vote_winners
    union all
    select kind, member_id from goal_winners
    union all
    select kind, member_id from stat_winners where kind <> 'bola_murcha'
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
  ),
  month_points as (
    select
      attendance.member_id,
      sum(
        coalesce(scores.base, 0)
        + case
            when attendance.match_id = target_match then (
              select coalesce(sum(case when w.kind = 'craque' then 40 else 20 end), 0)
              from base_winners w where w.member_id = attendance.member_id
            )
            else (
              select coalesce(sum(case when a.kind = 'craque' then 40 else 20 end), 0)
              from public.awards a
              where a.match_id = attendance.match_id and a.member_id = attendance.member_id
                and a.kind not in ('bola_murcha', 'fominha', 'jogador_do_mes', 'campeao_do_mes', 'time_da_semana')
            )
          end
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
    group by attendance.member_id
  ),
  -- Time do Mês a partir de 2026-11-02 (decisão do dono do app): os 5 primeiros do ranking de pontos do mês, linha e
  -- gol juntos; empate na última vaga leva todos. `votes` = os pontos do mês e `score` nulo.
  month_team as (
    select 'jogador_do_mes'::public.award_kind as kind, ranked_points.member_id, ranked_points.points as votes, null::numeric as score
    from (
      select month_points.member_id, month_points.points, rank() over (order by month_points.points desc) as place
      from month_points
    ) ranked_points
    where target_date >= date '2026-11-02' and ranked_points.points > 0 and ranked_points.place <= 5
  ),
  month_champions as (
    select 'campeao_do_mes'::public.award_kind as kind, member_id, points as votes, null::numeric as score
    from month_points
    where points > 0 and points = (select max(other.points) from month_points other)
  ),
  winners as (
    select * from vote_winners
    union all
    select * from goal_winners
    union all
    select * from stat_winners
    union all
    select * from player_of_the_month
    union all
    select * from month_team
    union all
    select * from month_champions
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
    case
      when card.position = 'GOL' then public.card_ovr(
        public.award_card_value(card.ref, bonus.value), public.award_card_value(card.ela, bonus.value),
        public.award_card_value(card.pos, bonus.value), public.award_card_value(card.sai, bonus.value),
        public.award_card_value(card.rep, bonus.value), public.award_card_value(card.pes, bonus.value)
      )
      else public.card_ovr(
        public.award_card_value(card.vel, bonus.value), public.award_card_value(card.chu, bonus.value),
        public.award_card_value(card.pas, bonus.value), public.award_card_value(card.dri, bonus.value),
        public.award_card_value(card.def, bonus.value), public.award_card_value(card.fis, bonus.value)
      )
    end,
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
  -- Carta de sempre (regra de 2026-11-08, espelha `computeCareerCard` em lib/ovr.ts): atributo = média das médias
  -- dele em cada rodada fechada (notas que contam, na posição do cadastro), + 1 ponto de Ataque (VEL e CHU) por gol
  -- confirmado, teto de 10, sem goleiro; o OVR sai deles (`card_ovr`).
  cross join lateral (
    select
      coalesce(sum(goal.goals), 0)::integer as total
    from public.match_goals goal
    join public.matches goal_match on goal_match.id = goal.match_id and goal_match.status = 'closed' and goal_match.group_id = target_group
    where goal.member_id = winners.member_id
      and goal.goals > 0
      and (
        select count(*) from public.match_goal_confirmations confirmation
        where confirmation.match_id = goal.match_id and confirmation.member_id = goal.member_id and confirmation.confirmed
      ) >= 3
  ) goal_total
  cross join lateral (
    select
      avg(per_round.score) as ovr,
      avg(per_round.vel) + case when member.position = 'GOL' then 0 else least(10, goal_total.total) / 10.0 end as vel,
      avg(per_round.chu) + case when member.position = 'GOL' then 0 else least(10, goal_total.total) / 10.0 end as chu,
      avg(per_round.pas) as pas, avg(per_round.dri) as dri, avg(per_round.def) as def, avg(per_round.fis) as fis,
      avg(per_round.ref) as ref, avg(per_round.ela) as ela, avg(per_round.pos) as pos,
      avg(per_round.sai) as sai, avg(per_round.rep) as rep, avg(per_round.pes) as pes
    from (
      select
        received.match_id,
        avg(received.score) as score,
        avg(received.vel) as vel, avg(received.chu) as chu, avg(received.pas) as pas,
        avg(received.dri) as dri, avg(received.def) as def, avg(received.fis) as fis,
        avg(received.ref) as ref, avg(received.ela) as ela, avg(received.pos) as pos,
        avg(received.sai) as sai, avg(received.rep) as rep, avg(received.pes) as pes
      from public.counted_evaluations(target_group) received
      where received.player_id = winners.member_id
        and received.counted
        and not received.off_position
      group by received.match_id
    ) per_round
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
      select round_slot.plays_in_goal is not null and winners.kind not in ('jogador_do_mes', 'campeao_do_mes') as is_round_card
    ) flag
  ) card
  on conflict (match_id, kind, member_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke execute on function public.compute_match_awards(uuid, text) from public, anon, authenticated;
