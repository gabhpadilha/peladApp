/**
 * Recorte de reserva, no servidor: acha a pessoa na foto com o MODNet
 * (matting de retrato, Apache 2.0, versão quantizada de ~6,6MB em `models/`)
 * e devolve só a máscara. O enquadramento e a curva continuam no aparelho
 * (`lib/photo-cutout.ts`), então a carta sai no mesmo padrão do recorte local.
 * Só importe em Server Actions.
 */
import path from "node:path";
import { InferenceSession, Tensor } from "onnxruntime-node";
import sharp from "sharp";

const MODEL_PATH = path.join(process.cwd(), "models", "modnet-portrait-q.onnx");
/** Lado maior na entrada do modelo; MODNet pede múltiplos de 32. */
const MODEL_SIDE = 512;
const STRIDE = 32;

let sessionPromise: Promise<InferenceSession> | null = null;

/** Uma sessão por instância do servidor (o modelo carrega em ~1s no cold start). */
function getSession(): Promise<InferenceSession> {
  sessionPromise ??= InferenceSession.create(MODEL_PATH).catch((error: unknown) => {
    sessionPromise = null;
    throw error;
  });
  return sessionPromise;
}

function toStride(value: number): number {
  return Math.max(STRIDE, Math.round(value / STRIDE) * STRIDE);
}

/** Máscara da pessoa (PNG em tons de cinza, 255 = pessoa) no mesmo tamanho da foto recebida. */
export async function personMattePng(image: Buffer): Promise<Buffer> {
  const { width, height } = await sharp(image).metadata();
  if (!width || !height) throw new Error("Imagem sem dimensões.");

  const scale = MODEL_SIDE / Math.max(width, height);
  const inputWidth = toStride(width * scale);
  const inputHeight = toStride(height * scale);
  const { data: rgb } = await sharp(image)
    .resize(inputWidth, inputHeight, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // NCHW, normalizado para [-1, 1].
  const pixels = inputWidth * inputHeight;
  const tensor = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i++) {
    for (let channel = 0; channel < 3; channel++) {
      tensor[channel * pixels + i] = rgb[i * 3 + channel] / 127.5 - 1;
    }
  }

  const session = await getSession();
  const result = await session.run({
    [session.inputNames[0]]: new Tensor("float32", tensor, [1, 3, inputHeight, inputWidth]),
  });
  const matte = result[session.outputNames[0]].data;
  if (!(matte instanceof Float32Array) || matte.length !== pixels) {
    throw new Error("Saída inesperada do modelo.");
  }

  const gray = Buffer.alloc(pixels);
  for (let i = 0; i < pixels; i++) gray[i] = Math.round(Math.min(1, Math.max(0, matte[i])) * 255);

  // fit "fill": volta exatamente ao tamanho da foto, sem esticar a silhueta.
  return sharp(gray, { raw: { width: inputWidth, height: inputHeight, channels: 1 } })
    .resize(width, height, { fit: "fill" })
    .extractChannel(0)
    .png()
    .toBuffer();
}
