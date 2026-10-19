-- Gestão de pessoas só pelo dono da pelada (groups.created_by): cadastrar,
-- editar, redefinir senha, desativar/reativar e mudar papel. Cada jogador
-- (inclusive organizador) só mexe no próprio apelido e nome. Organizadores
-- seguem criando e fechando rodadas.

-- Update de group_members: o próprio jogador, ou o dono em qualquer um.
drop policy "group_members: editar a si mesmo ou, se organizador, os outros (menos o dono)" on public.group_members;
create policy "group_members: editar a si mesmo ou, se dono, qualquer um"
  on public.group_members for update to authenticated
  using (user_id = (select auth.uid()) or public.is_group_owner(group_id))
  with check (user_id = (select auth.uid()) or public.is_group_owner(group_id));

-- O próprio jogador só troca apelido (e foto); posição é com o dono, porque
-- linha ↔ goleiro muda o tipo de nota.
create function public.guard_member_self_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.position is distinct from old.position
    and (select auth.uid()) is not null
    and not public.is_group_owner(new.group_id) then
    raise exception 'only the group owner can change positions' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_member_self_update() from public, anon, authenticated;

create trigger guard_member_self_update
  before update on public.group_members
  for each row execute function public.guard_member_self_update();

-- Remover do elenco (delete direto) também só o dono.
drop policy "group_members: organizador remove" on public.group_members;
create policy "group_members: dono remove"
  on public.group_members for delete to authenticated
  using (public.is_group_owner(group_id));

-- Desativar/reativar: só o dono.
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
  if member_group_id is null or not public.is_group_owner(member_group_id) then
    raise exception 'only the group owner can deactivate players' using errcode = '42501';
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
