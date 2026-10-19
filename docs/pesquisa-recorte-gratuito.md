# Pesquisa: recorte de fundo 100% gratuito para o PeladApp

Data da pesquisa: 2026-10-19. Só pesquisa em fontes públicas; **nada foi testado na prática**. O que não deu para confirmar está marcado como *(não verificado)*.

Contexto: o remove.bg (plano grátis, 50/mês) acaba em 1º/12/2026 e vira Leonardo.Ai a US$ 0,1047/foto. Regra do projeto: custo zero, nada pago. Caso crítico: camisa escura em fundo escuro (onde o MODNet falha).

## Resumo executivo

| # | Opção | Qualidade (retrato, fundo escuro) | Custo zero de verdade? | Esforço | Risco |
|---|---|---|---|---|---|
| 1 | **BiRefNet em Space ZeroGPU próprio no Hugging Face** | Ótima (mesmo modelo que você já testou) | Sim (sem cartão) | Médio: Space + chamada do servidor | Médio: política do HF mudou várias vezes, fila e cold start |
| 2 | **BiRefNet no Google Cloud Run** | Ótima | Na prática sim, mas **exige cartão e não tem teto de gasto** | Médio-alto (Docker) | Médio: cartão, custo de imagem no Artifact Registry *(não verificado)* |
| 3 | BiRefNet-lite no navegador (WebGPU/WASM) | Ótima, se rodar | Sim | Alto | **Alto**: 115–224MB de download, memória no iPhone, exports com `bad_alloc` |
| 4 | Oracle Always Free ARM | Ótima, lenta | Sim, mas cota cortada e cartão | Alto (operar uma VM) | Alto: corte sem aviso em jun/2026 |
| 5 | Serviços com plano grátis (poof.bg, withoutBG, Photoroom, Clipdrop, Cloudinary) | Boa a ótima | Só poof.bg tem cota mensal renovável *(termos não verificados)* | Baixo | Alto: cota/termos mudam; os demais são trial |
| 6 | HF Inference Providers, Cloudflare Workers AI | — | — | — | **Descartados** |
| 7 | Manter MODNet + MediaPipe (hoje) | Ruim em escuro | Sim | Zero | Já conhecido |

**Recomendação:** construir um **Space ZeroGPU próprio com BiRefNet** (opção 1) como primeira camada, mantendo MODNet e MediaPipe como reservas. Plano B se o HF mudar a política: Cloud Run (opção 2), aceitando o cartão no Google. Detalhes na seção final.

## 1. Hugging Face Spaces

**Achado importante: o "CPU Basic grátis" não serve mais para quem não paga.** A doc oficial ainda lista CPU Basic (2 vCPU, 16GB, "FREE"), mas avisa que *Gradio e Docker Spaces rodam em compute e exigem plano pago para criar* (PRO para conta pessoal); só Spaces estáticos são grátis para todos. A única exceção para conta grátis: **até 2 Spaces Gradio em ZeroGPU**. Em hardware grátis o Space "dorme" após um período sem uso (a doc não diz quanto; a doc da biblioteca fala em 48h).
Fonte: [Spaces Overview](https://huggingface.co/docs/hub/spaces-overview).

**ZeroGPU (a via viável):**
- Conta grátis (e-mail verificado, conta com mais de 30 dias) hospeda até 2 Spaces ZeroGPU.
- Cota diária de GPU: **5 min/dia para conta grátis autenticada** (2 min sem login), zerando 24h após o primeiro uso. Quem paga a cota é a conta que **chama** (o token do servidor do app, se autenticado).
- GPU: meia RTX Pro 6000 Blackwell (48GB). Só SDK Gradio.
- Estimativa minha (não medida): BiRefNet em GPU leva menos de 1–2s por foto, então 5 min/dia cobrem dezenas ou centenas de fotos, muito acima do uso do app (poucas fotos por mês).
- Sem CPU de reserva dentro do Space: se a cota acabar ou o Space estiver dormindo, a chamada falha ou demora; o app já tem o fallback MODNet.
Fonte: [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu).

**Como chamar do Next.js:** `@gradio/client` (Node) com `Client.connect("usuario/space", { token: process.env.HF_TOKEN })` e `client.predict("/endpoint", { image })`; ou HTTP direto na API do Gradio. O endpoint exato vem de "Use via API" do Space *(não testei)*. Timeout de cold start: prever 30–60s ou mais para acordar o Space dormindo, o que estoura o limite de função se o Space estiver frio; o fallback MODNet cobre.

**Licença:** BiRefNet é MIT ([modelo](https://huggingface.co/ZhengPeng7/BiRefNet)). Há um [demo oficial](https://huggingface.co/spaces/ZhengPeng7/BiRefNet_demo) para copiar o código. Chamar Spaces de terceiros funciona sem criar nada, mas é frágil (podem sumir, mudar a API ou ficar lotados) e gasta a sua cota; não recomendo como base.

**Risco principal:** comunidade reclama de mudanças frequentes na política dos Spaces grátis ([fórum](https://discuss.huggingface.co/t/official-community-complaint-revert-free-cpu-basic-spaces-and-remove-anti-developer-sdk-restrictions/177703); fonte de usuários, não oficial).

## 2. Hugging Face Inference API / Providers

- Plano grátis inclui **menos de US$ 0,10/mês** em créditos de Inference Providers ([preços](https://huggingface.co/docs/inference-providers/pricing)). Sem opção de estourar para conta grátis.
- Segmentação: a doc lista só `facebook/mask2former` (hf-inference) e **`briaai/RMBG-2.0` via fal-ai**, que é pago por provedor e **não comercial** ([doc da tarefa](https://huggingface.co/docs/inference-providers/tasks/image-segmentation)). Não há BiRefNet.
- **Descartado.**

## 3. No navegador (transformers.js / onnxruntime-web)

- [BiRefNet_lite-ONNX](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX) (MIT): `model.onnx` **224MB** (fp32) e `model_fp16.onnx` **115MB**, entrada fixa de 1024x1024.
- Exports comunitários têm problema em onnxruntime-web: um relata `OrtRun std::bad_alloc` no WASM por convoluções deformáveis; outros reescrevem o grafo para rodar em WASM e WebGPU ([exemplo](https://huggingface.co/runes/birefnet-lite-webgpu), [outro](https://huggingface.co/jiabins0303/birefnet-lite-1024-webgpu)). Há também build 512px só fp16 ([naddy24](https://huggingface.co/naddy24/birefnet-512-webgpu)).
- Memória em iPhone/Android: **não encontrei medições**. Download de 115MB+ por jogador num celular, mais pico de memória do modelo a 1024px, é arriscado (Safari mata abas por memória) *(não verificado)*.
- Modelos pequenos (MODNet, U2Net, ISNet quantizado) cabem no celular, mas são justamente a classe de qualidade que já falha em escuro. RMBG-1.4/2.0 são não comerciais.
- **Veredito:** só vale como camada opcional futura (WebGPU disponível), não como solução principal.

## 4. Serviços com plano grátis

| Serviço | Cota grátis | Observação |
|---|---|---|
| **poof.bg** | 100 créditos (1 foto = 1) **por mês**, sem cartão | Renovável. Fonte é o próprio blog do fornecedor; resolução, marca d'água e termos comerciais *não verificados* ([comparativo](https://poof.bg/blog/affordable-free-bg-removal-apis-2026)) |
| **withoutBG** | 50 créditos no cadastro, válidos 30 dias; demo web 5/dia | Trial, não permanente. O **modelo aberto é Apache-2.0**, ONNX, roda local, mas é inferior em cabelo/bordas ([site](https://withoutbg.com/)) |
| **Photoroom** | Sandbox 1.000 chamadas/mês **com marca d'água** + 10 de produção | Não serve |
| **Clipdrop** | 100 créditos no cadastro, uma vez, "para desenvolvimento e depuração" | Não serve (agora do Jasper) |
| **Cloudinary** | 25 créditos/mês | Contas criadas depois de 1/2/2026 **não têm** o add-on de remoção de fundo |
| **remove.bg** | Créditos expiram em 1/12/2026 | Fim |
| Pixian, Slazzer, Erase.bg | *não verificado* | Costumam entregar prévia em baixa resolução no grátis; não confirmei |

Fonte geral: [poof.bg](https://poof.bg/blog/affordable-free-bg-removal-apis-2026) (parte interessada; confirme nas páginas de preço antes de usar). O poof.bg pode entrar como **camada extra** entre o Space e o MODNet, mas depender de uma cota gratuita de startup é o mesmo risco do remove.bg.

## 5. BiRefNet em outra infraestrutura gratuita

**Cloudflare Workers AI:** grátis (10.000 Neurons/dia), mas o catálogo **não tem modelo de segmentação nem de remoção de fundo** (só LLMs, Stable Diffusion, FLUX, classificação) ([catálogo](https://developers.cloudflare.com/workers-ai/models/), [preços](https://developers.cloudflare.com/workers-ai/platform/pricing)). Workers comuns também não aguentam um modelo desses. **Descartado.**

**Google Cloud Run:** cota grátis mensal em região tier 1: 180.000 vCPU-s, 360.000 GiB-s e 2 milhões de requisições (cobrança por requisição) ([preços](https://cloud.google.com/run/pricing)). Cálculo meu a partir dos seus números (BiRefNet-lite ~15s, ~7GB; usando 4 vCPU e 8GiB): ~60 vCPU-s e ~120 GiB-s por foto, ou seja, **~3.000 fotos/mês dentro do grátis**, muito acima do necessário. Ressalvas:
- **Exige conta de faturamento com cartão**, e Cloud Run não tem teto rígido de gasto (só alertas de orçamento). Escalar a zero e limitar `max-instances=1` reduz o risco.
- A imagem do contêiner (PyTorch/ONNX + modelo, > 1GB) fica no Artifact Registry, que tem franquia grátis pequena (confirmar: pode custar centavos) *(não verificado)*. Isso fere "custo zero" em sentido estrito.
- Cold start de 10–30s carregando o modelo.

**Oracle Cloud Always Free (ARM):** o InfoQ relata que a cota caiu de 4 OCPU/24GB para **2 OCPU/12GB em 15/6/2026, sem aviso**, com instâncias desligadas ([InfoQ](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/)). Cabe 7GB, mas 2 núcleos ARM devem ser bem mais lentos que os ~15s que você mediu *(não medido)*, e exige operar e manter uma VM. Risco de nova redução. Só em último caso.

## Ranking

Por qualidade em retrato com fundo escuro: BiRefNet (opções 1, 2, 3, 4 empatadas, mesmo modelo) > serviços comerciais (poof.bg, withoutBG pro) > modelo aberto withoutBG / ISNet > MODNet > MediaPipe.
Por custo zero real e simplicidade: **1 (ZeroGPU)** > 5 (poof.bg) > 2 (Cloud Run, cartão) > 3 > 4.

## Recomendação final

1. **Agora até 30/11:** manter o remove.bg como está (ainda grátis).
2. **Construir o Space ZeroGPU próprio com BiRefNet** (conta grátis, até 2 Spaces): Gradio com `@spaces.GPU(duration=30)`, expor o endpoint de imagem, chamar de `segmentPhoto` via `@gradio/client` com um `HF_TOKEN` só de leitura em variável da Vercel. Substituir o remove.bg na primeira posição da cadeia, com timeout curto e queda automática para MODNet e depois MediaPipe, sem mudar o resto do fluxo. Medir tempo real, cold start e se a cota de 5 min/dia basta.
3. **Se o HF cortar o ZeroGPU grátis ou ficar instável:** migrar a mesma lógica (BiRefNet-lite ONNX que você já testou) para Cloud Run, decidindo conscientemente sobre o cartão e o teto de gasto.
4. **Não vale a pena:** Inference Providers, Cloudflare, Photoroom, Clipdrop, Cloudinary, BiRefNet no navegador como caminho principal.
5. Opcional e barato: poof.bg como camada extra, depois de ler os termos.

## Fontes

- [HF Spaces Overview](https://huggingface.co/docs/hub/spaces-overview)
- [HF ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu)
- [HF Inference Providers: preços](https://huggingface.co/docs/inference-providers/pricing) e [segmentação](https://huggingface.co/docs/inference-providers/tasks/image-segmentation)
- [BiRefNet (MIT)](https://huggingface.co/ZhengPeng7/BiRefNet), [BiRefNet_lite-ONNX](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX)
- [Cloudflare Workers AI: modelos](https://developers.cloudflare.com/workers-ai/models/) e [preços](https://developers.cloudflare.com/workers-ai/platform/pricing)
- [Cloud Run: preços](https://cloud.google.com/run/pricing)
- [InfoQ: Oracle corta o Always Free](https://www.infoq.com/news/2026/07/oracle-cloud-free-tier-limits/)
- [Comparativo de APIs grátis (poof.bg)](https://poof.bg/blog/affordable-free-bg-removal-apis-2026), [withoutBG](https://withoutbg.com/)
