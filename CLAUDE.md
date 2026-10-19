# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Regras do Next.js mantidas pelo `next dev` (ler a doc da versão instalada antes de escrever código Next):
@AGENTS.md

## ⚽ Contexto do Projeto
O PeladApp é uma aplicação web full-stack para gamificar o futebol de salão (futsal) semanal: avaliações pós-jogo (linha: Velocidade, Chute, Passe, Drible, Defesa, Físico; goleiro tem atributos próprios), cartinhas dinâmicas estilo "Ultimate Team" com OVR atualizado e um sorteio inteligente (Draft) que equilibra os times pelo OVR dos jogadores.

Design mobile-first é inegociável: a interação principal (dar notas no vestiário) acontece no celular.

**Estado atual:** tudo lê o Supabase (não há mais mocks). Home (`/`) e atleta (`/jogadores/[memberId]`) leem de `lib/league.ts`; OVR e atributos são sempre calculados das avaliações (`lib/ovr.ts`, `lib/players.ts`). Contas: **só o dono da pelada cria e gerencia**, em `/elenco`, por **nome de usuário, sem e-mail** (senha gerada via chave secreta, sem troca obrigatória: o jogador troca se quiser em "Sua senha"; "Redefinir senha" no elenco). Não existe mais link de convite/cadastro. Login por usuário (ou e-mail, nas contas antigas) e senha (`/entrar`), "Sair" na navbar. `/bem-vindo` cria a pelada (só o 1º organizador) e leva ao `/elenco`. A antiga `/pelada` virou duas páginas (`/pelada` redireciona para `/rodadas` em `next.config.ts`): **`/rodadas`** (atração principal: nova rodada com data + confirmados do WhatsApp + **sorteio dos times pelo OVR**, lista de rodadas e fechar rodada) e **`/elenco`** (gestão de cadastro: cadastrar jogador e painel "Gerenciar" só do dono, com editar dados, promoção a organizador, redefinir senha e desativar/reativar; "Seu perfil" e "Sua senha" para todos). Sem placar: os times revezam. Todas as rotas, menos `/entrar` e `/auth/*`, exigem login (`proxy.ts`). **Mesa tática (`/rodadas/[matchId]`)**: a partida em campo (Branco x Preto, 1-2-1, titulares e reservas com as cartas completas), aberta ao criar a rodada; dá para avaliar tocando nas cartas e enviar com os votos (`app/rodadas/[matchId]/`, `lib/formation.ts`, `lib/rating-drafts.ts`). Tela de notas passo a passo (`/avaliar/[matchId]`): um jogador por vez, envio em lote por `submitEvaluations` (revalida tudo no servidor; uma única inserção). Publicado na Vercel a partir da `main`. Cartas especiais colecionáveis (Craque da Rodada, Gol da Semana, Bola Murcha) por voto na tela de notas, distribuídas ao fechar a rodada, com temas sazonais (`lib/card-themes.ts`), apresentação do evento do mês na home (prévia das cartas no tema) e coleção em página própria. O atleta tem duas abas: **Estatísticas** (`/jogadores/[id]`: próxima faixa, destaques, atributos x média da pelada via `lib/athlete-insights.ts` e `getTierProgress`) e **Coleção** (`/jogadores/[id]/colecao`: última conquista, galeria filtrável agrupada por evento). Foto do jogador: **upload pelo app** em `/elenco` ("Sua foto" para cada um; "Gerenciar → Foto" para o dono). A máscara da pessoa vem **do servidor** (action `segmentPhoto`, nessa ordem e tudo gratuito: **BiRefNet Portrait num Space ZeroGPU próprio do Hugging Face** via `lib/hf-matte.ts` com `HF_SPACE_URL`/`HF_TOKEN`, código do Space em `hf-space/`; **remove.bg no plano gratuito** via `lib/remove-bg-matte.ts` com `REMOVE_BG_API_KEY`; e, sem os dois, MODNet local em `lib/person-matte.ts` via `onnxruntime-node`) ou, sem rede, **do aparelho** (MediaPipe `selfie_multiclass_256x256`, WASM e modelo servidos pelo app em `/mediapipe/`); o enquadramento no padrão das cartas do EA FC ("modelo C": ombros na largura toda da carta, do peito para cima), a curva e o resto ficam no aparelho (`lib/photo-cutout.ts`), com prévia na carta (**só a foto sem fundo**: a opção "Original" foi tirada por decisão do dono do app; sem recorte, pede para tentar de novo); `uploadPlayerPhoto` padroniza com `sharp` (WebP 640px) e grava as duas em `player-photos/<memberId>/<timestamp>-{cutout,original}.webp` pela chave secreta, apagando as anteriores. Na carta, filtro suave na cor da moldura (`PhotoTint`). Faltam: fechamento automático da rodada (24h), animação de revelação do OVR. Atualize esta linha quando isso mudar.

**Foco do produto:** é um "fantasy" da pelada: nota, carta, OVR e sorteio. Confirmação de presença e placar ficam no WhatsApp; não construa gestão de pelada além do necessário.

**Design system:** todas as decisões visuais e de UX (tema, paleta, raridade, anatomia da carta, atributos de linha/goleiro, foto, tela de notas, Draft) estão em `.claude/rules/design-system.md` (carregado automaticamente). Leia antes de criar UI.

## 🛠️ Tech Stack
- **Instalado:** Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 5 (`strict`), Tailwind CSS 4, ESLint 9 (flat config), shadcn/ui (base Radix, preset `nova`, ícones Lucide; config em `components.json`), React Hook Form + Zod 4 + `@hookform/resolvers`.
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`, CLI `supabase` como devDependency): projeto remoto "gabhpadilha's Project" (ref `kmpdmbowtkzxmsanddio`, região us-east-1), já linkado. A conta também tem o projeto `vitrine-guaratuba`, que **não** é deste app: nunca rode comandos nele.
- **Planejado** (confira o `package.json` antes de importar): Framer Motion (animação das cartas), Jest + React Testing Library.

## 🗄️ Supabase
- **Clients:** `lib/supabase/server.ts` (Server Components/Actions/Route Handlers, um por requisição), `lib/supabase/client.ts` (browser), `lib/supabase/proxy.ts` (renova a sessão; chamado pelo `proxy.ts` da raiz) e `lib/supabase/admin.ts` (chave secreta `SUPABASE_SECRET_KEY`, **ignora RLS**: só em Server Actions depois de checar quem chama; hoje `createPlayer`, `editPlayer`, `resetMemberPassword`, `setMemberActive` e as fotos `uploadPlayerPhoto`/`removePlayerPhoto`, que aceitam o próprio jogador ou o dono). O bucket `player-photos` não tem policy de escrita: só a chave secreta grava.
- **Login por usuário (`lib/username.ts`):** o Auth exige e-mail, então o usuário vira um e-mail técnico `<usuario>@peladapp.invalid` (domínio reservado, RFC 2606: nunca recebe mensagem). `profiles.username` (único, `^[a-z0-9.]{3,20}$`) guarda o usuário; só o servidor grava (o jogador só pode atualizar `full_name`). `/entrar` aceita usuário ou e-mail. Sem e-mail real não há "esqueci a senha": o dono usa "Redefinir senha" (gera uma senha nova). Se o Supabase um dia recusar o domínio `.invalid` (`email_address_invalid`), troque a constante em `lib/username.ts`.
- **Senha gerada, troca opcional:** `createPlayer` e "Redefinir senha" geram a senha (`lib/temp-password.ts`), e ela vale até o jogador querer trocar em Elenco → "Sua senha" (`app/_actions/set-password.ts`, continua logado). **Não existe troca obrigatória** (decisão do dono do app, 2026-10-19). A antiga `/trocar-senha` dava loop porque o token ainda carregava a marca `must_change_password`; foi removida e redireciona para `/elenco`. Contas antigas podem ter essa marca no `user_metadata`; ela é ignorada.
- **Schema:** fonte da verdade em `supabase/migrations/*.sql`; nunca altere o banco pelo dashboard sem criar migration. Grupos (várias peladas) → `group_members` (apelido/posição/foto **por grupo**, papel `organizer`/`player`) → `matches` → `match_attendance` → `evaluations`.
- **Regras garantidas no banco:** só presentes avaliam/são avaliados (FK para `match_attendance`), sem autoavaliação, notas 1–10, só atributos de linha **ou** de goleiro, envio só com rodada `open`, papel só muda via função.
- **Sessão (`lib/session.ts`):** `requireUserId(next)`, `requireActiveMembership(next)` (sem pelada → `/bem-vindo`) e `setActiveGroup` (só em Server Actions). O grupo ativo fica no cookie `peladapp_active_group`; sem ele, vale a pelada mais antiga.
- **Auth:** senha, contas criadas já confirmadas pelo admin (`email_confirm: true`). Não há envio de e-mail no fluxo (o SMTP padrão só entrega para a equipe, 2/hora). As funções `get_invite`/`join_group` e `/auth/confirm` ficaram sem uso na UI.
- **`createClient()` chama `await connection()`:** com Partial Prefetching o Next pré-renderiza com cookies, e o `getClaims()` lê `Date.now()` ("blocking-prerender-current-time"). Não remova.
- **Rodadas:** criar sempre por `create_match(grupo, data, membros[], times[], reservas[])` (rodada + presença + time e marca de reserva de cada um, atômico, `security invoker`, mínimo 2 titulares). Todo presente tem time: **1 = Branco, 2 = Preto** (`lib/teams.ts`; a função recusa outros números) e `match_attendance.reserve` marca quem começa no banco do seu time (avalia e é avaliado como os outros). Sorteio em `lib/draft.ts` (`draftMatch`: sempre Branco x Preto com 5 titulares sorteados; goleiros um por time e linha pelo OVR equilibrando soma e tamanho; o excedente vira reservas, divididos igualmente entre os dois times). Fechar = `update matches set status = 'closed'` pelo organizador. Placar existe no schema, mas não é usado.
- **Excluir rodada (`deleteMatch`):** qualquer organizador exclui uma rodada criada errada, aberta ou fechada (policy "matches: organizador apaga", sem migration). A cascata do banco leva presenças, notas, votos e cartas especiais dela, e o OVR/ranking de todos é recalculado sem a rodada (por isso a confirmação avisa). A numeração segue `max(round)+1`: excluir a última reaproveita o número; excluir uma do meio deixa um buraco.
- **Cartas especiais:** votos em `round_votes` (anônimos: cada um só lê os próprios; só presentes, sem votar em si, só com rodada `open`; upsert permitido). Fechar rodada = **`close_match(rodada, tema)`**, que fecha e chama `compute_match_awards` na mesma transação; as cartas vão para `awards` (foto congelada: posição, OVR e atributos em jsonb, com +1 para Craque/Gol). A conta do OVR na função espelha `lib/ovr.ts`, e o bônus espelha `lib/award-bonus.ts` (prévia da home): mudou um, mude o outro. `award_card_value` usa CASE porque `least()` ignora NULL (viraria 99). Ninguém insere em `awards` direto.
- **Permissões (decisão do dono do app):**
  - **Dono da pelada** (`groups.created_by`, `membership.isOwner`, `is_group_owner`): é o único que gerencia pessoas. Cadastra (`createPlayer`), edita qualquer cadastro (`editPlayer`), redefine senha, desativa/reativa (`set_member_active`) e promove/rebaixa organizador (`set_member_role`). É sempre organizador.
  - **Organizador promovido:** só cria e fecha rodadas. Não mexe no cadastro de ninguém.
  - **Todo jogador:** edita só o próprio nome e apelido (`updateOwnProfile`, card "Seu perfil") e a própria senha. Posição e usuário ficam com o dono.
  - **No banco:** a policy de update de `group_members` aceita a própria linha ou o dono; o trigger `guard_member_self_update` impede trocar a própria posição; delete só pelo dono.
- **Editar jogador (`editPlayer`):** nome, apelido, posição e usuário (troca o e-mail técnico no Auth; a senha continua). Linha ↔ goleiro só antes da primeira nota recebida.
- **Desativar jogador (não existe excluir):** `group_members.deactivated_at`, só por `set_member_active` (dono; ninguém se desativa; organizador desativado volta como jogador). `setMemberActive` também bloqueia o login no Auth (`ban_duration`) e desbloqueia ao reativar. `is_group_member`/`is_group_organizer` só contam ativos; o desativado lê só a própria linha (`lib/session.ts` manda para `/conta-desativada`) e não envia nota nem voto. O histórico fica: as notas dele continuam no OVR dos outros, e ele continua em rodadas antigas, cartas e perfil (`league.players`), mas sai do ranking (`league.activePlayers`), do elenco, do sorteio e de rodadas novas (`create_match` recusa).
- **Avaliações são anônimas:** cada um só lê as notas que deu. Médias vêm de `get_group_scores(grupo)` (só rodadas fechadas, sem avaliador) e envios de `get_match_submissions(grupo)`. Entrar/criar grupo só por `join_group`/`create_group`/`get_invite`.
- **Advisors** (`npx supabase db advisors --linked`): os avisos `*_security_definer_function_executable` das funções `security definer` (`create_group`, `join_group`, `get_invite` (também `anon`, para a tela de cadastro), `get_group_scores`, `get_match_submissions`, `is_group_member`, `is_group_organizer`, `set_member_role`, `set_member_active`, `is_group_owner`, `close_match`) são **intencionais** (cada uma confere o membro por dentro). Ative "leaked password protection" se o plano permitir. Qualquer outro aviso novo precisa ser tratado. Função de trigger nova: revogue `execute` de `public, anon, authenticated`.
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
- `HF_SPACE_URL` e `HF_TOKEN` (servidor, opcionais): endereço do Space de recorte (`https://<usuario>-peladapp-recorte.hf.space`) e token **Read** do Hugging Face (o Space é privado; com o token, a cota grátis é de 5 min de GPU por dia). Passo a passo em `hf-space/README.md`. Mudou `hf-space/app.py`? Reenvie os arquivos ao Space.
- `REMOVE_BG_API_KEY` (servidor, opcional): chave do remove.bg para o recorte de fundo. **O projeto é sem custos:** só o plano gratuito (50 chamadas/mês, `size=preview`); nunca troque por API paga. Sem a chave, ou com a cota do mês esgotada (402), o recorte cai no MODNet local, bem pior em foto escura. Fica no `.env.local` e nas variáveis da Vercel.
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
- **Recorte de fundo, decisão do dono do app (2026-10-19): nada pago.** Ordem: Space ZeroGPU com BiRefNet → remove.bg grátis → MODNet local (pesquisa das opções em `docs/pesquisa-recorte-gratuito.md`). ZeroGPU grátis exige conta com e-mail verificado e mais de 30 dias (até 2 Spaces); Space parado dorme e leva minutos para acordar, então a 1ª foto depois de dias sem uso cai na reserva (limite de 20s em `lib/hf-matte.ts`). Spaces Gradio/Docker em CPU exigem plano pago: não use. O BiRefNet não roda na Vercel: o lite em ONNX pede entrada fixa de 1024px, ~7GB de memória e ~15s de CPU (o teste chegou a derrubar o WSL). fal.ai e Photoroom são pagos. **Atenção:** o remove.bg anunciou que a partir de 1º/12/2026 a remoção de fundo passa para a Leonardo.Ai; se o plano gratuito acabar, o app segue no MODNet sem erro, mas o recorte piora.
- **`onnxruntime-node` (recorte no servidor):** o `.npmrc` pula o download do CUDA (`onnxruntime-node-install=skip`). O `next.config.ts` inclui à mão no pacote de `/elenco` o modelo (`models/`) e a `libonnxruntime.so.1` (o rastreio não enxerga nenhum dos dois) e corta os binários de macOS/Windows/ARM; a função fica com ~105MB (limite da Vercel: 250MB). Atualizar o pacote: confira de novo o `.nft.json` de `/elenco`.
- **Bug visual só no iPhone:** reproduza no WebKit do Playwright (motor do Safari). No Ubuntu 26.04 ele não é suportado oficialmente: instale com `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright install webkit`, copie `libicu74`, `libxml2` e `libvpx9` do Ubuntu 24.04 (extraídos dos `.deb`, sem sudo) para `~/.cache/ms-playwright/webkit-*/minibrowser-wpe/sys/lib/` e rode com `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`. Na carta, evite `mix-blend-mode` sobre camadas com `mask-image`: o WebKit pinta o retângulo da camada.
- Editando de fora do WSL, o `next dev` às vezes continua servindo o `globals.css` antigo (cache do loader do Tailwind): as classes novas aparecem, mas as variáveis de `:root` ficam velhas. Se token novo não aparecer, confira com `npm run build` (ou `npx next start -p 3100` para ver) e reinicie o dev.
