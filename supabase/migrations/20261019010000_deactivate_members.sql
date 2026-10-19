-- Desativar jogador: quem sai da pelada perde o acesso e some do elenco ativo,
-- do ranking, do sorteio e das novas rodadas, mas o histórico fica (as notas
-- que ele deu e recebeu continuam valendo, então o OVR de ninguém muda).
-- O organizador pode reativar.

alter table public.group_members add column deactivated_at timestamptz;

comment on column public.group_members.deactivated_at is
  'Quando o organizador desativou o jogador; NULL = ativo. Só muda por set_member_active.';

-- ---------------------------------------------------------------------------
-- Acesso: só membros ativos contam como membro/organizador.
-- (create or replace mantém os grants e as policies que usam as funções.)
-- ---------------------------------------------------------------------------

create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group
      and user_id = (select auth.uid())
      and deactivated_at is null
  );
$$;

create or replace function public.is_group_organizer(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group
      and user_id = (select auth.uid())
      and role = 'organizer'
      and deactivated_at is null
  );
$$;

-- O desativado ainda lê a própria linha, para o app mostrar "conta desativada"
-- em vez de mandar para a criação de pelada.
create policy "group_members: ver a própria linha"
  on public.group_members for select to authenticated
  using (user_id = (select auth.uid()));

-- Notas e votos só de quem está ativo (o desativado agora lê a própria linha,
-- então o "evaluator_id in (...)" sozinho deixaria ele enviar).
drop policy "evaluations: enviar notas em rodada aberta" on public.evaluations;
create policy "evaluations: enviar notas em rodada aberta"
  on public.evaluations for insert to authenticated
  with check (
    evaluator_id in (
      select id from public.group_members
      where user_id = (select auth.uid()) and deactivated_at is null
    )
    and exists (
      select 1 from public.matches
      where matches.id = evaluations.match_id and matches.status = 'open'
    )
  );

drop policy "round_votes: votar em rodada aberta" on public.round_votes;
create policy "round_votes: votar em rodada aberta"
  on public.round_votes for insert to authenticated
  with check (
    voter_id in (
      select id from public.group_members
      where user_id = (select auth.uid()) and deactivated_at is null
    )
    and exists (
      select 1 from public.matches
      where matches.id = round_votes.match_id and matches.status = 'open'
    )
  );

drop policy "round_votes: mudar o voto em rodada aberta" on public.round_votes;
create policy "round_votes: mudar o voto em rodada aberta"
  on public.round_votes for update to authenticated
  using (voter_id in (select id from public.group_members where user_id = (select auth.uid())))
  with check (
    voter_id in (
      select id from public.group_members
      where user_id = (select auth.uid()) and deactivated_at is null
    )
    and exists (
      select 1 from public.matches
      where matches.id = round_votes.match_id and matches.status = 'open'
    )
  );

-- ---------------------------------------------------------------------------
-- Rodada nova só com jogadores ativos da pelada.
-- ---------------------------------------------------------------------------

create or replace function public.create_match(
  target_group uuid,
  match_date date,
  present_member_ids uuid[],
  team_numbers smallint[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_match_id uuid;
  next_round integer;
begin
  if coalesce(array_length(present_member_ids, 1), 0) < 2 then
    raise exception 'at least two players must be present';
  end if;

  if array_length(present_member_ids, 1) <> coalesce(array_length(team_numbers, 1), 0) then
    raise exception 'every present player needs a team';
  end if;

  if exists (
    select 1
    from unnest(present_member_ids) as present (member_id)
    where not exists (
      select 1 from public.group_members gm
      where gm.id = present.member_id
        and gm.group_id = target_group
        and gm.deactivated_at is null
    )
  ) then
    raise exception 'only active players of the group can be present';
  end if;

  select coalesce(max(round), 0) + 1 into next_round
  from public.matches
  where group_id = target_group;

  insert into public.matches (group_id, round, played_on, created_by)
  values (target_group, next_round, match_date, (select auth.uid()))
  returning id into new_match_id;

  insert into public.match_attendance (group_id, match_id, member_id, team)
  select target_group, new_match_id, player.member_id, player.team
  from unnest(present_member_ids, team_numbers) as player (member_id, team);

  return new_match_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Papel: só de ativos, e "pelo menos um organizador" conta só os ativos.
-- ---------------------------------------------------------------------------

create or replace function public.set_member_role(target_member uuid, new_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_group_id uuid;
  member_deactivated_at timestamptz;
begin
  select group_id, deactivated_at into member_group_id, member_deactivated_at
  from public.group_members where id = target_member;
  if member_group_id is null or not public.is_group_organizer(member_group_id) then
    raise exception 'only organizers can change roles' using errcode = '42501';
  end if;

  if member_deactivated_at is not null then
    raise exception 'reactivate the player before changing the role';
  end if;

  if new_role = 'player' and (
    select count(*) from public.group_members
    where group_id = member_group_id
      and role = 'organizer'
      and deactivated_at is null
      and id <> target_member
  ) = 0 then
    raise exception 'the group needs at least one organizer';
  end if;

  update public.group_members set role = new_role where id = target_member;
end;
$$;

-- ---------------------------------------------------------------------------
-- Desativar/reativar. Organizador desativado volta como jogador.
-- ---------------------------------------------------------------------------

create function public.set_member_active(target_member uuid, active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_group_id uuid;
  member_user_id uuid;
begin
  select group_id, user_id into member_group_id, member_user_id
  from public.group_members where id = target_member;
  if member_group_id is null or not public.is_group_organizer(member_group_id) then
    raise exception 'only organizers can deactivate players' using errcode = '42501';
  end if;

  if member_user_id = (select auth.uid()) then
    raise exception 'you cannot deactivate yourself';
  end if;

  if active then
    update public.group_members set deactivated_at = null where id = target_member;
  else
    update public.group_members
    set deactivated_at = coalesce(deactivated_at, now()), role = 'player'
    where id = target_member;
  end if;
end;
$$;

revoke execute on function public.set_member_active(uuid, boolean) from public, anon;
grant execute on function public.set_member_active(uuid, boolean) to authenticated;
