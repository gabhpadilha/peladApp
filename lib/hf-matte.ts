/**
 * Recorte principal, no servidor: máscara da pessoa pelo BiRefNet Portrait
 * (MIT) num Space ZeroGPU gratuito do Hugging Face (código em `hf-space/`).
 * Recorta certo camisa escura em fundo escuro; o BiRefNet não cabe na Vercel
 * (~7GB de memória), por isso roda lá. Custo zero: cota de GPU diária da conta
 * gratuita (5 min/dia com `HF_TOKEN`).
 * Sem `HF_SPACE_URL`, ou com o Space dormindo/sem cota, quem chama segue para o
 * remove.bg e o MODNet. Só importe em Server Actions.
 */
import sharp from "sharp";
import { z } from "zod";

const API_NAME = "mask";
/** Space acordado responde em poucos segundos; dormindo, leva minutos (aí vale a reserva). */
const HF_TIMEOUT_MS = 20_000;

const eventSchema = z.object({ event_id: z.string().min(1) });
const resultSchema = z.tuple([z.string().min(1)]);

export function hasHfSpace(): boolean {
  return Boolean(process.env.HF_SPACE_URL);
}

function headers(): Record<string, string> {
  const token = process.env.HF_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Gradio 5 usa `/gradio_api/call`; versões antigas, `/call`. */
async function startCall(baseUrl: string, body: string, signal: AbortSignal): Promise<{ prefix: string; eventId: string }> {
  for (const prefix of ["/gradio_api/call", "/call"]) {
    const response = await fetch(`${baseUrl}${prefix}/${API_NAME}`, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body,
      signal,
    });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`Space respondeu ${response.status}.`);
    const parsed = eventSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Space: resposta inesperada ao iniciar.");
    return { prefix, eventId: parsed.data.event_id };
  }
  throw new Error("Space sem a API /mask.");
}

/** Lê o stream (SSE) até o evento `complete` (ou `error`). */
function parseStream(text: string): string {
  const blocks = text.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const event = /^event: *(.+)$/m.exec(block)?.[1]?.trim();
    const data = /^data: *(.*)$/m.exec(block)?.[1] ?? "";
    if (event === "error") throw new Error(`Space: erro na máscara (${data.slice(0, 200)}).`);
    if (event === "complete") {
      const parsed = resultSchema.safeParse(JSON.parse(data));
      if (!parsed.success) throw new Error("Space: resultado inesperado.");
      return parsed.data[0];
    }
  }
  throw new Error("Space: stream terminou sem resultado.");
}

/** Máscara da pessoa (PNG em tons de cinza, 255 = pessoa) no mesmo tamanho da foto recebida. */
export async function hfMattePng(image: Buffer): Promise<Buffer> {
  const baseUrl = process.env.HF_SPACE_URL?.replace(/\/+$/, "");
  if (!baseUrl) throw new Error("HF_SPACE_URL não configurada.");

  const { width, height } = await sharp(image).metadata();
  if (!width || !height) throw new Error("Imagem sem dimensões.");

  const signal = AbortSignal.timeout(HF_TIMEOUT_MS);
  const { prefix, eventId } = await startCall(baseUrl, JSON.stringify({ data: [image.toString("base64")] }), signal);
  const stream = await fetch(`${baseUrl}${prefix}/${API_NAME}/${eventId}`, { headers: headers(), signal });
  if (!stream.ok) throw new Error(`Space respondeu ${stream.status} no resultado.`);
  const maskBase64 = parseStream(await stream.text());

  return sharp(Buffer.from(maskBase64, "base64"))
    .flatten({ background: "#000000" })
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .extractChannel(0)
    .png()
    .toBuffer();
}
