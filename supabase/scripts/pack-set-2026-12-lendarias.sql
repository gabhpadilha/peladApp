-- Conjunto de pacotes de dezembro de 2026 (evento Destino): as 3 lendárias (decisão do dono do app em 2026-11-12: dezembro é o maior evento,
-- com mais lendárias, épicas, raras e comuns). Rodar no SQL Editor do Supabase; pode rodar de novo sem duplicar.
insert into public.pack_sets (month, skin, design, rarity) values
  ('2026-12', 'destino', 'destino', 'lendaria'),
  ('2026-12', 'tormenta', 'tormenta', 'lendaria'),
  ('2026-12', 'embuste', 'embuste', 'lendaria')
on conflict (month, skin) do nothing;

select rarity, count(*) from public.pack_sets where month = '2026-12' group by rarity order by rarity;
