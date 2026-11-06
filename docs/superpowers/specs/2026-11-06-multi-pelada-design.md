# Várias peladas no mesmo app (2026-11-06)

Decisão do dono do app: um app só, várias peladas (não réplicas). Começa grátis, com até 5 peladas ativas (`MAX_ACTIVE_GROUPS = 5`, suspensas não contam).

## Passo A — banco (migration `20261106120000_multi_pelada.sql`)
- **Nome único** da pelada, sem diferenciar maiúsculas, acentos, espaços e pontuação (`groups.name_key`, índice único). Só o dono renomeia, pela função `rename_group` (PA010 = nome em uso). `update` direto em `groups` está revogado para o login do jogador.
- **Código curto** `groups.slug` (3 a 6 letras/números) para os usuários novos (`joao.cancha`). Só o painel de admin (chave secreta) grava. Usuários existentes não mudam.
- **Pelada suspensa** (`groups.suspended_at`): tudo continua visível (elenco, rodadas, Loja), mas `create_match` recusa com PA009. Rodada aberta ainda fecha.
- **Perfil:** `is_platform_admin` (só por SQL, uma vez) e aceite dos termos (`terms_accepted_at`, `terms_version`) por `accept_terms`.
- **Teste de isolamento:** `supabase/tests/multi-pelada/isolation.mjs` (PGlite, 49 verificações): leitura e escrita isoladas entre peladas, `groups` e `profiles` protegidos, nome único, suspensão, perfil. O `boot.mjs` do `goals-flow` agora simula os privilégios padrão do Supabase (default privileges antes das migrations) em vez de um `grant` geral depois delas, que desfazia os `revoke`.

## Passo B — painel `/admin` (a fazer)
Só `is_platform_admin`. Lista peladas (jogadores, última rodada, ativa/suspensa), cria pelada com dono (usuário `usuario.slug`, senha gerada mostrada uma vez, mensagem do WhatsApp), suspende e reativa, respeita o limite de 5 ativas. Mostra só números, nunca notas, votos ou fotos. UI para o Administrador renomear a pelada e aviso de PA009 em "Nova rodada".

## Passo C — termos e privacidade (feito em 2026-11-06, branch feat/termos)
`/termos` e `/privacidade` públicas (nome e e-mail de contato, sem CPF), tela "Li e aceito" no primeiro acesso. Texto gerado por IA: rascunho, revisar com advogada.
