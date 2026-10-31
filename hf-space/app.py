"""
Recorte de fundo do PeladApp: máscara da pessoa com o BiRefNet (versão
Portrait, MIT) num Space ZeroGPU gratuito do Hugging Face. Antes do recorte,
a API `/enhance` melhora a foto: rosto com o GFPGAN 1.4 (Apache 2.0) e o resto
com o Real-ESRGAN x2 (BSD-3), na mistura "leve" aprovada pelo dono do app.

API (chamada pelo servidor do app, `lib/hf-matte.ts`):
  /enhance  entrada: foto em base64 (JPEG/PNG/WebP, com ou sem prefixo data:)
            saída:   [foto melhorada (JPEG base64, mesmo tamanho), máscara da foto melhorada (PNG base64)]
  /mask     entrada: a mesma; saída: só a máscara da foto como veio (versões antigas do app)
  Máscara = PNG em tons de cinza, 255 = pessoa, mesmo tamanho da foto.

Nada é gravado: a foto só passa pela memória.
"""

import base64
import binascii
import io
import os
import sys

import gradio as gr
import numpy as np
import spaces
import torch
import torchvision.transforms.functional as torchvision_functional
from PIL import Image, ImageOps
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

# O basicsr (usado pelo GFPGAN e pelo Real-ESRGAN) importa um módulo que o
# torchvision novo removeu; a função que ele usa continua em `functional`.
sys.modules.setdefault("torchvision.transforms.functional_tensor", torchvision_functional)

from basicsr.archs.rrdbnet_arch import RRDBNet  # noqa: E402
from gfpgan import GFPGANer  # noqa: E402
from realesrgan import RealESRGANer  # noqa: E402

MODEL_ID = "ZhengPeng7/BiRefNet-portrait"
# O BiRefNet trabalha em 1024x1024.
MODEL_SIDE = 1024
# A foto chega reduzida pelo celular (lado maior 1280px); acima disso é abuso.
MAX_SIDE = 2048
MAX_BASE64_CHARS = 6_000_000

GFPGAN_URL = "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth"
REALESRGAN_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth"
# Mistura do rosto restaurado com o original: 0,5 = "leve" (o forte muda a cor
# dos olhos e deixa a pele com cara de filtro; teste com fotos reais em 2026-10-31).
FACE_WEIGHT = 0.5
JPEG_QUALITY = 92

# No Space (ZeroGPU) tudo vai para a "cuda" já ao carregar; fora dele (teste local), CPU.
ON_SPACE = bool(os.environ.get("SPACE_ID"))
DEVICE = torch.device("cuda" if ON_SPACE else "cpu")

torch.set_float32_matmul_precision("high")
model = AutoModelForImageSegmentation.from_pretrained(MODEL_ID, trust_remote_code=True)
model.to(DEVICE)
model.eval()
if ON_SPACE:
    model.half()

background_upsampler = RealESRGANer(
    scale=2,
    model_path=REALESRGAN_URL,
    model=RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2),
    tile=400,
    half=ON_SPACE,
    device=DEVICE,
)
face_restorer = GFPGANer(
    model_path=GFPGAN_URL,
    upscale=2,
    arch="clean",
    channel_multiplier=2,
    bg_upsampler=background_upsampler,
    device=DEVICE,
)

to_model_input = transforms.Compose(
    [
        transforms.Resize((MODEL_SIDE, MODEL_SIDE)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]
)


def predict_mask(image: Image.Image) -> Image.Image:
    batch = to_model_input(image).unsqueeze(0).to(DEVICE)
    if ON_SPACE:
        batch = batch.half()
    with torch.no_grad():
        prediction = model(batch)[-1].sigmoid().float().cpu()[0].squeeze()
    return transforms.ToPILImage()(prediction).resize(image.size, Image.BILINEAR)


def enhance_photo(image: Image.Image) -> Image.Image:
    """Melhora o rosto e o resto em 2x e volta ao tamanho recebido (fica mais nítida, sem crescer)."""
    bgr = np.array(image)[:, :, ::-1].copy()
    _, _, restored = face_restorer.enhance(bgr, has_aligned=False, only_center_face=True, paste_back=True, weight=FACE_WEIGHT)
    return Image.fromarray(restored[:, :, ::-1]).resize(image.size, Image.LANCZOS)


@spaces.GPU(duration=20)
def run_mask(image: Image.Image) -> Image.Image:
    """Só a inferência usa a GPU (gasta o mínimo da cota diária)."""
    return predict_mask(image)


@spaces.GPU(duration=40)
def run_enhance(image: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Uma chamada só de GPU: melhora e recorta a foto já melhorada."""
    enhanced = enhance_photo(image)
    return enhanced, predict_mask(enhanced)


def decode(image_base64: str) -> Image.Image:
    if not image_base64 or len(image_base64) > MAX_BASE64_CHARS:
        raise gr.Error("Imagem vazia ou grande demais.")
    try:
        raw = base64.b64decode(image_base64.split(",")[-1], validate=True)
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    except (binascii.Error, OSError) as error:
        raise gr.Error("Imagem inválida.") from error
    if max(image.size) > MAX_SIDE:
        raise gr.Error("Imagem grande demais.")
    return image


def encode(image: Image.Image, format: str) -> str:
    buffer = io.BytesIO()
    if format == "JPEG":
        image.save(buffer, format="JPEG", quality=JPEG_QUALITY)
    else:
        image.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def mask(image_base64: str) -> str:
    return encode(run_mask(decode(image_base64)), "PNG")


def enhance(image_base64: str) -> tuple[str, str]:
    enhanced, matte = run_enhance(decode(image_base64))
    return encode(enhanced, "JPEG"), encode(matte, "PNG")


with gr.Blocks(title="PeladApp: recorte de fundo") as demo:
    gr.Markdown("Uso interno do PeladApp (BiRefNet Portrait, MIT; GFPGAN, Apache 2.0; Real-ESRGAN, BSD-3).")
    photo = gr.Textbox(label="Foto (base64)")
    matte_out = gr.Textbox(label="Máscara (PNG base64)")
    enhanced_out = gr.Textbox(label="Foto melhorada (JPEG base64)")
    gr.Button("Máscara").click(mask, inputs=photo, outputs=matte_out, api_name="mask")
    gr.Button("Melhorar e recortar").click(enhance, inputs=photo, outputs=[enhanced_out, matte_out], api_name="enhance")

demo.queue(max_size=8).launch()
