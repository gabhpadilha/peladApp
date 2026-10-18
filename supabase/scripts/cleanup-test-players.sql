-- Desfaz seed-test-players.sql: apaga os jogadores fictícios e as rodadas deles.
--   npx supabase db query --linked -f supabase/scripts/cleanup-test-players.sql
--
-- 1) Apaga as rodadas em que SÓ fictícios estiveram (a cascata leva presença e notas).
-- 2) Apaga os usuários fictícios (a cascata leva perfil, membro e as presenças/notas
--    deles em rodadas mistas, que ficam com os jogadores reais).
-- Jogadores reais e a pelada não são tocados.

do $cleanup$
begin
  delete from public.matches m
  where exists (
      select 1
      from public.match_attendance a
      join public.group_members gm on gm.id = a.member_id
      join auth.users u on u.id = gm.user_id
      where a.match_id = m.id and u.raw_user_meta_data ->> 'seed' = 'true'
    )
    and not exists (
      select 1
      from public.match_attendance a
      join public.group_members gm on gm.id = a.member_id
      join auth.users u on u.id = gm.user_id
      where a.match_id = m.id and coalesce(u.raw_user_meta_data ->> 'seed', '') <> 'true'
    );

  delete from auth.users where raw_user_meta_data ->> 'seed' = 'true';
end
$cleanup$;
