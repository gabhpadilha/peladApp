-- OVR da carta = média das 3 estatísticas que ela mostra (decisão do dono do app em
-- 2026-10-29): Ataque (velocidade + chute), Criação (passe + drible) e Defesa
-- (defesa + físico); no goleiro, Paredão (reflexo + elasticidade), Leitura
-- (posicionamento + saída) e Saída (reposição + pés). Antes era a média dos 5 melhores
-- atributos (`drop_lowest_average`, que sai). Espelha `getOvrFromStats`/`getCardStats`
-- em lib/card-stats.ts: cada estatística é a média do par, arredondada, e o OVR é a
-- média delas, arredondada, sobre os atributos já na escala da carta (com o bônus).
-- Só muda o OVR congelado nas cartas de prêmio novas; as já distribuídas ficam.
-- Igual a 20261029120100_card_stat_awards, trocando o OVR da carta.

-- Atributos na escala da carta, em pares (1-2, 3-4, 5-6). Ignora nulos.
create function public.card_ovr(variadic vals smallint[])
returns smallint
language sql
immutable
set search_path = ''
as $$
  with stats as (
    select round(avg(v)) as stat
    from unnest(vals) with ordinality as item(v, i)
    group by (i - 1) / 2
  )
  select round(avg(stat))::smallint from stats;
$$;

revoke execute on function public.card_ovr(smallint[]) from public, anon, authenticated;

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
  -- Carta de sempre: atributo = média dele nas notas que contam em rodadas fechadas,
  -- na posição do cadastro (lib/ovr.ts sobre get_group_scores); o OVR sai deles.
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

drop function public.drop_lowest_average(numeric[]);
