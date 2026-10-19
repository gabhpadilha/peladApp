-- Login por usuário: o organizador cadastra o jogador com um nome de usuário
-- (sem e-mail). O Auth recebe um e-mail técnico <usuario>@peladapp.invalid,
-- que nunca recebe mensagens (domínio reservado, RFC 2606).

alter table public.profiles
  add column username text unique
  check (username ~ '^[a-z0-9.]{3,20}$');

comment on column public.profiles.username is
  'Login sem e-mail. Definido só pelo servidor (chave secreta) ao cadastrar o jogador; NULL para contas com e-mail.';

-- O próprio jogador só edita o nome: trocar o usuário quebraria o login.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- O link de convite saiu do app (só o organizador cria contas).
revoke execute on function public.get_invite(text) from anon;
