-- Pedido de exclusão da própria conta (LGPD, decisão do dono do app em 2026-11-06). O jogador pede em Eu; quem opera o
-- app (admin da plataforma) analisa no painel e apaga ou dispensa. Não apaga na hora porque sumir com um jogador leva
-- as notas que ele deu e as cartas dele, e muda o OVR de quem jogou com ele.
-- A tabela não tem acesso direto: o jogador usa só as 3 funções abaixo; o painel lê com a chave secreta.

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;

create function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  insert into public.account_deletion_requests (user_id) values ((select auth.uid()))
  on conflict (user_id) do nothing;
end;
$$;
revoke execute on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

create function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.account_deletion_requests where user_id = (select auth.uid());
end;
$$;
revoke execute on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

-- Quando o jogador pediu (nulo = não tem pedido). Só o dele.
create function public.get_my_deletion_request()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select r.requested_at from public.account_deletion_requests r where r.user_id = (select auth.uid());
$$;
revoke execute on function public.get_my_deletion_request() from public, anon;
grant execute on function public.get_my_deletion_request() to authenticated;
