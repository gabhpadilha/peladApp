-- Cartas especiais colecionáveis.
-- Os presentes votam em Craque da Rodada, Gol da Semana e Bola Murcha (votos
-- anônimos). Ao fechar a rodada, quem tiver mais votos em cada prêmio ganha
-- uma carta congelada: atributos do jogador naquele momento (+1 em Craque e
-- Gol, como o Team of the Week da EA FC; Bola Murcha sem bônus), com o tema
-- sazonal da data do jogo. Empate: todos os empatados ganham.

create type public.award_kind as enum ('craque', 'gol', 'bola_murcha');

-- ---------------------------------------------------------------------------
-- Votos
-- ---------------------------------------------------------------------------

create table public.round_votes (
  match_id uuid not null,
  voter_id uuid not null,
  kind public.award_kind not null,
  nominee_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (match_id, voter_id, kind),
  -- Ninguém vota em si mesmo.
  check (voter_id <> nominee_id),
  -- Quem vota e quem recebe o voto precisam ter jogado a rodada.
  foreign key (match_id, voter_id)
    references public.match_attendance (match_id, member_id) on delete cascade,
  foreign key (match_id, nominee_id)
    references public.match_attendance (match_id, member_id) on delete cascade
);

create index round_votes_nominee_id_idx on public.round_votes (nominee_id);

alter table public.round_votes enable row level security;

-- Anônimos: cada um só vê os próprios votos. O resultado aparece nas cartas.
create policy "round_votes: ver os próprios votos"
  on public.round_votes for select to authenticated
  using (voter_id in (select id from public.group_members where user_id = (select auth.uid())));

create policy "round_votes: votar em rodada aberta"
  on public.round_votes for insert to authenticated
  with check (
    voter_id in (select id from public.group_members where user_id = (select auth.uid()))
    and exists (
      select 1 from public.matches
      where matches.id = round_votes.match_id and matches.status = 'open'
    )
  );

-- Permite trocar o voto (upsert) enquanto a rodada estiver aberta.
create policy "round_votes: mudar o voto em rodada aberta"
  on public.round_votes for update to authenticated
  using (voter_id in (select id from public.group_members where user_id = (select auth.uid())))
  with check (
    voter_id in (select id from public.group_members where user_id = (select auth.uid()))
    and exists (
      select 1 from public.matches
      where matches.id = round_votes.match_id and matches.status = 'open'
    )
  );

-- ---------------------------------------------------------------------------
-- Cartas especiais (coleção)
-- ---------------------------------------------------------------------------

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  match_id uuid not null,
  member_id uuid not null,
  kind public.award_kind not null,
  -- Tema sazonal da carta (ex.: 'halloween'); 'default' = visual padrão do prêmio.
  theme text not null default 'default' check (theme ~ '^[a-z0-9-]{1,40}$'),
  votes integer not null check (votes > 0),
  -- Foto congelada do jogador no momento do prêmio.
  position public.player_position not null,
  ovr smallint check (ovr between 0 and 99),
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, kind, member_id),
  foreign key (group_id, match_id) references public.matches (group_id, id) on delete cascade,
  foreign key (group_id, member_id) references public.group_members (group_id, id) on delete cascade
);

create index awards_member_id_idx on public.awards (member_id);

alter table public.awards enable row level security;

-- Coleções são públicas dentro da pelada. Cartas só nascem por close_match.
create policy "awards: membros veem"
  on public.awards for select to authenticated
  using (public.is_group_member(group_id));

-- ---------------------------------------------------------------------------
-- Cálculo das cartas
-- ---------------------------------------------------------------------------

-- Média (1–10) para a escala da carta (0–99) com bônus; NULL continua NULL.
-- (Atenção: least() ignora NULL, por isso o CASE.)
create function public.award_card_value(average numeric, bonus integer)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case when average is null then null else least(99, round(average * 10) + bonus)::smallint end;
$$;

-- Distribui as cartas de uma rodada já fechada. Uso interno (close_match e
-- scripts de teste): sem execute para usuários do app.
create function public.compute_match_awards(target_match uuid, theme_key text)
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
    where match_id = target_match
    group by kind, nominee_id
  ),
  winners as (
    select vote_counts.*
    from vote_counts
    where votes = (select max(other.votes) from vote_counts other where other.kind = vote_counts.kind)
  )
  insert into public.awards (group_id, match_id, member_id, kind, theme, votes, position, ovr, attributes)
  select
    target_group,
    target_match,
    winners.nominee_id,
    winners.kind,
    theme_key,
    winners.votes,
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
  join public.group_members member on member.id = winners.nominee_id
  cross join lateral (
    select case when winners.kind = 'bola_murcha' then 0 else 1 end as value
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
      where e.player_id = winners.nominee_id
        and m.group_id = target_group
        and m.status = 'closed'
    ) received
  ) snapshot
  on conflict (match_id, kind, member_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- Fecha a rodada e distribui as cartas na mesma transação. Só organizador.
create function public.close_match(target_match uuid, theme_key text default 'default')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_group uuid;
  current_status public.match_status;
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

  update public.matches set status = 'closed', closed_at = now() where id = target_match;
  return public.compute_match_awards(target_match, theme_key);
end;
$$;

revoke execute on function public.award_card_value(numeric, integer) from public, anon, authenticated;
revoke execute on function public.compute_match_awards(uuid, text) from public, anon, authenticated;
revoke execute on function public.close_match(uuid, text) from public, anon;
grant execute on function public.close_match(uuid, text) to authenticated;
