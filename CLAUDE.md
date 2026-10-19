# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Regras do Next.js mantidas pelo `next dev` (ler a doc da versão instalada antes de escrever código Next):
@AGENTS.md

## ⚽ Contexto do Projeto
O PeladApp é uma aplicação web full-stack para gamificar o futebol de salão (futsal) semanal: avaliações pós-jogo (linha: Velocidade, Chute, Passe, Drible, Defesa, Físico; goleiro tem atributos próprios), cartinhas dinâmicas estilo "Ultimate Team" com OVR atualizado e um sorteio inteligente (Draft) que equilibra os times pelo OVR dos jogadores.

Design mobile-first é inegociável: a interação principal (dar notas no vestiário) acontece no celular.

**Estado atual:** tudo lê o Supabase (não há mais mocks). Home (`/`) e atleta (`/jogadores/[memberId]`) leem de `lib/league.ts`; OVR e atributos são sempre calculados das avaliações (`lib/ovr.ts`, `lib/players.ts`). Contas: **só o organizador cria**, em `/pelada`, por **nome de usuário, sem e-mail** (senha provisória via chave secreta; troca obrigatória em `/trocar-senha` no 1º acesso; "Redefinir senha" no elenco). Não existe mais link de convite/cadastro. Login por usuário (ou e-mail, nas contas antigas) e senha (`/entrar`), "Sair" na navbar. `/bem-vindo` cria a pelada (só o 1º organizador). `/pelada`: cadastrar jogador, nova rodada (data + confirmados do WhatsApp + **sorteio dos times pelo OVR**), fechar rodada, elenco com usuário, promoção a organizador e redefinir senha, trocar a própria senha. Sem placar: os times revezam. Todas as rotas, menos `/entrar` e `/auth/*`, exigem login (`proxy.ts`). Tela de notas (`/avaliar/[matchId]`): um jogador por vez, envio em lote por `submitEvaluations` (revalida tudo no servidor; uma única inserção). Publicado na Vercel a partir da `main`. Cartas especiais colecionáveis (Craque da Rodada, Gol da Semana, Bola Murcha) por voto na tela de notas, distribuídas ao fechar a rodada, com temas sazonais (`lib/card-themes.ts`), apresentação do evento do mês na home (prévia das cartas no tema) e coleção no perfil (`#colecao`). Faltam: fechamento automático da rodada (24h), foto do jogador, animação de revelação do OVR. Atualize esta linha quando isso mudar.

**Foco do produto:** é um "fantasy" da pelada: nota, carta, OVR e sorteio. Confirmação de presença e placar ficam no WhatsApp; não construa gestão de pelada além do necessário.

**Design system:** todas as decisões visuais e de UX (tema, paleta, raridade, anatomia da carta, atributos de linha/goleiro, foto, tela de notas, Draft) estão em `.claude/rules/design-system.md` (carregado automaticamente). Leia antes de criar UI.

## 🛠️ Tech Stack
- **Instalado:** Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 5 (`strict`), Tailwind CSS 4, ESLint 9 (flat config), shadcn/ui (base Radix, preset `nova`, ícones Lucide; config em `components.json`), React Hook Form + Zod 4 + `@hookform/resolvers`.
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`, CLI `supabase` como devDependency): projeto remoto "gabhpadilha's Project" (ref `kmpdmbowtkzxmsanddio`, região us-east-1), já linkado. A conta também tem o projeto `vitrine-guaratuba`, que **não** é deste app: nunca rode comandos nele.
- **Planejado** (confira o `package.json` antes de importar): Framer Motion (animação das cartas), Jest + React Testing Library.

## 🗄️ Supabase
- **Clients:** `lib/supabase/server.ts` (Server Components/Actions/Route Handlers, um por requisição), `lib/supabase/client.ts` (browser), `lib/supabase/proxy.ts` (renova a sessão; chamado pelo `proxy.ts` da raiz) e `lib/supabase/admin.ts` (chave secreta `SUPABASE_SECRET_KEY`, **ignora RLS**: só em Server Actions depois de checar que quem chama é organizador; hoje `createPlayer` e `resetMemberPassword`).
- **Login por usuário (`lib/username.ts`):** o Auth exige e-mail, então o usuário vira um e-mail técnico `<usuario>@peladapp.invalid` (domínio reservado, RFC 2606: nunca recebe mensagem). `profiles.username` (único, `^[a-z0-9.]{3,20}$`) guarda o usuário; só o servidor grava (o jogador só pode atualizar `full_name`). `/entrar` aceita usuário ou e-mail. Sem e-mail real não há "esqueci a senha": o organizador usa "Redefinir senha" (nova provisória + troca obrigatória). Se o Supabase um dia recusar o domínio `.invalid` (`email_address_invalid`), troque a constante em `lib/username.ts`.
- **Senha provisória:** `createPlayer` cria a conta com `user_metadata.must_change_password = true`; `requireUserId` redireciona para `/trocar-senha` até a pessoa salvar a própria senha. `app/_actions/set-password.ts` tira a marca; na troca obrigatória (`afterSave="login"`) ele **encerra a sessão** e o cliente mostra o sucesso e vai para `/entrar?senha=criada`, porque o token antigo ainda carrega a marca e redirecionar para `/` fazia a pessoa voltar para `/trocar-senha` com o formulário limpo. Na página da pelada (`afterSave="stay"`) continua logado.
- **Schema:** fonte da verdade em `supabase/migrations/*.sql`; nunca altere o banco pelo dashboard sem criar migration. Grupos (várias peladas) → `group_members` (apelido/posição/foto **por grupo**, papel `organizer`/`player`) → `matches` → `match_attendance` → `evaluations`.
- **Regras garantidas no banco:** só presentes avaliam/são avaliados (FK para `match_attendance`), sem autoavaliação, notas 1–10, só atributos de linha **ou** de goleiro, envio só com rodada `open`, papel só muda via função.
- **Sessão (`lib/session.ts`):** `requireUserId(next)`, `requireActiveMembership(next)` (sem pelada → `/bem-vindo`) e `setActiveGroup` (só em Server Actions). O grupo ativo fica no cookie `peladapp_active_group`; sem ele, vale a pelada mais antiga.
- **Auth:** senha, contas criadas já confirmadas pelo admin (`email_confirm: true`). Não há envio de e-mail no fluxo (o SMTP padrão só entrega para a equipe, 2/hora). As funções `get_invite`/`join_group` e `/auth/confirm` ficaram sem uso na UI.
- **`createClient()` chama `await connection()`:** com Partial Prefetching o Next pré-renderiza com cookies, e o `getClaims()` lê `Date.now()` ("blocking-prerender-current-time"). Não remova.
- **Rodadas:** criar sempre por `create_match(grupo, data, membros[], times[])` (rodada + presença + time de cada um, atômico, `security invoker`, mínimo 2). Sorteio em `lib/draft.ts` (goleiros um por time, linha pelo OVR equilibrando soma e tamanho). Fechar = `update matches set status = 'closed'` pelo organizador. Placar existe no schema, mas não é usado.
- **Cartas especiais:** votos em `round_votes` (anônimos: cada um só lê os próprios; só presentes, sem votar em si, só com rodada `open`; upsert permitido). Fechar rodada = **`close_match(rodada, tema)`**, que fecha e chama `compute_match_awards` na mesma transação; as cartas vão para `awards` (foto congelada: posição, OVR e atributos em jsonb, com +1 para Craque/Gol). A conta do OVR na função espelha `lib/ovr.ts`, e o bônus espelha `lib/award-bonus.ts` (prévia da home): mudou um, mude o outro. `award_card_value` usa CASE porque `least()` ignora NULL (viraria 99). Ninguém insere em `awards` direto.
- **Organizadores:** `set_member_role` (só organizador chama; nunca deixa a pelada sem organizador).
- **Avaliações são anônimas:** cada um só lê as notas que deu. Médias vêm de `get_group_scores(grupo)` (só rodadas fechadas, sem avaliador) e envios de `get_match_submissions(grupo)`. Entrar/criar grupo só por `join_group`/`create_group`/`get_invite`.
- **Advisors** (`npx supabase db advisors --linked`): os avisos `*_security_definer_function_executable` das funções `security definer` (`create_group`, `join_group`, `get_invite` (também `anon`, para a tela de cadastro), `get_group_scores`, `get_match_submissions`, `is_group_member`, `is_group_organizer`, `set_member_role`, `close_match`) são **intencionais** (cada uma confere o membro por dentro). Ative "leaked password protection" se o plano permitir. Qualquer outro aviso novo precisa ser tratado. Função de trigger nova: revogue `execute` de `public, anon, authenticated`.
- **Jogadores fictícios para teste:** `supabase/scripts/seed-test-players.sql` (12 jogadores sem senha, marcados com `raw_user_meta_data.seed = true`, e 4 rodadas fechadas com notas só entre eles) e `cleanup-test-players.sql` (desfaz). Rode com `npx supabase db query --linked -f <arquivo>`; **não são migrations**. Em 2026-10-18 o banco real foi zerado para uso com a galera: ficaram só a conta do organizador principal e a pelada (sem rodadas). Não rode o seed no banco real de novo. Ao inserir em `auth.users` por SQL, os tokens (`confirmation_token`, `recovery_token`, `email_change_token_new`, `email_change`) precisam ser `''`, não NULL.
- **Consultar o banco remoto:** `npx supabase db query --linked "<sql>"` (prefira contagens; não despeje dados pessoais).
- **Validar migration sem Docker:** o schema foi testado com PGlite simulando `auth.users`/`auth.uid()`; repita esse teste ao mudar RLS.
- **shadcn:** adicionar componentes com `npx shadcn@latest add <nome>` (vão para `components/ui/`). O `cn` vem do pacote `cn` (reexportado em `lib/utils.ts`), não de clsx/tailwind-merge. Tokens de tema ficam em `app/globals.css`.
- **Instalar Zod/RHF:** use `npm install zod@^4 ...`; sem fixar o Zod o npm dá ERESOLVE por causa do peer opcional do `@hookform/resolvers`.

## 💻 Ambiente & Comandos
Desenvolvimento no VS Code + WSL (Ubuntu), com Node 20 via nvm. Se o Claude rodar no Windows sobre `\\wsl.localhost\...`, `git`/`node`/`npm` não estão no PATH do Windows. Rode-os pelo WSL, com shell interativo para o nvm carregar:
`wsl.exe -d ubuntu-26.04 --cd /home/gabriellinux/projetoFut/peladApp -- bash -ic "npm run lint"`

- `npm run dev`: servidor local (porta 3000)
- `npm run build` / `npm start`: build e servidor de produção
- `npm run lint`: ESLint CLI (`next lint` não existe mais no Next 16, e o `next build` não roda lint)
- `npm run type-check`: `tsc --noEmit`
- `npx next typegen`: gera em `.next/` os helpers globais de rota (`PageProps`, `LayoutProps`, `RouteContext`), usados sem import (ex: `app/layout.tsx`). Num clone limpo ou após apagar `.next`, rode antes do `type-check` (ou suba o `dev`); senão o `tsc` falha com `Cannot find name 'LayoutProps'`.
- Ainda não há test runner nem script `test`.
- `npx supabase migration new <nome>` → editar o SQL → `npx supabase db push --dry-run` → `npx supabase db push`.
- `npm run db:types`: regenera `types/database.ts` (tipos do banco, usados nos clients) depois de toda migration. Não edite esse arquivo à mão.
- O CLI precisa de `npx supabase login` feito no WSL; o token fica no keyring da sessão.

## 🏗️ Architecture
- **Rotas:** App Router em `app/`, agrupadas por `(grupo)/` (ex: `(auth)`, `(dashboard)`). Cada rota segue `page.tsx` (Server Component) + `_components/` + `_actions/` + `_data-access/`, conforme `.claude/rules/rules-global.md` (carregado automaticamente).
- **Código compartilhado fica na raiz.** Não existe `src/`; o alias `@/*` aponta para a raiz (README e regras já usam `components/`):
  - `components/ui/`: primitivos do shadcn/ui
  - `components/`: componentes de feature usados por mais de uma rota (ex: `player-card.tsx`, `draft-board.tsx`)
  - `lib/`: clients do Supabase, cálculo de OVR e algoritmo do Draft
  - `types/`: tipos globais (`Player`, `Match`, `Rating`) e schemas Zod compartilhados
- **Server Components por padrão;** `'use client'` só nas folhas da árvore (framer-motion, hooks, eventos, APIs do browser).
- **Mutações:** exclusivamente via Server Actions (no `_actions/` da rota). NUNCA chamar o Supabase/DB direto em Client Components.
- **Cache Components ligado** (`cacheComponents` + `partialPrefetching` em `next.config.ts`), o que muda o modelo de dados:
  - Nada é cacheado por padrão; cache é opt-in com `"use cache"` + `cacheLife`/`cacheTag`.
  - Componente que lê `cookies()`, `headers()`, `params`, `searchParams` ou dado não cacheado (ex: query ao Supabase) precisa de um `<Suspense>` acima dele; senão o Next acusa "blocking route" e o build pode falhar.
  - `"use cache"` não pode chamar `cookies()`/`headers()`: leia fora e passe o valor como argumento (ou use `"use cache: private"`). Como o client server-side do Supabase lê cookies, UI que depende da sessão faz streaming atrás de `<Suspense>`. Guia: `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`.
  - A navegação mantém a rota anterior montada em `<Activity mode="hidden">`: estado de formulário sobrevive ao voltar, e os effects são limpos ao esconder e recriados ao reaparecer.
  - `<Link>` pré-carrega só o App Shell estático da rota; o que depende de `params`/`searchParams` carrega após a navegação, a menos que o link use `prefetch={true}`.
- **Tailwind entra por um loader do Turbopack** (`turbopack.rules['*.css']` → `@tailwindcss/turbopack`), sem `postcss.config`. Não adicione PostCSS nem rode com `--webpack`: o CSS deixaria de ser processado.

## ✍️ Code Style
- NEVER use `any` explícito — usar `unknown` + type guard.
- Imports: ES modules (import/export), sem require().
- Tailwind only — sem CSS inline, sem styled-components.
- Tailwind 4 é CSS-first: não existe `tailwind.config.ts`. Novos design tokens (ex: cores de raridade das cartas) vão no bloco `@theme` de `app/globals.css`.
- Nomes de arquivo em kebab-case (`player-card.tsx`); componentes em PascalCase (`PlayerCard`).

## 🔐 Environment Variables
- `NEXT_PUBLIC_*` apenas para chaves públicas do Supabase no client.
- Segredos (Supabase Service Role Key) apenas no servidor: Server Actions, Route Handlers e `_data-access/`.
- Copiar `.env.example` para `.env.local` ao configurar o ambiente (o `.gitignore` ignora `.env*`, exceto `.env.example`).

## 🔄 Workflow
- ALWAYS run `npm run type-check && npm run lint` após uma série de mudanças.
- Quando o Jest estiver configurado: rodar um teste por vez, não a suíte completa (`npm run test -- NomeDoArquivo`).
- Branch naming: `feat/`, `fix/`, `chore/` + descrição em kebab-case.
- Commits em inglês, imperativo: "add player rating mutation".

## ⚠️ Common Gotchas (Next 16)
- `middleware.ts` virou `proxy.ts`: fica na raiz (mesmo nível de `app/`), exporta `function proxy` e roda só em Node. É onde proteger rotas logadas com Supabase Auth.
- `params`, `searchParams`, `cookies()` e `headers()` são Promises: sempre `await`. Tipar páginas com `PageProps<'/rota/[id]'>`.
- `revalidatePath()` e `revalidateTag()` só funcionam em Server Actions/Route Handlers; `updateTag()` só em Server Actions. `revalidateTag(tag, 'max')` agora exige o 2º argumento. Use `updateTag(tag)` quando o usuário precisa ver a própria mudança na hora (ex: OVR após enviar as notas).
- Supabase no server: `@supabase/ssr` com `createServerClient` (cookies via `await cookies()`). No client: `createBrowserClient`.
- Imagens externas (ex: fotos de perfil no Supabase Storage) precisam de `images.remotePatterns` no `next.config.ts`.
- Editando de fora do WSL, o `next dev` às vezes continua servindo o `globals.css` antigo (cache do loader do Tailwind): as classes novas aparecem, mas as variáveis de `:root` ficam velhas. Se token novo não aparecer, confira com `npm run build` (ou `npx next start -p 3100` para ver) e reinicie o dev.
