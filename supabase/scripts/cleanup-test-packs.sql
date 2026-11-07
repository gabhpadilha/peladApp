-- Desfaz seed-test-packs.sql: apaga as rodadas de teste e os jogadores fictícios dos pacotes.
--   npx supabase db query --linked -f supabase/scripts/cleanup-test-packs.sql
--
-- 1) Apaga toda rodada em que algum fictício dos pacotes (seed.pk.NN) esteve; a cascata leva presenças, notas, votos, cartas
--    especiais e os pacotes dela (as skins já reveladas ficam com o dono: apague a pelada de teste pelo /admin para limpar tudo).
-- 2) Apaga os usuários fictícios (a cascata leva perfil e membro).
-- 3) Apaga o conjunto PROVISÓRIO de novembro/2026 (o real é o de dezembro) e desliga os pacotes da pelada de teste.
-- Jogadores reais, rodadas reais e a Fut de Quinta não são tocados.

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
    where a.match_id = m.id and u.email like 'seed.pk.%@peladapp.test'
  );
  get diagnostics removed_matches = row_count;

  delete from auth.users where email like 'seed.pk.%@peladapp.test';
  get diagnostics removed_users = row_count;

  delete from public.pack_sets where month = '2026-11';
  update public.groups set packs_enabled = false where name = 'Teste Pacotes';

  raise notice 'Removidas % rodada(s) de teste e % jogador(es) fictício(s).', removed_matches, removed_users;
end
$cleanup$;
