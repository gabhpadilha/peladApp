# Versos das cartas por raridade: prompt para o Gemini (2026-11-09)

A carta gira e o verso mostra a raridade da skin. **Uma arte-base só**; o que muda entre as raridades é a **cor, o brilho e a quantidade de ornamento**. O app põe em cima o nome da skin, no centro o cristal da raridade e embaixo o nome da raridade, então a arte precisa deixar esses lugares livres.

## Especificações (valem para as 4 imagens)
- **Proporção 5:7** (vertical), por exemplo 1000 × 1400 px. A carta final tem cantos arredondados (o app corta), então a arte vai de ponta a ponta, **sem cantos arredondados desenhados** e sem margem branca ou transparente.
- **Círculo do centro vazio**: um círculo grande (cerca de 62% da largura), liso e escuro, para o cristal. Sem desenho dentro dele.
- **Sem nenhum texto, letra, número ou logo** na arte (nome da skin e da raridade o app escreve).
- **Faixa livre em cima e embaixo** (cerca de 12% da altura cada), só com o fundo e poucas estrelas, onde ficam os nomes.
- Simetria total (esquerda e direita iguais, em cima e embaixo iguais), como nas referências.
- Traço fino, nítido, como impressão em foil sobre fundo fosco. Nada de personagens, rostos, animais ou objetos reais.
- Entregar em PNG ou JPG. Pedir **uma imagem por mensagem**, na mesma conversa, e usar a primeira como gabarito para as outras.

## Prompt-base (copie e troque o que está entre colchetes)
> Verso de uma carta colecionável, vista de frente e plana, proporção 5:7 vertical, de ponta a ponta, sem cantos arredondados. Estilo de verso de carta de tarô ou baralho de luxo: **linhas finas em foil [COR DO FIO]** sobre fundo fosco **[COR DO FUNDO]**, simetria perfeita. No centro, um **círculo grande, liso e escuro, totalmente vazio**, com um fio fino contornando. Em volta do círculo: **[ORNAMENTO DO CENTRO]**. Nos quatro cantos: **[ORNAMENTO DOS CANTOS]**. Moldura: **[MOLDURA]**. Espalhe **[ESTRELAS]** pelo fundo, deixando as faixas de cima e de baixo (12% da altura cada) quase limpas. **[BRILHO]**. Sem nenhum texto, número, logo ou personagem. Acabamento limpo e vetorial, alto contraste, cores sólidas.

### O que trocar por raridade
| | Comum | Rara | Épica | Lendária |
|---|---|---|---|---|
| **Cor do fio** | prata fosca | azul-gelo claro | dourado creme | ouro polido com um fio vermelho-rubi fino |
| **Cor do fundo** | grafite azulado | azul-noite profundo | roxo-ametista escuro | preto profundo com leve calor dourado |
| **Ornamento do centro** | um anel simples | anel duplo com pequenas marcas | anel de 72 marcas finas e raios curtos em volta, estilo sol | anéis duplos, 72 marcas e 48 raios alternando longos e curtos, mais um terceiro anel pontilhado |
| **Ornamento dos cantos** | cantos retos com um pequeno traço | luas crescentes grandes e estrelas de 4 pontas | luas crescentes grandes, estrelas e um sol pequeno no centro de cima e de baixo | luas crescentes grandes, filigranas, sol detalhado em cima e embaixo, mandalas pequenas nos lados |
| **Moldura** | um fio único | fio duplo | fio duplo e uma linha pontilhada por dentro | fio duplo, linha pontilhada e arabescos ondulados nas laterais |
| **Estrelas** | poucas (cerca de 10) | médias (cerca de 40) | muitas (cerca de 70) | campo denso (cerca de 120), com algumas maiores |
| **Brilho** | nenhum, tudo fosco | brilho azul suave atrás do círculo | halo violeta atrás do círculo e fio com leve reflexo | halo dourado intenso atrás do círculo e fio com reflexo metálico, textura de foil |

## Ordem sugerida
1. Gerar a **comum** (a mais simples) e aprovar a estrutura e o círculo vazio.
2. Pedir cada uma das outras assim: "Mesmo desenho, mesmas proporções e círculo do centro vazio. Agora na versão **rara**, mudando só o que está na tabela" (colando a coluna da raridade).
3. Mandar os 4 arquivos. Eles entram em `public/cartas/versos/<raridade>.webp` e substituem o desenho provisório do `components/card-back.tsx`.

## Armadilhas (do que já aprendemos nas cartas)
- Se o Gemini escrever texto, pedir de novo "sem nenhuma letra".
- Se o círculo do centro vier com desenho dentro, pedir "círculo do centro totalmente liso e vazio".
- Pedir sempre uma camada por mensagem e manter a mesma conversa para a família ficar igual.
