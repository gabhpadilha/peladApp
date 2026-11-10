# Auditoria de segurança e performance (2026-11-12)

Pedido do dono do app: inspeção **só de leitura**, sem mudar visual nem funções. Nada foi alterado no código nesta etapa.
Feita sobre a `main` na versão 3.29.0, com leitura do código, das migrations e `npm audit`. Sem acesso ao banco de produção.
O que não deu para ver daqui (configuração real do Supabase e da Vercel) está em "Para conferir".

## O que está bem (não mexer)
- **Autorização nas ações do servidor:** toda Server Action passa por `requireActiveMembership`/`requireUserId`, e as de administração por `getPlatformAdminId`. As que usam a chave secreta checam dono da pelada ou a própria conta e **filtram sempre por `group_id`** da sessão (sem IDOR).
- **Chave secreta:** só em arquivos com `server-only`; as únicas variáveis públicas são URL e chave publicável do Supabase, o site e o e-mail de contato. Nada de segredo versionado (só `.env.example`).
- **Banco:** as 25 tabelas têm RLS; nenhuma policy com `using (true)` nem acesso direto de `anon`; as 61 funções `security definer` revogam `public`/`anon` e só liberam `authenticated` (cada uma confere o membro por dentro); as policies usam `(select auth.uid())` (sem reavaliar por linha).
- **Redirecionamento:** `next` do login passa por `getSafeRedirectPath` (bloqueia `//` e `/\`). Sem `dangerouslySetInnerHTML`, `eval` ou `child_process`.
- **Upload de foto:** tipo (PNG/JPEG/WebP) e tamanho (3 MB) validados no servidor e a imagem é reprocessada com `sharp`.
- **Login:** mensagens genéricas ("Usuário ou senha incorretos"), tratamento do limite de tentativas do Supabase.
- **Índices:** todas as chaves estrangeiras relevantes têm índice (ver o que falta abaixo; é pouco e de tabelas pequenas).
- **Bundle:** maior chunk de 72 KB gzip (framework), 647 KB gzip somando todas as rotas; `three` só existe em `scripts/` (não vai para o app); fontes por `next/font`; imagens `.webp`.
- **Políticas de função da comunidade e do Mercado** foram testadas (PGlite, mais de 300 verificações no total).

## Achados e correções propostas (todas sem mudar visual nem comportamento)

### Alta prioridade
1. **[Performance/corretude] Limite de 1000 linhas do Supabase pode cortar as notas em silêncio.** `getGroupEvaluations` lê `get_group_scores` numa chamada só; o PostgREST devolve no máximo 1000 linhas (`max_rows`, padrão). Cada rodada gera ~70 a ~150 linhas (10 a 14 presentes, já descontadas as notas aparadas): a partir de **~7 a 14 rodadas** o OVR, o ranking, o XP e os prêmios passariam a ser calculados com parte das notas, sem erro. Correção: paginar com `.order("evaluation_id").range(...)` até acabar (mesmo resultado, só completo). O mesmo cuidado vale para `get_member_submissions` e `match_goals` (mais longe: ~70 rodadas).

### Média prioridade
2. **[Segurança] Faltam cabeçalhos de segurança** (só o `sw.js` tem). Adicionar `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy` (sem restringir a câmera, que o "Tirar foto" usa). CSP: só em modo `Report-Only` primeiro (o Next injeta scripts inline; bloquear de cara quebraria telas).
3. **[Segurança] 6 avisos do `npm audit` (4 moderados, 2 baixos), todos na cadeia do `shadcn` (CLI de componentes).** É ferramenta de desenvolvimento listada em `dependencies`. Correção: mover para `devDependencies` (não vai para o servidor; o build continua igual).
4. **[Performance] Imagens e vídeo estáticos sem cache longo.** Os arquivos de `public/` saem com `max-age=0, must-revalidate` na Vercel: cada carta (146 arquivos em `/cartas`) é revalidada a cada visita. Correção: `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` para `/cartas`, `/mesa`, `/rarity`, `/icons` e `/patch-notes`. Efeito colateral: arte trocada com o mesmo nome pode levar até 1 dia para aparecer (decisão do dono).
5. **[Performance] A Home espera a liga carregar para só então buscar o bônus de boas-vindas e os objetivos.** Os dois só precisam da sessão (já em cache): dá para disparar junto com `getLeague` e economizar uma ida ao banco (~100 a 200 ms por abertura da Home).

### Baixa prioridade / para decidir
6. **[Segurança/custo] `segmentPhoto` (recorte de foto) não tem limite de uso por conta.** Qualquer jogador logado pode chamar várias vezes e gastar a cota gratuita do Hugging Face e do remove.bg (50 por mês). Correção possível: limite diário por conta (precisa de uma tabela pequena = mudança no banco; fica para decidir).
7. **[Segurança] `ratings_open(uuid)`** devolve um verdadeiro/falso sobre qualquer rodada se a pessoa souber o UUID. Impacto praticamente nulo (UUID não adivinhável); sem ação.
8. **[Banco] Índices que faltam**, todos em tabelas pequenas: `awards(group_id)`, `feed_posts(group_id|member_id|award_id)`, `market_listings(buyer_member_id|seller_group_id)`, `goal_choices(option_key)`. Sem urgência (criar quando as tabelas crescerem; precisa de migration).
9. **[Performance] `revalidatePath("/", "layout")` em várias ações** refaz o app inteiro depois de cada compra/venda. Trocar por revalidação por rota economiza servidor, mas arrisca tela desatualizada; só depois de medir.
10. **[Performance] `counted_evaluations` é recalculada a cada leitura** (e de novo no fechamento da rodada). Com mais rodadas vai pesar; avaliar guardar o resultado ao fechar. É mudança de banco maior: só quando houver medida.

## Para conferir (não deu para ver daqui)
- **Configuração real do Supabase:** `Max Rows` do API (se alguém aumentou, o item 1 some por um tempo), proteção de senha vazada ("leaked password protection") e política de senha, e-mail confirmado, limites de taxa do Auth.
- **Quantas linhas as notas já têm:** consulta sugerida no SQL Editor (conta as notas brutas por pelada; as válidas são essas menos ~2 por jogador por rodada):
  `select m.group_id, count(*) from public.evaluations e join public.matches m on m.id = e.match_id group by 1;`
- **Cabeçalhos em produção:** conferir com o navegador (aba Rede) o que a Vercel já adiciona (HSTS costuma vir da própria Vercel).
- **Backups e acesso:** quem tem acesso ao painel do Supabase e da Vercel, e se o plano tem backup diário.
