/**
 * Recorte principal, no servidor: máscara da pessoa pelo remove.bg, no plano
 * gratuito (50 chamadas por mês em tamanho "preview", até 0,25MP). A máscara
 * é só o alfa; o aparelho a amplia para a foto e faz o enquadramento, então a
 * resolução baixa não aparece na carta. Recorta bem até camisa escura em
 * fundo escuro, onde o MODNet local deixava buracos.
 * Sem `REMOVE_BG_API_KEY`, ou se a cota acabar (402), quem chama segue para o
 * MODNet (`lib/person-matte.ts`). Só importe em Server Actions.
 */
import sharp from "sharp";

const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";
/** O aparelho espera o servidor por mais tempo (`REMOTE_TIMEOUT_MS`), contando o MODNet de reserva. */
const REMOVE_BG_TIMEOUT_MS = 15_000;

export function hasRemoveBgKey(): boolean {
  return Boolean(process.env.REMOVE_BG_API_KEY);
}

/** Máscara da pessoa (PNG em tons de cinza, 255 = pessoa) no mesmo tamanho da foto recebida. */
export async function removeBgMattePng(image: Buffer, contentType: string): Promise<Buffer> {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) throw new Error("REMOVE_BG_API_KEY não configurada.");

  const { width, height } = await sharp(image).metadata();
  if (!width || !height) throw new Error("Imagem sem dimensões.");

  const form = new FormData();
  form.append("image_file", new Blob([new Uint8Array(image)], { type: contentType }), "photo");
  // "preview" é o tamanho que o plano gratuito cobre.
  form.append("size", "preview");
  form.append("type", "person");
  form.append("format", "png");
  // Só o alfa: a cor continua vindo da foto original.
  form.append("channels", "alpha");

  const response = await fetch(REMOVE_BG_ENDPOINT, {
    method: "POST",
    headers: { "X-Api-Key": key },
    body: form,
    signal: AbortSignal.timeout(REMOVE_BG_TIMEOUT_MS),
  });
  if (!response.ok) {
    // 402 = cota gratuita do mês acabou; 429 = limite de requisições.
    throw new Error(`remove.bg respondeu ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  // Achata sobre preto: serve tanto para máscara em cinza quanto para branco com alfa.
  return sharp(Buffer.from(await response.arrayBuffer()))
    .flatten({ background: "#000000" })
    .resize(width, height, { fit: "fill" })
    .greyscale()
    .extractChannel(0)
    .png()
    .toBuffer();
}
