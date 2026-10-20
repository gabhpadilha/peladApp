-- Aviso do bônus de boas-vindas (150 PeladaCoins): o valor sai do código
-- (lib/progression.ts), o banco só guarda quando o jogador viu o aviso.
alter table public.group_members add column welcome_bonus_seen_at timestamptz;

-- O jogador marca o próprio aviso como visto (policy de update: a própria linha).
grant update (welcome_bonus_seen_at) on public.group_members to authenticated;
