# Auditoria para várias peladas no mesmo app (2026-11-06)

Decisão do dono do app (2026-11-06): vender o Cancha Club para outras peladas **num app só** (um site, um banco), em vez de uma réplica por cliente; começar de graça com 2 ou 3 peladas amigas. Réplica só se um cliente grande exigir.

## Já está pronto
- Banco por pelada: `groups` → `group_members` → `matches`/`awards`/`match_goals`...; RLS por pelada (`is_group_member`, `is_group_organizer`) em todas as tabelas; `getLeague` e as RPCs recebem o `group_id`.
- Dono de cada pelada (`groups.created_by`, "Administrador") e papéis; só ele cria jogadores (`createPlayer`, com chave secreta depois de checar o dono).
- Sem cadastro aberto: só o Administrador cria contas, então um estranho não entra sozinho.
- Calendário de eventos, promoções e artes são globais de propósito: todas as peladas veem o mesmo evento (menos manutenção).

## Precisa mudar (em ordem de importância)
1. **Usuário é único no app inteiro** (`profiles.username unique` e e-mail técnico `<usuario>@peladapp.invalid` no Auth): o "joao" de uma pelada bloqueia o "joao" de outra. Saída: um código curto por pelada (`groups.slug`) e usuário `joao.<slug>`, ou sufixo automático no conflito. Mexe em `createPlayer`, `editPlayer`, `/entrar` e uma migration.
2. **Entrada de uma pelada nova:** hoje o primeiro Administrador é criado à mão. Falta um jeito seu de criar "conta do dono + pelada" (script local com a chave secreta ou uma página só sua).
3. **Teste de isolamento:** criar duas peladas no teste PGlite e provar que uma não lê, não escreve e não apaga nada da outra (notas, cartas, fotos, compras da Loja). Obrigatório antes de vender.
4. **Controle de plano:** campo `groups.active`/`paid_until` para suspender uma pelada sem apagar dados (sem isso, inadimplência vira conversa difícil).
5. **Backup:** o plano grátis do Supabase não dá backup que você controle. Rotina semanal de exportação (`pg_dump`) antes de ter cliente pagando.
6. **Cotas compartilhadas:** remove.bg (50 fotos/mês), GPU grátis do Hugging Face (5 min/dia) e limites do Supabase grátis (500 MB de banco, 1 GB de arquivos, projeto pausa após 7 dias parado). Com 3 peladas dá; com 10 vai apertar.
7. **Jurídico:** termos de uso, política de privacidade (LGPD: fotos e nomes), e o fato de o dono da plataforma ter acesso técnico a tudo. Vercel grátis não permite uso comercial.

## Opcional, depois
Logo e cor por pelada, endereço próprio por cliente, painel seu com métricas por pelada, convite por link.

## Tamanho do trabalho
Itens 1 a 4: pequeno a médio (alguns dias de sessão). Itens 5 a 7: tarefas suas ou de rotina, não de código.
