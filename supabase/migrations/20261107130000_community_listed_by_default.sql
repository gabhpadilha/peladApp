-- Pelada ligada na comunidade por padrão (decisão do dono do app em 2026-11-06, no lugar do "desligada até o dono ligar").
-- O Administrador continua podendo desligar (`set_group_listed`). O perfil de cada JOGADOR segue desligado por padrão
-- (`group_members.public_profile_at`): quem aparece no ranking público e no feed é só quem aceita.

alter table public.groups alter column listed_at set default now();
update public.groups set listed_at = now() where listed_at is null;
