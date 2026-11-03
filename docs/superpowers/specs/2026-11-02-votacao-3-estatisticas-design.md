# Votação com 3 estatísticas (design)

Decisão do dono do app em 2026-11-02, depois de notar que os pontos do ranking não batiam com o OVR
(o ranking usava a média dos 6 atributos; o OVR joga fora a estatística mais fraca).

## Intenção

Simplificar a conta de ponta a ponta e votar mais rápido, sem prejudicar ninguém:

- Quem vota dá **3 notas** (1 a 10) em vez de 6: Ataque, Criação e Defesa; o goleiro dá Paredão, Leitura e Saída.
- A **nota da rodada** passa a ser o **OVR da rodada**: cada estatística é a média das notas recebidas e a nota é a
  média das **2 maiores** das 3, na escala da carta (x10, arredondada). É a mesma regra do OVR do histórico.
- Os **pontos do ranking** = a nota da rodada + os extras de hoje (Melhor Jogador +40, outros prêmios +20, gol +10).
  Quem joga uma rodada só e não ganha nada fica com pontos iguais ao OVR.
- **Do passado para trás nada muda.** A regra nova vale só para rodadas com data **a partir de 2026-11-02**
  (hoje; o dono do app antecipou a data, antes era a próxima quinta, 2026-11-05).

## Metas, não metas, anti-metas

- Meta: uma regra só para nota da rodada, OVR e pontos; votação de 3 sliders em uma tela sem rolar.
- Não meta: mexer em rodadas, notas, prêmios, XP e moedas já fechados; mudar o OVR do histórico; mudar as cartas.
- Anti-meta: alguém perder nível, saldo de moedas ou carta por causa da troca (XP e moedas são recalculados do histórico).

## Como guardar as notas (decisão de implementação, para não quebrar nada)

Nenhuma mudança de tabela: as 12 colunas e as travas do banco continuam. Um voto em **Ataque** grava o mesmo
número em `vel` e `chu`; **Criação** em `pas` e `dri`; **Defesa** em `def` e `fis`. No goleiro: **Paredão** em
`ref` e `ela`, **Leitura** em `pos` e `sai`, **Saída** em `rep` e `pes`. Como a carta já mostra a média de cada
par, as 3 estatísticas, o OVR do histórico, a média aparada (a nota de cada avaliação é a média dos atributos) e os
prêmios Atacante, Criativo e Defensor continuam funcionando sem tocar neles. Notas antigas ficam como estão.

## Etapas (uma por vez, cada uma testada antes da próxima)

1. **Votação com 3 notas** (tela passo a passo, folha de notas da mesa tática, rascunhos, rascunho salvo, validação
   da action, revisão). O app mostra 3 sliders quando a rodada tem data a partir de 2026-11-02 e os 6 de sempre
   antes disso. Não mexe em nenhuma conta. Isoladamente é seguro.
2. **Nota da rodada = OVR da rodada** só para rodadas a partir de 2026-11-02: no app (`averageEvaluations` e quem a
   usa: pontos do ranking, XP e moedas, nota nas telas) e no banco (`compute_match_awards`: Melhor Jogador, Melhor
   Goleiro, Bola Murcha, Campeão do Mês). Migration só depois de dry-run e do ok do dono. Antes de aplicar, uma
   simulação com os dados reais prova que nenhuma rodada fechada muda.
3. **Telas que ainda falam em 6 atributos** (barras de atributos, destaques e histórico do atleta): passam a mostrar
   as 3 estatísticas para as rodadas novas. Sem pressa; os números antigos continuam certos.
4. **Textos e docs:** slide do ranking ("Nota da rodada × 10" vira "OVR da rodada"), Como ganhar XP, CLAUDE.md e
   design-system.

## Perguntas em aberto (o que fica por minha conta, marcado como minha escolha)

- Dica de uma linha embaixo de cada slider ("Pense em chute e velocidade"): minha escolha, o dono pode tirar.
- Média aparada: continua como hoje (com 4 ou mais notas recebidas na rodada, sai a avaliação mais alta e a mais
  baixa); a nota de cada avaliação é a média das 3 notas dela. Minha escolha.
- Rodada aberta antes de 2/11 que ainda esteja aberta depois: vale a data do jogo, não a do voto. Minha escolha.

## Riscos

- XP e moedas dependem da nota da rodada: por isso a regra nova só vale para datas a partir do corte.
- A votação mistura 6 e 3 notas só se houver rodada aberta antes e depois do corte ao mesmo tempo (a data do jogo
  decide qual tela cada rodada mostra).
- Uma estatística larga (Ataque = chute + velocidade) deixa a nota menos granular: aceito pelo dono do app.
