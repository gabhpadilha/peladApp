-- handle_new_user só deve rodar pelo trigger on_auth_user_created.
-- Sem isso ela fica exposta em /rest/v1/rpc/handle_new_user (aviso do advisor).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
