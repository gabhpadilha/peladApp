-- Complemento de seed-test-community.sql: gols INFORMADOS e CONFIRMADOS (3 "sim") nas rodadas da pelada "teste",
-- para o ranking de gols da Comunidade e o bloco de gols do perfil. Rode DEPOIS do seed principal; desfaz junto com
-- cleanup-test-community.sql (apaga as rodadas e os gols vão em cascata). Só mexe em rodadas da "teste" sem gols.
-- Depois, apague o recorte público dela para o app recalcular:
--   delete from public.group_showcase where group_id = (select id from public.groups where name_key = 'teste');

do $goals$
declare
  grp uuid;
begin
  select id into grp from public.groups where name_key = 'teste';
  if grp is null then raise exception 'Pelada "teste" não encontrada.'; end if;

  perform setseed(0.31);

  -- Cada presente informa os próprios gols (goleiro não marca; pivô marca mais que ala, e ala mais que fixo).
  insert into public.match_goals (group_id, match_id, member_id, goals, reported_by)
  select grp, a.match_id, a.member_id,
    case m.position
      when 'GOL' then 0
      when 'PIV' then floor(random() * 5)
      when 'ALA' then floor(random() * 4)
      else floor(random() * 2)
    end::smallint,
    a.member_id
  from public.match_attendance a
  join public.group_members m on m.id = a.member_id
  where a.group_id = grp
    and not exists (select 1 from public.match_goals x where x.match_id = a.match_id);

  -- 3 colegas confirmam cada gol informado (3 "sim" confirmam).
  insert into public.match_goal_confirmations (group_id, match_id, member_id, voter_id, confirmed)
  select grp, g.match_id, g.member_id, v.member_id, true
  from public.match_goals g
  cross join lateral (
    select a.member_id from public.match_attendance a
    where a.match_id = g.match_id and a.member_id <> g.member_id
    order by random() limit 3
  ) v
  where g.group_id = grp and g.goals > 0
    and not exists (select 1 from public.match_goal_confirmations c where c.match_id = g.match_id and c.member_id = g.member_id);

  raise notice 'Gols de teste criados na "teste".';
end
$goals$;
