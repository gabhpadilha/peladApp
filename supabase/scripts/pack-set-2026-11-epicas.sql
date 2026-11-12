-- Épicas novas do conjunto de novembro de 2026 (Toró), aprovadas pelo dono do app em 2026-11-12.
-- Rodar no SQL Editor DEPOIS de o código com as skins estar no ar (a Vercel publicou a main). Pode rodar de novo sem duplicar.
insert into public.pack_sets (month, skin, design, rarity) values
  ('2026-11', 'granizo', 'granizo', 'epica'),
  ('2026-11', 'ciclone', 'ciclone', 'epica'),
  ('2026-11', 'enxurrada', 'enxurrada', 'epica')
on conflict (month, skin) do nothing;

-- Conferência: deve listar as 3.
select skin, design, rarity from public.pack_sets where month = '2026-11' and skin in ('granizo', 'ciclone', 'enxurrada');
