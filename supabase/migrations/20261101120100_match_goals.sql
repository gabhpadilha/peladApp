-- Gols confirmados pelos colegas (2026-11-01, decisão do dono do app; design em
-- docs/superpowers/specs/2026-11-01-gols-confirmados-design.md).
--
-- - Cada presente informa os próprios gols (0 a 15); o organizador informa por quem está sem
--   celular. Só `report_goals` grava.
-- - Outro presente confirma ("sim") ou não; 3 "sim" confirmam, não importa quantos "não".
--   Quem informou os gols de alguém (o organizador) não conta como "sim" nesses gols.
--   Corrigir o número apaga as confirmações daquele jogador. Só `confirm_goals` grava.
-- - As notas ficam travadas até todos os presentes terem gols informados, ou até o
--   organizador liberar (`matches.ratings_unlocked_at`, por `unlock_ratings`).
-- - Ao fechar, `compute_match_awards` dá o Goleador da Rodada (mais gols confirmados).
-- - Tudo só com a rodada aberta. Quem votou o quê é anônimo: cada um lê só as próprias
--   confirmações; as contagens vêm de `get_match_goals`.

create table public.match_goals (
  group_id uuid not null,
  match_id uuid not null,
  member_id uuid not null,
  goals smallint not null check (goals between 0 and 15),
  -- Quem informou: o próprio jogador ou um organizador.
  reported_by uuid not null references public.group_members (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (match_id, member_id),
  foreign key (match_id, member_id) references public.match_attendance (match_id, member_id) on delete cascade,
  foreign key (group_id, match_id) references public.matches (group_id, id) on delete cascade
);

create table public.match_goal_confirmations (
  group_id uuid not null,
  match_id uuid not null,
  member_id uuid not null,
  voter_id uuid not null,
  confirmed boolean not null,
  created_at timestamptz not null default now(),
  primary key (match_id, member_id, voter_id),
  check (member_id <> voter_id),
  foreign key (match_id, member_id) references public.match_goals (match_id, member_id) on delete cascade,
  foreign key (match_id, voter_id) references public.match_attendance (match_id, member_id) on delete cascade,
  foreign key (group_id, match_id) references public.matches (group_id, id) on delete cascade
);

create index match_goal_confirmations_voter_idx on public.match_goal_confirmations (voter_id);
create index match_goals_reported_by_idx on public.match_goals (reported_by);

alter table public.matches add column ratings_unlocked_at timestamptz;

alter table public.match_goals enable row level security;
alter table public.match_goal_confirmations enable row level security;

-- Os gols informados são da pelada inteira; nada se grava direto (só pelas funções).
create policy "match_goals: membros leem" on public.match_goals
  for select to authenticated using (public.is_group_member(group_id));

-- Cada um lê só as próprias confirmações (as contagens vêm de get_match_goals).
create policy "match_goal_confirmations: cada um lê as suas" on public.match_goal_confirmations
  for select to authenticated using (
    voter_id in (select id from public.group_members where user_id = (select auth.uid()))
  );

-- Membro ativo de quem chama numa pelada.
create function public.current_member_id(target_group uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.group_members
  where group_id = target_group and user_id = (select auth.uid()) and deactivated_at is null
  limit 1;
$$;
revoke execute on function public.current_member_id(uuid) from public, anon, authenticated;

-- Informa (ou corrige) os gols de um presente: o próprio ou, para outro, um organizador.
-- Mudar o número apaga as confirmações daquele jogador.
create function public.report_goals(target_match uuid, target_member uuid, goal_count integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
  caller uuid;
  previous smallint;
begin
  select group_id, status into target_group, current_status from public.matches where id = target_match;
  if target_group is null then
    raise exception 'match not found';
  end if;
  caller := public.current_member_id(target_group);
  if caller is null then
    raise exception 'not a member' using errcode = '42501';
  end if;
  if caller <> target_member and not public.is_group_organizer(target_group) then
    raise exception 'only organizers can report goals for others' using errcode = '42501';
  end if;
  if current_status <> 'open' then
    raise exception 'round is not open';
  end if;
  if goal_count is null or goal_count < 0 or goal_count > 15 then
    raise exception 'goals must be between 0 and 15';
  end if;
  if not exists (
    select 1 from public.match_attendance where match_id = target_match and member_id = target_member
  ) then
    raise exception 'player was not in this round';
  end if;

  select goals into previous from public.match_goals where match_id = target_match and member_id = target_member;
  insert into public.match_goals (group_id, match_id, member_id, goals, reported_by)
  values (target_group, target_match, target_member, goal_count, caller)
  on conflict (match_id, member_id) do update
    set goals = excluded.goals, reported_by = excluded.reported_by, updated_at = now();
  if previous is distinct from goal_count::smallint then
    delete from public.match_goal_confirmations where match_id = target_match and member_id = target_member;
  end if;
end;
$$;
revoke execute on function public.report_goals(uuid, uuid, integer) from public, anon;
grant execute on function public.report_goals(uuid, uuid, integer) to authenticated;

-- Confirma ("sim") ou não os gols informados por outro presente.
create function public.confirm_goals(target_match uuid, target_member uuid, is_confirmed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
  caller uuid;
  reporter uuid;
  goal_count smallint;
begin
  select group_id, status into target_group, current_status from public.matches where id = target_match;
  if target_group is null then
    raise exception 'match not found';
  end if;
  caller := public.current_member_id(target_group);
  if caller is null or not exists (
    select 1 from public.match_attendance where match_id = target_match and member_id = caller
  ) then
    raise exception 'only players of this round can confirm goals' using errcode = '42501';
  end if;
  if current_status <> 'open' then
    raise exception 'round is not open';
  end if;
  if caller = target_member then
    raise exception 'cannot confirm your own goals';
  end if;
  select goals, reported_by into goal_count, reporter
  from public.match_goals where match_id = target_match and member_id = target_member;
  if goal_count is null or goal_count = 0 then
    raise exception 'no goals to confirm';
  end if;
  if reporter = caller then
    raise exception 'who reported the goals cannot confirm them';
  end if;

  insert into public.match_goal_confirmations (group_id, match_id, member_id, voter_id, confirmed)
  values (target_group, target_match, target_member, caller, is_confirmed)
  on conflict (match_id, member_id, voter_id) do update set confirmed = excluded.confirmed, created_at = now();
end;
$$;
revoke execute on function public.confirm_goals(uuid, uuid, boolean) from public, anon;
grant execute on function public.confirm_goals(uuid, uuid, boolean) to authenticated;

-- O organizador libera as notas sem esperar os gols de todo mundo.
create function public.unlock_ratings(target_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
begin
  select group_id, status into target_group, current_status from public.matches where id = target_match;
  if target_group is null or not public.is_group_organizer(target_group) then
    raise exception 'only organizers can unlock ratings' using errcode = '42501';
  end if;
  if current_status <> 'open' then
    raise exception 'round is not open';
  end if;
  update public.matches set ratings_unlocked_at = coalesce(ratings_unlocked_at, now()) where id = target_match;
end;
$$;
revoke execute on function public.unlock_ratings(uuid) from public, anon;
grant execute on function public.unlock_ratings(uuid) to authenticated;

-- Gols de todas as rodadas da pelada, com as contagens (sem dizer quem votou o quê).
create function public.get_group_goals(target_group uuid)
returns table (match_id uuid, member_id uuid, goals smallint, reported_by uuid, yes_count integer, no_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    goal.match_id, goal.member_id, goal.goals, goal.reported_by,
    count(*) filter (where confirmation.confirmed)::integer,
    count(*) filter (where not confirmation.confirmed)::integer
  from public.match_goals goal
  left join public.match_goal_confirmations confirmation
    on confirmation.match_id = goal.match_id and confirmation.member_id = goal.member_id
  where goal.group_id = target_group
    and public.is_group_member(target_group)
  group by goal.match_id, goal.member_id, goal.goals, goal.reported_by;
$$;
revoke execute on function public.get_group_goals(uuid) from public, anon;
grant execute on function public.get_group_goals(uuid) to authenticated;

-- Notas liberadas? Todos os presentes com gols informados, ou o organizador liberou.
create function public.ratings_open(target_match uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.matches where id = target_match and ratings_unlocked_at is not null)
    or not exists (
      select 1 from public.match_attendance attendance
      where attendance.match_id = target_match
        and not exists (
          select 1 from public.match_goals goal
          where goal.match_id = attendance.match_id and goal.member_id = attendance.member_id
        )
    );
$$;
revoke execute on function public.ratings_open(uuid) from public, anon;
grant execute on function public.ratings_open(uuid) to authenticated;

-- O banco também trava as notas antes da etapa dos gols (código PA006, mensagem no app).
create function public.guard_ratings_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.ratings_open(new.match_id) then
    raise exception 'ratings are locked until everyone reports goals' using errcode = 'PA006';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_ratings_open() from public, anon, authenticated;

create trigger evaluations_ratings_open
  before insert on public.evaluations
  for each row execute function public.guard_ratings_open();

-- Rodadas abertas antes desta migration: as notas já estavam liberadas.
update public.matches set ratings_unlocked_at = now() where status = 'open';

-- ---------------------------------------------------------------------------
-- Prêmios: entra o Goleador da Rodada (o resto igual a 20261029120200)
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
    select 'goleador'::public.award_kind as kind, member_id, goals as votes, null::numeric as score
    from confirmed_goals
    where goals = (select max(other.goals) from confirmed_goals other)
  ),
  winners as (
    select * from vote_winners
    union all
    select * from goal_winners
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
