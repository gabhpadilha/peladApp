/**
 * Recorte principal, no servidor: máscara da pessoa pelo BiRefNet (versão
 * Portrait, MIT) hospedado no fal.ai. Recorta bem até camisa escura em fundo
 * escuro, onde o MODNet local deixava buracos; não cabe na Vercel (precisa de
 * ~7GB de memória), por isso roda fora. Cobra por uso (frações de centavo por foto).
 * Sem `FAL_KEY`, quem chama segue para o MODNet (`lib/person-matte.ts`).
 * Só importe em Server Actions.
 */
import sharp from "sharp";
import { z } from "zod";

const FAL_ENDPOINT = "https://fal.run/fal-ai/birefnet/v2";
/** Cold start incluído; o aparelho espera o servidor por mais tempo (`REMOTE_TIMEOUT_MS`). */
const FAL_TIMEOUT_MS = 15_000;

const responseSchema = z.object({ image: z.object({ url: z.string().min(1) }) });

export function hasFalKey(): boolean {
  return Boolean(process.env.FAL_KEY);
}

/** Lê a imagem devolvida: data URI (`sync_mode`) ou URL do CDN do fal. */
async function readImage(url: string): Promise<Buffer> {
  const dataUri = /^data:[^;,]+;base64,/.exec(url);
  if (dataUri) return Buffer.from(url.slice(dataUri[0].length), "base64");
  const response = await fetch(url, { signal: AbortSignal.timeout(FAL_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`fal.ai: download da máscara falhou (${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

/** Máscara da pessoa (PNG em tons de cinza, 255 = pessoa) no mesmo tamanho da foto recebida. */
export async function falMattePng(image: Buffer, contentType: string): Promise<Buffer> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY não configurada.");

  const { width, height } = await sharp(image).metadata();
  if (!width || !height) throw new Error("Imagem sem dimensões.");

  const response = await fetch(FAL_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: `data:${contentType};base64,${image.toString("base64")}`,
      model: "Portrait",
      operating_resolution: "1024x1024",
      mask_only: true,
      output_format: "png",
      // Devolve a máscara na resposta e não guarda a foto no histórico do fal.
      sync_mode: true,
    }),
    signal: AbortSignal.timeout(FAL_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`fal.ai respondeu ${response.status}.`);
  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("fal.ai: resposta inesperada.");

  // Achata sobre preto: serve tanto para máscara em cinza quanto para branco com alfa.
  return sharp(await readImage(parsed.data.image.url))
    .flatten({ background: "#000000" })
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .extractChannel(0)
    .png()
    .toBuffer();
}
