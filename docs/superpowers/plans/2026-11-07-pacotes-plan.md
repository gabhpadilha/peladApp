# Plano de construção dos pacotes (2026-11-07)

Base: `docs/superpowers/specs/2026-11-07-pacotes-design.md` (aprovado). Simulação de referência: `docs/superpowers/specs/2026-11-07-pacotes-simulacao/simulate.mjs`. Protótipo da abertura: branch `spike/pacote-animacao` (`app/auth/previa/pacote/pack-lab.tsx`, modo `pure` da `CanchaCard`).

**Meta:** funcionar em produção **a partir de 1/12/2026**, testada durante novembro numa pelada de teste, sem afetar quem joga hoje.

**Regras do projeto que valem aqui:** migration só aplicada em produção depois do ok do dono; pedir prévia visual das telas novas; nada de `filter`/`mix-blend-mode`/`backdrop-filter` dentro da carta (iPhone); textos em pt-BR; commits em inglês; `type-check` e `lint` antes de cada push; atualizar `CLAUDE.md` e `design-system.md`.

## Etapa 0: interruptor (para testar sem risco)
- Coluna `groups.packs_enabled boolean not null default false` e o mínimo `groups.pack_min_players integer not null default 10`. Só o painel de admin liga (`app/admin`, campo no cartão da pelada). Em 1/12 o admin liga para as peladas reais.
- Nada do que vem abaixo faz efeito em pelada com `packs_enabled = false` (o fechamento da rodada segue exatamente como hoje).
- **Pronto quando:** teste de isolamento mostra que fechar rodada em pelada desligada não cria pacote e que o jogador não consegue ligar a coluna.

## Etapa 1: banco (migration + testes PGlite)
Tabelas (sem acesso direto para `authenticated`; só funções `security definer`):
- `pack_sets (month text, design text, rarity text, skin text, versions...)`: o conjunto do mês (design = arte-base; skin = a versão sorteável). Chave por mês e skin; coluna `design` agrupa recolores.
- `pack_tier_odds (tier text, rarity text, weight numeric)`: a tabela de chances por faixa (dado, não código).
- `packs (id, group_id, member_id, match_id, month, tier, rarity, skin, sealed_at, opened_at, was_duplicate, coins_awarded)`: um por jogador presente por rodada elegível. Sem policy de leitura (a skin lacrada não pode vazar).
- Posse da skin: reaproveitar `card_skin_purchases` com `price = 0` e coluna `source` (`shop` | `pack`), mantendo `unique(member_id, skin)`.
Funções:
- `draw_round_packs(target_match)`: chamada **dentro de `close_match`, na mesma transação**, só se `groups.packs_enabled` e `presentes ≥ pack_min_players`. Calcula as faixas (A: 1º e empatados; B: 2º e 3º; D: 30% de baixo, mais quem ficou sem nota; C: o resto) a partir da nota da rodada; aplica a proteção contra azar (peso `1 + (M−1)·t²`, M = 20, `t` = dia da rodada ÷ dias do mês; só para designs que ainda não saíram na pelada no mês) e a garantia dos últimos 7 dias (teto 30% dos pacotes da rodada); sorteia e grava os pacotes lacrados. Trava por pelada (`pg_advisory_xact_lock`) para duas rodadas fechando juntas.
- `get_my_packs()`: devolve os pacotes do jogador (faixa, rodada, mês, chance real, aberto ou não); a skin só aparece se já aberto.
- `open_pack(target_pack)`: marca aberto, concede a skin (ou marca repetida e registra as moedas: 10/20/50/100), devolve o resultado. Idempotente.
- `count_my_unopened_packs()`: para o pontinho do menu.
- `get_pack_odds(target_pack)`: as chances reais daquele pacote lacrado (base e com a proteção).
Testes (em `supabase/tests/packs/`, PGlite): faixas com 10, 11, 16 e 30 jogadores, empate, jogador sem nota; sigilo (jogador não lê skin lacrada, nem de outro); abrir duas vezes devolve o mesmo; repetida vira moedas certas; pelada desligada e rodada abaixo do mínimo não geram pacote; exclusão de rodada fechada remove os lacrados e mantém as reveladas; **paridade estatística com `simulate.mjs`** (rodar milhares de meses no PGlite e comparar a taxa de saída da lendária e de todos os designs com a simulação, dentro de uma margem).
- **Pronto quando:** testes passam; migration revisada; aplicada em produção só com o ok do dono (desligada).

## Etapa 2: servidor do app
- `lib/packs.ts` (tipos, nomes das faixas, textos das chances) e `app/loja/_data-access/get-my-packs.ts`.
- Actions: `openPack(id)` e `openAllPacks()` (em sequência).
- Moedas: somar as das repetidas em `lib/progression.ts` (hoje derivadas do histórico) a partir de `packs` abertos, e espelhar onde o saldo é lido; o saldo da Loja não pode divergir.
- `AppHeader` passa a contagem de pacotes ao `MainNav` (sem atrasar a navegação; `cache` por requisição).
- **Pronto quando:** `type-check` e `lint` passam; saldo de CC bate em teste com pacotes abertos.

## Etapa 3: telas (com prévia no celular antes de cada uma)
1. **Pontinho âmbar no ícone da Loja** (barra de baixo e menu do computador; número a partir de 2).
2. **Loja → Meus pacotes** (topo): cartões dos pacotes guardados com nome da faixa, rodada, mês e chances; abrir um ou todos em sequência.
3. **"Sua rodada" para todo jogador que jogou:** "Você ganhou o Pacote [nome]" com **Abrir agora** e **Guardar** (hoje a tela só aparece para quem ganhou prêmio).
4. **A abertura:** portar o protótipo aprovado para componente real: carta de costas e luz assadas em imagem (nada de `filter` ou `mix-blend-mode` na carta), modo `pure` da `CanchaCard`, raridade, chance real, repetida e proteção de azar; versão sem animação para movimento reduzido; vibração onde houver.
5. **Eu → Minhas cartas:** skins de pacote com a raridade.
- **Pronto quando:** o dono aprova cada prévia; sem rolagem lateral; testado no WebKit.

## Etapa 4: conteúdo e testes em novembro
- Conjunto **provisório** para teste (skins que já existem, com raridades de teste) numa pelada de teste com 12 jogadores fictícios e `packs_enabled` ligado; rodar rodadas de teste, abrir pacotes, conferir sigilo, faixas, repetidas e pontinho.
- **Conjunto real de dezembro** (quais skins e raridades; design-base único das premiações; repaginação do Natal) é a fase de designs, depois da funcionalidade.
- **Pronto quando:** o dono usa a pelada de teste e aprova.

## Etapa 5: lançamento (1/12)
- Inserir o conjunto real de dezembro em `pack_sets` (dados), conferir o mínimo de cada pelada e ligar `packs_enabled` pelo painel nas peladas reais. Subir versão (função nova: `3.21.0`), documentar em `CLAUDE.md`, `design-system.md` e `docs/calendario-eventos.md`, e avisar a galera.
- Para a Fut de Quinta, que não tem limite de rodadas, vale o mesmo mínimo de 10.

## Riscos e como mitigar
- **Proteção contra azar mal calibrada:** a paridade com a simulação e o interruptor por pelada permitem ajustar `M` ou as chances (dados) sem refazer o app.
- **Fechar rodada quebrar por causa do sorteio:** o sorteio roda na mesma transação; falha derruba o fechamento. Mitigação: testes e a pelada desligada por padrão; em caso de problema em produção, desligar `packs_enabled` volta ao comportamento atual.
- **Spoiler da skin lacrada:** sem policy de leitura e sem a skin nas funções de listagem.
- **Moedas divergentes:** uma única fonte de cálculo, testada.
- **Formatos futuros (society, campo):** o mínimo por pelada já é parâmetro; as faixas são percentuais, então valem para qualquer tamanho.
