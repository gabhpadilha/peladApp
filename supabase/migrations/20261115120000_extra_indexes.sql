-- Índices que faltavam em chaves estrangeiras (auditoria de 2026-11-12). Sem mudança de comportamento: só deixam as consultas por
-- pelada, publicação e anúncio mais rápidas quando as tabelas crescerem. `if not exists`: pode rodar de novo sem erro.
create index if not exists awards_group_idx on public.awards (group_id);
create index if not exists feed_posts_group_idx on public.feed_posts (group_id);
create index if not exists feed_posts_member_idx on public.feed_posts (member_id);
create index if not exists feed_posts_award_idx on public.feed_posts (award_id);
create index if not exists market_listings_buyer_idx on public.market_listings (buyer_member_id);
create index if not exists market_listings_seller_group_idx on public.market_listings (seller_group_id);
create index if not exists goal_choices_option_idx on public.goal_choices (option_key);
