-- Faixa do pacote da rodada = posição na CLASSIFICAÇÃO POR PONTOS da rodada (decisão do dono do app em 2026-11-10),
-- a mesma que o app mostra (`computeRoundRanking` em lib/ranking-points.ts): nota da rodada (OVR da rodada, sem os gols)
-- + 40 no Melhor Jogador + 20 em cada outro prêmio individual (Bola Murcha, Time do Mês e Campeão do Mês não somam)
-- + 10 por gol confirmado (a nota do banco está na escala 1–10, por isso o x10). Os prêmios da rodada já existem quando o sorteio roda (`close_match` chama
-- `compute_match_awards` antes de `draw_round_packs`). Só muda a conta; faixas e chances seguem as mesmas.
create or replace function public.pack_round_ranking(target_match uuid)
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
  prize_points as (
    select
      a.member_id as prize_member,
      sum(case when a.kind = 'craque' then 40 else 20 end)::integer as points
    from public.awards a
    where a.match_id = target_match
      and a.kind not in ('bola_murcha', 'fominha', 'jogador_do_mes', 'campeao_do_mes', 'time_da_semana')
    group by a.member_id
  ),
  goal_points as (
    select goal.member_id as goal_member, (goal.goals * 10)::integer as points
    from public.match_goals goal
    where goal.match_id = target_match
      and goal.goals > 0
      and (
        select count(*) from public.match_goal_confirmations confirmation
        where confirmation.match_id = goal.match_id and confirmation.member_id = goal.member_id and confirmation.confirmed
      ) >= 3
  ),
  ranked as (
    select
      a.member_id as present_member,
      s.score,
      rank() over (
        order by (round(coalesce(s.score, 0) * 10) + coalesce(p.points, 0) + coalesce(g.points, 0)) desc
      )::integer as r
    from public.match_attendance a
    left join scores s on s.scored_member = a.member_id
    left join prize_points p on p.prize_member = a.member_id
    left join goal_points g on g.goal_member = a.member_id
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
