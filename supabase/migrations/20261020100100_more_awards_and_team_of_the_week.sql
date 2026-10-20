-- Cartas novas (valores do enum na migration anterior), Time da Semana e o
-- aviso "Confira os vencedores".
--
-- Quem concorre a cada prêmio por voto:
--   * Melhor Goleiro: só goleiros (posição GOL);
--   * Drible, Atacante e Defensor: só jogadores de linha;
--   * os outros: qualquer presente.
-- Bônus na carta: +1 em tudo, menos Bola Murcha, Fair Play e Fominha
-- (espelha lib/award-bonus.ts: mudou um, mude o outro).
--
-- Time da Semana (sem voto): ao fechar a rodada, as 4 maiores notas médias da
-- linha e a maior do gol naquela rodada, só para quem recebeu pelo menos 3
-- notas. Empate na última vaga: todos os empatados entram (como nos votos).

-- ---------------------------------------------------------------------------
-- Nota da rodada na carta do Time da Semana
-- ---------------------------------------------------------------------------

-- Média (1–10) das notas recebidas na rodada; só no Time da Semana.
-- Nele, `votes` guarda quantas notas a pessoa recebeu.
alter table public.awards
  add column score numeric(4, 2) check (score between 1 and 10);

-- ---------------------------------------------------------------------------
-- Quem pode receber cada voto
-- ---------------------------------------------------------------------------

create function public.guard_round_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nominee_position public.player_position;
begin
  if new.kind = 'time_da_semana' then
    raise exception 'team of the week is not voted' using errcode = '22023';
  end if;

  select position into nominee_position from public.group_members where id = new.nominee_id;

  if new.kind = 'goleiro' and nominee_position <> 'GOL' then
    raise exception 'only goalkeepers can get this vote' using errcode = '22023';
  end if;
  if new.kind in ('drible', 'atacante', 'defensor') and nominee_position = 'GOL' then
    raise exception 'only outfield players can get this vote' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_round_vote() from public, anon, authenticated;

create trigger round_votes_guard
  before insert or update on public.round_votes
  for each row execute function public.guard_round_vote();

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
  inserted_count integer;
begin
  select group_id into target_group from public.matches where id = target_match;

  with vote_counts as (
    select kind, nominee_id, count(*)::integer as votes
    from public.round_votes
    where match_id = target_match and kind <> 'time_da_semana'
    group by kind, nominee_id
  ),
  vote_winners as (
    select vote_counts.kind, vote_counts.nominee_id as member_id, vote_counts.votes, null::numeric as score
    from vote_counts
    where votes = (select max(other.votes) from vote_counts other where other.kind = vote_counts.kind)
  ),
  -- Nota de cada avaliação = média dos atributos dela (lib/ovr.ts).
  round_scores as (
    select
      e.player_id as member_id,
      count(*)::integer as ratings,
      avg(
        (coalesce(e.vel, 0) + coalesce(e.chu, 0) + coalesce(e.pas, 0) + coalesce(e.dri, 0)
          + coalesce(e.def, 0) + coalesce(e.fis, 0) + coalesce(e.ref, 0) + coalesce(e.ela, 0)
          + coalesce(e.pos, 0) + coalesce(e.sai, 0) + coalesce(e.rep, 0) + coalesce(e.pes, 0))::numeric
          / nullif(num_nonnulls(e.vel, e.chu, e.pas, e.dri, e.def, e.fis, e.ref, e.ela, e.pos, e.sai, e.rep, e.pes), 0)
      ) as score
    from public.evaluations e
    where e.match_id = target_match
    group by e.player_id
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
  winners as (
    select * from vote_winners
    union all
    select * from team_of_the_week
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

-- ---------------------------------------------------------------------------
-- Quem já abriu o pacote de cada rodada (aviso "Confira os vencedores")
-- ---------------------------------------------------------------------------

create table public.award_reveals (
  match_id uuid not null references public.matches (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (match_id, member_id)
);

create index award_reveals_member_id_idx on public.award_reveals (member_id);

alter table public.award_reveals enable row level security;

create policy "award_reveals: ver os próprios"
  on public.award_reveals for select to authenticated
  using (member_id in (select id from public.group_members where user_id = (select auth.uid())));

-- Só a própria linha, em rodada fechada da própria pelada.
create policy "award_reveals: marcar como visto"
  on public.award_reveals for insert to authenticated
  with check (
    member_id in (
      select id from public.group_members
      where user_id = (select auth.uid()) and deactivated_at is null
    )
    and exists (
      select 1
      from public.matches
      join public.group_members member on member.group_id = matches.group_id
      where matches.id = award_reveals.match_id
        and member.id = award_reveals.member_id
        and matches.status = 'closed'
    )
  );
