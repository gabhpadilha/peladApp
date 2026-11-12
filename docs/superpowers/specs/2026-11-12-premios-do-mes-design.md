# Prêmios do mês em pacotes (design, 2026-11-12)

Conversa com o dono do app em 2026-11-12. **Ainda sem código.** Falta confirmar os dois pontos em aberto, no fim deste arquivo.

## Decisões do dono do app

- **Premiar só o ranking de pontos do mês** ("para não ficar uma salada de frutas"). O maior OVR do mês e o artilheiro do mês **ficaram de fora por enquanto** (com eles saíram a regra de mínimo de 3 notas e o selo "Elegível" no ranking).
- **Pacotes com várias skins**, uma dinâmica nova:
  - **Pacote de 4 skins** para o 1º do mês (Campeão do Mês);
  - **Pacote de 3 skins** para os outros premiados de cima.
- **Sem repetir dentro do mesmo pacote:** um pacote de 4 traz 4 skins diferentes. Pode vir uma skin que o jogador já tem; ela vira **cópia extra** (vender no Mercado ou na venda rápida), como nos pacotes de rodada.
- **Só como prêmio do mês:** esses pacotes **não entram na Loja**.
- **Abertura:** a mesma animação de hoje (rasga, palco, carta girando), mostrando **a skin de maior raridade**; depois, uma tela nova **"O que veio no pacote"** com as skins lado a lado, ordenadas da mais rara para a mais comum.
- **Empate:** quem empata numa posição leva o prêmio dela (dois empatados em 1º levam os dois o pacote de 4).
- **Premiar também o resto do ranking**, com prêmios menores, no jeito das rodadas.
- **A carta do Campeão do Mês continua**, junto com o pacote de 4: a carta é o troféu da Coleção e conta nas estatísticas. Em dezembro todos os prêmios individuais usam a mesma carta-base (vermelha de Natal com medalhão de ícone), decisão de 2026-11-09.

## Tabela (aprovada pelo dono do app em 2026-11-12)

| Posição no ranking de pontos do mês | Prêmio |
| --- | --- |
| 1º (Campeão do Mês) | Pacote de 4 skins diferentes |
| 2º e 3º | Pacote de 3 skins diferentes |
| Resto, até 30% de cima | 1 pacote da faixa A (Craque) |
| Meio | 1 pacote da faixa B (Destaque) |
| 30% de baixo | 1 pacote da faixa C (Pelada) |

- Só entra quem jogou no mês, **sem mínimo de rodadas** (decisão do dono do app: "a soma de pontos já elimina quem joga poucas vezes").
- Skins dos pacotes de 3 e 4 sorteadas pelas chances da **faixa Craque**, do conjunto do mês (`pack_sets`).
- **Entrega:** ao fechar a rodada da **última quinta** do mês, junto com o Time do Mês e a carta do Campeão (`compute_match_awards` / `close_match`). Em Loja → Meus pacotes aparecem como "Prêmio do mês".
- **Economia:** cada jogador já ganha pacote por rodada, pelos objetivos e pode comprar na Loja; mais pacotes = mais repetidas e mais CanchaCoins pela venda rápida. A tabela acima é contida de propósito; se ficar mais generosa, revisar `QUICK_SELL_COINS`.

## Como implementar (resumo técnico)

1. **Banco (migration nova, depende da `20261114120000_spare_copies.sql`):** `packs` passa a guardar mais de uma skin (coluna `size` e uma tabela `pack_items` com as skins sorteadas, ou um array), `packs.source = 'monthly'`; sorteio sem repetição dentro do pacote; `open_pack` devolve todas e grava a posse (cópia extra quando o jogador já tem); entrega dentro do fechamento da última quinta, pelo ranking de pontos do mês (o mesmo de `lib/ranking-points.ts` / `compute_match_awards`). Teste em PGlite como os outros (`supabase/tests/`).
2. **App:** `lib/packs.ts` e `get-my-packs` com o tamanho e a lista de skins; `PackOpener` mostra a mais rara na animação e, no fim, a tela "O que veio no pacote" (componente novo); Meus pacotes com "Prêmio do mês · 4 skins".
3. **Prévia visual** da tela "O que veio no pacote" para o dono aprovar antes do código.

## Em aberto

1. Quais migrations pendentes o dono já aplicou no SQL Editor (Loja de pacotes, Objetivos do mês, Venda rápida, Cópia extra, Pacotes sempre ligados, Faixa pela classificação). O pacote novo depende da cópia extra.
2. A faixa das chances dos pacotes de 3 e 4 (proposta: Craque).

Resolvidos em 2026-11-12: sem mínimo de rodadas; cortes da tabela aprovados.
