-- Desfaz seed-test-round.sql: apaga a rodada de teste e os jogadores fictícios.
--   npx supabase db query --linked -f supabase/scripts/cleanup-test-round.sql
-- Rode ANTES da rodada real.
--
-- 1) Apaga toda rodada em que algum fictício esteve (a cascata leva presenças,
--    notas, votos, cartas especiais e quem abriu o pacote, inclusive as do
--    Administrador nessa rodada; o OVR, o XP e as moedas dele voltam ao que eram).
-- 2) Apaga os usuários fictícios (a cascata leva perfil e membro).
-- Jogadores reais, rodadas reais e a pelada não são tocados.

do $cleanup$
declare
  removed_matches int;
  removed_users int;
begin
  delete from public.matches m
  where exists (
    select 1
    from public.match_attendance a
    join public.group_members gm on gm.id = a.member_id
    join auth.users u on u.id = gm.user_id
    where a.match_id = m.id and u.raw_user_meta_data ->> 'seed' = 'true'
  );
  get diagnostics removed_matches = row_count;

  delete from auth.users where raw_user_meta_data ->> 'seed' = 'true';
  get diagnostics removed_users = row_count;

  raise notice 'Removidas % rodada(s) de teste e % jogador(es) fictício(s).', removed_matches, removed_users;
end
$cleanup$;
