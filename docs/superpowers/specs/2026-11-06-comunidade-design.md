# Comunidade: vitrine de peladas e feed de conquistas (2026-11-06)

Pedido do dono do app: as peladas se enxergarem (ranking, estatísticas de atletas) e uma linha do tempo compartilhada com as conquistas. Decisões de 2026-11-06: começar por **vitrine de peladas + feed de conquistas**; só quem tem conta vê; **a pelada nasce ligada** (o Administrador desliga; mudado no mesmo dia, antes era desligada) e **o perfil de cada jogador nasce desligado** (cada um escolhe).

## Princípio de segurança
A comunidade **nunca lê os dados privados de outra pelada** (notas, votos, presenças, histórico por rodada, nome completo, usuário, foto original). Ela só lê **recortes públicos que a própria pelada gravou**:
- `group_showcase`: ranking e artilharia da pelada, calculados no servidor da pelada ao fechar a rodada (mesmas contas de `lib/ranking-points.ts` e `lib/goal-ranking.ts`) e gravados como jsonb (apelido, patente, OVR, pontos, gols). Nada de nota de ninguém.
- `feed_posts`: uma conquista que o jogador decidiu publicar, congelada (carta de `awards`).
O banco expõe esses recortes por funções `security definer` que só devolvem campos seguros. As tabelas privadas continuam com RLS por pelada, como hoje; o teste de isolamento ganha a prova de que de fora nada vaza.

## Dados (migration futura)
- `groups.listed_at timestamptz`: a pelada aparece na vitrine (nulo = não aparece). Só o Administrador da pelada liga, por função `set_group_listed`; suspensa não aparece.
- `group_members.public_profile_at timestamptz`: o jogador aceita aparecer fora da pelada (no ranking público e no feed). Por função `set_public_profile`. Quem não aceitou não aparece em nenhuma lista pública.
- `group_showcase (group_id pk, updated_at, ranking jsonb, scorers jsonb)`: sem policy; só função `get_group_showcase(group)` lê, e só se a pelada estiver listada.
- `feed_posts (id, award_id unique, group_id, member_id, created_at)`: o conteúdo vem de `awards` (kind, theme, ovr, position, score, votes) + apelido e foto da carta. `publish_award(award)`: só o dono da carta, só se `public_profile_at` ligado, só pelada listada, uma vez. `unpublish_post` apaga.
- `feed_reactions (post_id, user_id, emoji)` com `unique (post_id, user_id)`; emojis fixos (👏 🔥 🧤 😂), sem texto livre.
- Funções de leitura (só `authenticated`): `get_listed_groups()`, `get_group_showcase(group)`, `get_feed(limit, before)`. 

## Telas
- **Comunidade** (`/comunidade`, item novo da navegação ou dentro de Início): abas **Peladas** e **Feed**.
- **Vitrine de peladas:** cartões com nome, cidade/UF, dia do jogo, nº de jogadores e o líder do ranking. Toque abre a pelada.
- **Pelada pública (`/comunidade/[groupId]`):** ranking por pontos (mês e todos os tempos) e artilharia, só dos jogadores que aceitaram. Sem links para perfis de fora na primeira versão.
- **Feed:** cartões de conquista (a carta, apelido, pelada, rodada e data), reações e, no dono, "Remover". Sem comentários e sem texto livre (sem moderação no começo).
- **Publicar:** na Coleção, o dono vê "Publicar no feed" nas cartas da rodada mais recente (mesma regra do compartilhar nos stories). 
- **Ajustes:** o Administrador liga "Aparecer na comunidade" em Elenco; cada jogador liga "Mostrar meu perfil para outras peladas" em Eu.

## Fora desta versão
Perfil de atleta de outra pelada, comentários, seguir pessoas, notificações. Entram depois de medir se o pessoal usa a comunidade.

## Pendências antes de abrir
- Termos e privacidade cobrindo a publicação para outras peladas (precisa do e-mail de contato).
- Limite de 5 peladas ativas já controla o tamanho da comunidade no começo.
