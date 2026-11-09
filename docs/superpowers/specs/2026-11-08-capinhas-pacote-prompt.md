# Capinhas dos pacotes: prompt padrão para o Gemini (2026-11-08)

Uma arte por faixa de pacote, no tema do mês. Ela aparece **pequena** (miniatura em Loja → Meus pacotes e em "Você ganhou", ~44 a 64 px de altura) e **grande** (o pacote que treme antes de abrir, 210 × 320 px). Por isso: desenho simples, de silhueta forte, que se lê miúdo.

## Faixas (nome e sensação)
| Faixa | Nome | Sensação |
|---|---|---|
| A | Pacote Craque | o mais nobre: metal precioso, brilho, coroa ou estrela |
| B | Pacote Destaque | forte e vistoso: cor viva, brilho, raio ou chama |
| C | Pacote Pelada | o do dia a dia: limpo, esportivo, amigável |
| D | Pacote Reserva | o mais simples: sóbrio, grafite, sem brilho |

A diferença entre as faixas é de **material e brilho**, não de formato: as quatro têm a mesma silhueta, para o jogador reconhecer que é tudo pacote.

## Prompt-base (trocar o que está entre colchetes)
> Embalagem de pacote de cartas colecionáveis de futebol, vista de frente, plana, centralizada, na proporção 2:3 (vertical). Folha metálica com a borda de cima e a de baixo serrilhadas (como pacote lacrado), cantos levemente arredondados. Material e acabamento: **[MATERIAL DA FAIXA]**. Tema: **[TEMA DO MÊS, ex.: Natal / Halloween / tempestade]**, em **detalhes discretos** (um motivo só, sem poluir). No centro, **uma marca simples** (um escudo ou um emblema vazado), sem texto escrito. Iluminação de estúdio, reflexo suave no metal. **Fundo preto puro** e a embalagem inteira dentro da imagem, com folga nas bordas. Sem mãos, sem cartas aparecendo, sem logotipos de marcas reais, sem texto.

### Material por faixa
- **A, Craque:** ouro polido e champanhe, com faixa de brilho forte e um detalhe de coroa em relevo.
- **B, Destaque:** metal na cor do mês (lima, azul-elétrico ou a cor do evento), vivo e brilhante, com um raio ou chama em relevo.
- **C, Pelada:** aço azulado fosco, com a marca em baixo-relevo.
- **D, Reserva:** grafite escuro quase fosco, sem brilho, só um fio claro na borda.

## Regras
- Uma camada por mensagem; gerar as **quatro faixas na mesma conversa** para ficarem da mesma família.
- Mesmo enquadramento nas quatro (use a primeira como gabarito).
- Fundo preto puro: o app recorta pelo brilho, como nas cartas.
- Sem texto na arte: "RODADA N" e o nome da faixa o app escreve por cima.
- Entregar em PNG/JPG; os arquivos entram em `public/pacotes/<mes>/<faixa>.webp` e substituem a capinha provisória (`components/pack-cover.tsx`).

## Raridade e peças da arte das skins (referência)
A capinha é da **faixa** do pacote; a raridade da **skin** que sai dele segue as regras do `CLAUDE.md` (comum 1 peça, rara 2, épica 3, lendária 3 mais flutuantes).

## Cristais de raridade (gema embaixo da carta, 2026-11-09)
Referências do dono: cristal azul em losango alongado com núcleo brilhante e raios de difração, prisma roxo longo com dispersão em arco-íris e um buquê de cristais holográficos com estilhaços no ar. A gema aparece embaixo de toda carta com skin (arquivos em `public/rarity/<raridade>.webp`, altura-alvo 220 px, fundo transparente; o app mede a altura, então formas alongadas funcionam).
Prompt-base (uma imagem por raridade, mesma conversa): "Um único cristal [FORMA] flutuando no centro, fotorrealista, refração e dispersão em arco-íris, facetas nítidas, núcleo luminoso, **fundo preto puro**, sem chão, sem texto, bem iluminado, cristal inteiro com folga nas bordas." Formas: **comum** quartzo fumê curto; **rara** safira azul em losango alongado; **épica** ametista em prisma longo; **lendária** buquê de cristais holográficos com estilhaços. O app recorta o fundo escuro ligado à borda da imagem (`/tmp`-style: flood fill por luminância), então o fundo precisa ser preto de verdade.
