# Mercado de transferências de skins (design)

Decidido com o dono do app em 2026-11-09. Primeira versão: **só o Mercado**. A Loja não muda agora (pacotes à venda e fim do nível entram depois, no decorrer do mês, quando os designs estiverem prontos).

## Intenção

Copiar o mercado de transferências do EA FC: o jogador anuncia uma skin dele por um preço, qualquer pessoa de qualquer pelada encontra e compra, e as CanchaCoins passam de quem compra para quem vende. Com os pacotes chegando (skins repetidas e só por sorteio), o Mercado é onde se busca uma skin específica e onde as repetidas viram moeda entre jogadores.

**Sucesso:** a galera lista e compra skins entre peladas sem confusão, sem moeda criada do nada e sem perder skin ou moeda por falha.

## Objetivos

- Listar uma skin própria por um preço dentro da faixa permitida, por 24 horas.
- Buscar no Mercado (todas as peladas) com filtros por raridade, cor e evento, e comprar na hora ("Comprar agora").
- Cancelar o próprio anúncio enquanto não vendeu; anúncio vencido volta sozinho para o dono.
- Ver "Meus anúncios": ativos, vendidos e vencidos.

## Fora da primeira versão (não fazer agora)

- Leilão e lances (fica para depois das notificações push, se a galera pedir).
- Taxa sobre a venda (decisão do dono: sem taxa por enquanto).
- Mudanças na Loja (pacotes à venda, remoção do nível) e no XP (que passa a servir só para o passe de batalha).
- Faixa de preço por carta e por escassez (vêm numa segunda etapa; o banco já nasce preparado).
- Notificações ("sua skin foi vendida").

## Anti-objetivos (seria fracasso mesmo funcionando)

- Moeda criada do nada (ex.: vender a Esmeralda grátis em loop).
- Skin ou moeda perdida, duplicada ou vendida duas vezes numa corrida.
- Dado privado de outra pelada aparecendo (notas, nome completo, usuário).
- Mercado lento ou que pese no plano gratuito.

## Regras (decididas pelo dono)

- **Aberto entre todas as peladas.** Quem compra vê a skin, o preço, o tempo restante e só o apelido e a pelada de quem vende.
- **Só "Comprar agora"**, pelo preço do dono. Sem leilão.
- **Prazo único de 24 horas** (sugestão aceita). Não vendeu, a skin volta para o dono; dá para relistar.
- **Sem taxa.**
- **O Mercado ignora o nível:** qualquer pessoa compra qualquer carta, desde que tenha CanchaCoins.
- **Faixa de preço** (mínimo e máximo do anúncio):
  - Skins vendidas na Loja: **70% a 130% do preço de tabela** (sem o desconto de promoção). Ex.: Safira 250 → 175 a 325; Rubi 450 → 315 a 585; Ícone 1.200 → 840 a 1.560; Lenda do Trovão 600 → 420 a 780.
  - Skins que só saem de pacote, por raridade: Comum 50–150, Rara 100–300, Épica 200–700, Lendária 500–2.000.
  - Depois: faixa própria por carta e ajuste por escassez (menos cópias no jogo, faixa mais alta), recalculada sozinha (ex.: uma vez por dia) e limitada por valores do dono.
- **A Esmeralda (grátis para todos) não pode ser vendida.**

## Navegação (decidida pelo dono; mandar prévia visual antes de implementar)

- **Carreira vai para dentro de Eu.**
- **Loja e Mercado viram um botão só** na barra de baixo, com as duas partes lado a lado lá dentro (como Loja e Transferências no EA FC).
- A barra do celular fica com 5 botões: Início, Rodadas, Comunidade, Loja/Mercado e Eu.
- O nome do botão integrado, a ordem dos botões e onde a Carreira aparece em Eu ficam para a prévia visual, que o dono aprova antes do código.

## Como funciona por baixo (partes decididas e chamadas minhas)

**Inventário.** Hoje a posse é `card_skin_purchases` (uma linha por jogador e skin, `unique (member_id, skin)`, colunas `price` e `source` `shop`/`pack`), por **membro da pelada** (`group_members`), e o saldo é calculado do histórico (moedas ganhas − soma de `price`). Com o Mercado, a skin muda de dono entre peladas e, com os pacotes, um jogador pode ter cópias repetidas. *Minha chamada:* trocar a posse por um inventário de itens (uma linha por cópia, com origem `shop`/`pack`/`market`), migrando as compras atuais uma a uma, e manter o que hoje lê `card_skin_purchases` funcionando pelo inventário. Quem joga em duas peladas tem inventário e saldo separados por pelada (como hoje); o Mercado age sempre pela pelada ativa.

**Extrato de CanchaCoins.** O saldo continua sendo derivado do histórico, mais as linhas do Mercado: **vendas somam, compras subtraem**. *Minha chamada:* uma tabela de negócios do Mercado (vendedor, comprador, skin, preço, quando), que o `getLeague` soma junto com o resto, sem gravar saldo.

**Anúncios.** Tabela de anúncios (item do inventário, preço, criado em, vence em 24h depois, estado `ativo`/`vendido`/`cancelado`/`vencido`). Um item só pode estar em um anúncio ativo. Anúncio vencido é tratado na leitura (não aparece e o item volta a estar livre); se precisar, um `pg_cron` limpa depois. Limite de **10 anúncios ativos por jogador** (*minha chamada*).

**Segurança.** Nada de acesso direto às tabelas novas: tudo por funções `security definer` que conferem quem chama, como a Comunidade. Funções: listar, cancelar, buscar o Mercado (paginada, com filtros), comprar e "meus anúncios". **Comprar** trava o anúncio (`for update`), confere que está ativo e não vencido, que quem compra não é o dono, que tem saldo e que a pelada de quem compra não está suspensa, e troca item e moedas na mesma transação. Pelada suspensa e jogador desativado não listam nem compram, e os anúncios deles saem do ar.

**Skin em uso.** *Minha chamada:* não dá para listar a skin que está em uso; o botão avisa para trocar de carta antes (mais previsível do que tirar a carta do jogador sozinho).

**Faixas de preço.** Numa tabela no banco (por raridade e, depois, por carta), que só o admin edita (primeiro por SQL, depois pelo `/admin`). O preço do anúncio é validado no servidor contra a faixa.

**Testes.** No PGlite, como os pacotes: listar, cancelar, vencer, comprar, compra simultânea (só uma passa), saldo insuficiente, faixa de preço, Esmeralda bloqueada, skin em uso, pelada suspensa, isolamento entre peladas (nada privado vaza).

## Etapas

1. Banco: inventário com cópias (migrando as compras atuais), extrato do Mercado no saldo, anúncios, faixas de preço, funções e testes.
2. Prévia visual da navegação nova (Carreira em Eu, Loja e Mercado juntos) e das telas do Mercado, para o dono aprovar.
3. Listar e cancelar em Eu → Minhas cartas.
4. Tela do Mercado: busca, filtros, folha de compra e "Meus anúncios".
5. Depois, fora desta versão: Loja com pacotes, repetidas indo para o inventário, faixa por carta e escassez.

## Chamadas minhas da revisão (o dono confere)

- **Não dá para comprar uma skin que você já tem** (enquanto não houver uso para cópias repetidas; muda quando os pacotes chegarem).
- **Quem vende aparece pelo apelido e pela pelada** (nunca nome completo nem usuário), como na Comunidade.
- **Skins de evento fora da época** (ex.: Lobisomem depois de outubro) podem ser vendidas no Mercado, com a faixa pelo preço de tabela: é aí que elas ficam raras.
- **Promoção da Loja:** a faixa do Mercado usa o preço de tabela; com -30% na Loja, o preço da Loja coincide com o mínimo do Mercado.
- **A skin comprada no Mercado** entra no inventário da pelada ativa de quem comprou; a venda some do inventário de quem vendeu.

## Ficam para quem constrói

- Layout das telas e textos (dentro do design-system), após a prévia aprovada.
- Paginação e ordenação padrão do Mercado (*sugestão:* mais recentes primeiro, com opção de menor preço).
- Como a migração do inventário preserva o histórico de preços pagos (o saldo de ninguém pode mudar ao migrar).
