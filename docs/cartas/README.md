# Cartas do Cancha Club

> Gerado de `docs/cartas/catalogo.json` por `python3 scripts/cartas/gerar-catalogo.py`. Para consultar rápido, leia o JSON ou a ficha da carta; não precisa varrer o app.

## Regras

- Toda carta nova chega do Gemini em peças separadas (luz sobre preto puro): fundo, borda, enfeite-*, render-*, flutuante-*. Guardar em docs/cartas/<chave>/pecas/ como vieram.
- Nunca trabalhar só com a carta achatada: tirar uma peça de cima da borda deixa defeito (testes 3D de novembro, 2026-11-11).
- Nada de render vazando para fora da carta (decisão de 2026-11-11): gerava retrabalho e não ficava bom; o premium vem da borda e dos flutuantes.
- Raridade pela borda (desde 2026-11-11, cartas de dezembro em diante; nada vaza para fora da carta): comum = fio ou tubo simples e fundo padrão; rara = borda trabalhada de leve e fundo com pattern; épica = borda com 1 ou 2 enfeites simples, fundo sofisticado, animação opcional só dentro da carta; lendária = borda cheia de enfeites, fundo sofisticado, flutuantes atrás e em volta e animação (só 1 por conjunto). Peças do Gemini sempre separadas. Cartas antigas com algo vazando ficam como estão (novembro de 2026 é o último mês assim).
- Na carta: sem filter, mix-blend-mode e backdrop-filter (iPhone); animações só de transform e opacity.
- Cartas já ganhas não mudam de desenho: o tema fica gravado na carta.

## Como cada carta é guardada

```
docs/cartas/<chave>/
  README.md        ficha (gerada)
  pecas/           imagens do Gemini como vieram: fundo, borda, enfeite-*, render-*, flutuante-*
  montada/         <chave>-2d.webp (gerada) e <chave>-3d.webp (Blender, se houver)
```

As cartas anteriores a 2026-11-11 têm as peças na pasta de protótipos (`docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/`); a ficha aponta para elas.

## Skins (26)

| | Carta | Raridade | Onde | Evento | Estado |
| --- | --- | --- | --- | --- | --- |
| <img width="60" src="./padrao/montada/padrao-2d.webp"> | [Padrão](./padrao/README.md) | — | todos (carta base) | — | no app |
| <img width="60" src="./esmeralda/montada/esmeralda-2d.webp"> | [Esmeralda](./esmeralda/README.md) | Épica | Loja (grátis, prêmio do primeiro login) | — | no app |
| <img width="60" src="./safira/montada/safira-2d.webp"> | [Safira](./safira/README.md) | Épica | Loja | — | no app |
| <img width="60" src="./ametista/montada/ametista-2d.webp"> | [Ametista](./ametista/README.md) | Épica | Loja | — | no app |
| <img width="60" src="./rubi/montada/rubi-2d.webp"> | [Rubi](./rubi/README.md) | Épica | Loja | — | no app |
| <img width="60" src="./icone/montada/icone-2d.webp"> | [Ícone](./icone/README.md) | Épica | Loja | — | no app |
| <img width="60" src="./lobisomem/montada/lobisomem-2d.webp"> | [Lobisomem](./lobisomem/README.md) | Rara | Loja (evento) | Halloween 2026 (01/10 a 30/10) | saiu do app |
| <img width="60" src="./vampiro/montada/vampiro-2d.webp"> | [Vampiro](./vampiro/README.md) | Rara | Loja (evento) | Halloween 2026 (01/10 a 30/10) | saiu do app |
| <img width="60" src="./nuvem/montada/nuvem-2d.webp"> | [Nuvem carregada](./nuvem/README.md) | Épica | Pacote (era Loja) | Toró (novembro de 2026) | no app |
| <img width="60" src="./relampago/montada/relampago-2d.webp"> | [Relâmpago](./relampago/README.md) | Épica | Pacote (era Loja) | Toró (novembro de 2026) | no app |
| <img width="60" src="./lenda/montada/lenda-2d.webp"> | [Lenda do Trovão](./lenda/README.md) | Épica | Pacote (era Loja) | Toró (novembro de 2026) | no app |
| <img width="60" src="./diluvio/montada/diluvio-2d.webp"> | [Dilúvio](./diluvio/README.md) | Lendária | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./aguaceiro/montada/aguaceiro-2d.webp"> | [Aguaceiro](./aguaceiro/README.md) | Rara | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./chuvavioleta/montada/chuvavioleta-2d.webp"> | [Chuva Violeta](./chuvavioleta/README.md) | Rara | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./chuvaesmeralda/montada/chuvaesmeralda-2d.webp"> | [Chuva Esmeralda](./chuvaesmeralda/README.md) | Rara | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./chuvarubi/montada/chuvarubi-2d.webp"> | [Chuva Rubi](./chuvarubi/README.md) | Rara | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./nublado/montada/nublado-2d.webp"> | [Nublado](./nublado/README.md) | Comum | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./neblina/montada/neblina-2d.webp"> | [Neblina](./neblina/README.md) | Comum | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./cerracao/montada/cerracao-2d.webp"> | [Cerração](./cerracao/README.md) | Comum | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./crepusculo/montada/crepusculo-2d.webp"> | [Crepúsculo](./crepusculo/README.md) | Comum | Pacote | Toró (novembro de 2026) | no app |
| <img width="60" src="./destino/montada/destino-2d.webp"> | [Destino](./destino/README.md) | Lendária | Pacote (evento Destino) | Destino (dezembro de 2026) | no app |
| <img width="60" src="./tormenta/montada/tormenta-2d.webp"> | [Tormenta](./tormenta/README.md) | Lendária | Pacote (evento Destino) | Destino (dezembro de 2026) | no app |
| <img width="60" src="./embuste/montada/embuste-2d.webp"> | [Embuste](./embuste/README.md) | Lendária | Pacote (evento Destino) | Destino (dezembro de 2026) | no app |
| <img width="60" src="./voltagem/montada/voltagem-2d.webp"> | [Voltagem](./voltagem/README.md) | — | nenhum | — | guardada |
| <img width="60" src="./mare/montada/mare-2d.webp"> | [Maré](./mare/README.md) | — | nenhum | — | guardada |
| <img width="60" src="./aurora/montada/aurora-2d.webp"> | [Aurora](./aurora/README.md) | — | nenhum | — | guardada |

## Visuais de prêmio (10)

| | Carta | Raridade | Onde | Evento | Estado |
| --- | --- | --- | --- | --- | --- |
| <img width="60" src="./premio-craque/montada/premio-craque-2d.webp"> | [Melhor Jogador (fora de evento e Toró)](./premio-craque/README.md) | — | prêmio da rodada | fora de evento e Toró | no app |
| <img width="60" src="./premio-destaques/montada/premio-destaques-2d.webp"> | [Destaques da rodada (fora de evento)](./premio-destaques/README.md) | — | prêmio da rodada (Atacante, Criativo, Defensor, Goleiro, Gol, Goleador) | fora de evento | no app |
| <img width="60" src="./premio-time-do-mes/montada/premio-time-do-mes-2d.webp"> | [Time do Mês](./premio-time-do-mes/README.md) | — | prêmio do mês | — | no app |
| <img width="60" src="./premio-campeao-do-mes/montada/premio-campeao-do-mes-2d.webp"> | [Campeão do Mês](./premio-campeao-do-mes/README.md) | — | prêmio do mês (1º do ranking) | — | no app |
| <img width="60" src="./premio-bola-murcha/montada/premio-bola-murcha-2d.webp"> | [Bola Murcha](./premio-bola-murcha/README.md) | — | prêmio da rodada (zoeira) | — | no app |
| <img width="60" src="./natal-craque/montada/natal-craque-2d.webp"> | [Natal: carta-base dos prêmios (vermelha)](./natal-craque/README.md) | — | todos os prêmios individuais de dezembro em diante | Natal (dezembro de 2026) | guardada |
| <img width="60" src="./natal-campeao/montada/natal-campeao-2d.webp"> | [Natal: Campeão do Mês (verde)](./natal-campeao/README.md) | — | Campeão do Mês de dezembro | Natal (dezembro de 2026) | guardada |
| <img width="60" src="./natal-gelo/montada/natal-gelo-2d.webp"> | [Natal: destaques (azul-gelo)](./natal-gelo/README.md) | — | destaques de dezembro | Natal (dezembro de 2026) | guardada |
| <img width="60" src="./natal-murcha/montada/natal-murcha-2d.webp"> | [Natal: Bola Murcha (cinza-carvão)](./natal-murcha/README.md) | — | Bola Murcha de dezembro | Natal (dezembro de 2026) | guardada |
| <img width="60" src="./natal-timedomes/montada/natal-timedomes-2d.webp"> | [Natal: Time do Mês (roxa)](./natal-timedomes/README.md) | — | Time do Mês de dezembro | Natal (dezembro de 2026) | guardada |

## Em andamento

- **2026-11-11**: Nova regra de raridade pela borda registrada; as próximas cartas (dezembro) já seguem ela.
- **2026-11-11**: Cartas em 3D no Blender: Destino aprovada (branch feat/carta-3d-teste, scripts/blender/carta-3d.py), falta ligar no app; foto e números ao vivo entre a camada do fundo e a da moldura.
- **2026-11-08**: Pacotes de skins (conjunto de novembro: 12 skins, 6 desenhos) ainda desligados nas peladas; lançamento planejado para 1/12.

## Próximos

- **2026-12**: Conjunto de pacotes de dezembro (tema Destino): skins e raridades a definir com o dono; lendárias já prontas: Destino, Tormenta, Embuste.
- **2026-12**: Ligar o tema de Natal dos prêmios (carta-base vermelha com medalhão; Bola Murcha cinza-carvão).
- **2026-12**: Cartas novas já nascem peça por peça (fundo, borda, enfeites, renders, flutuantes) e em 3D no Blender.
- **futuro**: Refazer a Dilúvio em 3D (tem todas as peças separadas).
- **futuro**: Representação da raridade fora da Loja e de Eu (Início, Carreira, mesa tática, ranking): a definir pelo dono.

Linha do tempo completa: [LINHA-DO-TEMPO.md](LINHA-DO-TEMPO.md).
