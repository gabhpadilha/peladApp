-- Lendária nova do conjunto de novembro de 2026 (Toró): Maré-Rei, aprovada pelo dono do app em 2026-11-12.
-- Rodar no SQL Editor DEPOIS de a Vercel publicar a main com a skin. Pode rodar de novo sem duplicar.
insert into public.pack_sets (month, skin, design, rarity) values ('2026-11', 'marerei', 'marerei', 'lendaria')
on conflict (month, skin) do nothing;

-- Conferência: deve listar a Maré-Rei.
select skin, design, rarity from public.pack_sets where month = '2026-11' and skin = 'marerei';
