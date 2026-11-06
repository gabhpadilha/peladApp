-- Desfaz seed-test-community.sql: apaga as rodadas da pelada "teste" (com notas, cartas e publicações no feed, em cascata)
-- e os jogadores fictícios dela. O dono real e a pelada ficam. Se a "teste" já foi apagada, só remove os fictícios.
delete from public.matches where group_id = (select id from public.groups where name_key = 'teste');
delete from public.group_showcase where group_id = (select id from public.groups where name_key = 'teste');
delete from auth.users where raw_user_meta_data ->> 'seed_group' = 'teste';
