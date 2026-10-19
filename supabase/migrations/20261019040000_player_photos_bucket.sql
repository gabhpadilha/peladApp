-- Fotos das cartas: bucket público de leitura (a carta é vista por toda a
-- pelada). Ninguém grava pelo app ainda: as fotos sobem pelo servidor/CLI.
-- Quando houver upload pelo app, crie as policies de escrita aqui.
-- `group_members.photo_path` guarda o caminho no bucket; `photo_kind` diz se é
-- recorte sem fundo (`cutout`) ou foto comum (`original`).

do $$
begin
  -- O schema `storage` só existe no Supabase (os testes locais em PGlite não têm).
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('player-photos', 'player-photos', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
    on conflict (id) do nothing;
  end if;
end $$;
