-- Conjunto de pacotes de dezembro de 2026 (evento Destino): as 8 épicas aprovadas pelo dono do app em 2026-11-12.
-- Rodar no SQL Editor do Supabase. Pode rodar de novo sem duplicar.
-- Atenção: o sorteio só usa as raridades que existem no conjunto do mês. Com só estas 8, todo pacote de dezembro sai épico;
-- as comuns, raras e a lendária de dezembro entram depois, com outro insert no mesmo mês.
insert into public.pack_sets (month, skin, design, rarity) values
  ('2026-12', 'rajada', 'rajada', 'epica'),
  ('2026-12', 'pedreira', 'pedreira', 'epica'),
  ('2026-12', 'cartada', 'cartada', 'epica'),
  ('2026-12', 'ima', 'ima', 'epica'),
  ('2026-12', 'miragem', 'miragem', 'epica'),
  ('2026-12', 'elastico', 'elastico', 'epica'),
  ('2026-12', 'labareda', 'labareda', 'epica'),
  ('2026-12', 'garra', 'garra', 'epica')
on conflict (month, skin) do nothing;

select rarity, count(*) from public.pack_sets where month = '2026-12' group by rarity order by rarity;
