-- O app vira uma comunidade (decisão do dono do app em 2026-11-06): todas as peladas e todos os jogadores aparecem na
-- comunidade, sem opção de ficar de fora. O que aparece segue limitado (apelido, carta, pontos, gols e galeria; nunca
-- notas, nome completo nem usuário). Quem não deve aparecer: pelada suspensa e jogador desativado (as funções de leitura
-- já filtram). Esconder uma pelada específica fica só com o admin da plataforma, por SQL (`groups.listed_at = null`).

alter table public.group_members alter column public_profile_at set default now();
update public.group_members set public_profile_at = now() where public_profile_at is null;
update public.groups set listed_at = now() where listed_at is null;

-- Sem interruptores: ninguém desliga a própria pelada nem o próprio perfil.
drop function public.set_group_listed(uuid, boolean);
drop function public.set_public_profile(uuid, boolean);
