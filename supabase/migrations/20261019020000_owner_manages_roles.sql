-- Dono da pelada (groups.created_by): só ele promove/rebaixa organizadores, e
-- nenhum outro organizador mexe na conta dele (desativar, editar, senha).
-- Os demais organizadores seguem cadastrando, editando e desativando jogadores.

create function public.is_group_owner(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
    join public.group_members gm on gm.group_id = g.id and gm.user_id = g.created_by
    where g.id = target_group
      and g.created_by = (select auth.uid())
      and gm.deactivated_at is null
  );
$$;

revoke execute on function public.is_group_owner(uuid) from public, anon;
grant execute on function public.is_group_owner(uuid) to authenticated;

-- Apelido/posição: cada um edita o seu; organizador edita os outros, menos o dono.
drop policy "group_members: editar a si mesmo ou, se organizador, qualquer um" on public.group_members;
create policy "group_members: editar a si mesmo ou, se organizador, os outros (menos o dono)"
  on public.group_members for update to authenticated
  using (
    user_id = (select auth.uid())
    or (
      public.is_group_organizer(group_id)
      and user_id <> (select created_by from public.groups where id = group_members.group_id)
    )
  )
  with check (
    user_id = (select auth.uid())
    or (
      public.is_group_organizer(group_id)
      and user_id <> (select created_by from public.groups where id = group_members.group_id)
    )
  );

create or replace function public.set_member_role(target_member uuid, new_role public.member_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_group_id uuid;
  member_user_id uuid;
  member_deactivated_at timestamptz;
begin
  select group_id, user_id, deactivated_at into member_group_id, member_user_id, member_deactivated_at
  from public.group_members where id = target_member;
  if member_group_id is null or not public.is_group_owner(member_group_id) then
    raise exception 'only the group owner can change roles' using errcode = '42501';
  end if;

  if member_user_id = (select auth.uid()) then
    raise exception 'the owner is always an organizer';
  end if;

  if member_deactivated_at is not null then
    raise exception 'reactivate the player before changing the role';
  end if;

  update public.group_members set role = new_role where id = target_member;
end;
$$;

create or replace function public.set_member_active(target_member uuid, active boolean)
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

  if member_user_id = (select created_by from public.groups where id = member_group_id) then
    raise exception 'the group owner cannot be deactivated';
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
