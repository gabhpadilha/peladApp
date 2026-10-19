"""
Recorte de fundo do PeladApp: máscara da pessoa com o BiRefNet (versão
Portrait, MIT) num Space ZeroGPU gratuito do Hugging Face.

API (chamada pelo servidor do app, `lib/hf-matte.ts`):
  entrada: foto em base64 (JPEG/PNG/WebP, com ou sem prefixo data:)
  saída:   máscara em base64 (PNG em tons de cinza, 255 = pessoa, mesmo tamanho da foto)

Nada é gravado: a foto só passa pela memória.
"""

import base64
import binascii
import io

import gradio as gr
import spaces
import torch
from PIL import Image, ImageOps
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

MODEL_ID = "ZhengPeng7/BiRefNet-portrait"
# O BiRefNet trabalha em 1024x1024.
MODEL_SIDE = 1024
# A foto chega reduzida pelo celular (lado maior 1280px); acima disso é abuso.
MAX_SIDE = 2048
MAX_BASE64_CHARS = 6_000_000

torch.set_float32_matmul_precision("high")
# No ZeroGPU o modelo vai para a "cuda" já ao carregar (emulada fora de @spaces.GPU).
model = AutoModelForImageSegmentation.from_pretrained(MODEL_ID, trust_remote_code=True)
model.to("cuda")
model.eval()
model.half()

to_model_input = transforms.Compose(
    [
        transforms.Resize((MODEL_SIDE, MODEL_SIDE)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]
)


@spaces.GPU(duration=20)
def predict(batch: torch.Tensor) -> torch.Tensor:
    """Só a inferência usa a GPU (gasta o mínimo da cota diária)."""
    with torch.no_grad():
        return model(batch.to("cuda").half())[-1].sigmoid().float().cpu()


def mask(image_base64: str) -> str:
    if not image_base64 or len(image_base64) > MAX_BASE64_CHARS:
        raise gr.Error("Imagem vazia ou grande demais.")
    try:
        raw = base64.b64decode(image_base64.split(",")[-1], validate=True)
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    except (binascii.Error, OSError) as error:
        raise gr.Error("Imagem inválida.") from error
    if max(image.size) > MAX_SIDE:
        raise gr.Error("Imagem grande demais.")

    prediction = predict(to_model_input(image).unsqueeze(0))[0].squeeze()
    matte = transforms.ToPILImage()(prediction).resize(image.size, Image.BILINEAR)

    buffer = io.BytesIO()
    matte.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


demo = gr.Interface(
    fn=mask,
    inputs=gr.Textbox(label="Foto (base64)"),
    outputs=gr.Textbox(label="Máscara (PNG base64)"),
    title="PeladApp: recorte de fundo",
    description="Uso interno do PeladApp (BiRefNet Portrait, MIT).",
    api_name="mask",
    flagging_mode="never",
)
demo.queue(max_size=8).launch()
