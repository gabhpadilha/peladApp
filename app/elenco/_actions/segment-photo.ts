"use server";

import { hasHfSpace, hfMattePng } from "@/lib/hf-matte";
import { personMattePng } from "@/lib/person-matte";
import { hasRemoveBgKey, removeBgMattePng } from "@/lib/remove-bg-matte";
import { requireActiveMembership } from "@/lib/session";

export type SegmentPhotoResult = { success: true; maskBase64: string } | { success: false; message: string };

/** A foto já vem reduzida pelo aparelho (lado maior 1280px, JPEG). */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type MatteProvider = { name: string; isEnabled: () => boolean; run: (image: Buffer, contentType: string) => Promise<Buffer> };

/**
 * Ordem do recorte, todos gratuitos: BiRefNet no Space do Hugging Face
 * (`HF_SPACE_URL`), remove.bg no plano grátis (`REMOVE_BG_API_KEY`) e, por
 * último, o MODNet local (sempre disponível, mas fraco em foto escura).
 */
const PROVIDERS: MatteProvider[] = [
  { name: "Hugging Face", isEnabled: hasHfSpace, run: (image) => hfMattePng(image) },
  { name: "remove.bg", isEnabled: hasRemoveBgKey, run: removeBgMattePng },
  { name: "MODNet", isEnabled: () => true, run: (image) => personMattePng(image) },
];

/** Máscara da pessoa para o recorte da carta; o aparelho faz o enquadramento com ela. Não grava nada. */
export async function segmentPhoto(formData: FormData): Promise<SegmentPhotoResult> {
  await requireActiveMembership("/elenco");

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > MAX_UPLOAD_BYTES || !ACCEPTED_TYPES.includes(photo.type)) {
    return { success: false, message: "Envie uma imagem PNG, JPEG ou WebP de até 3MB." };
  }
  const image = Buffer.from(await photo.arrayBuffer());

  for (const provider of PROVIDERS) {
    if (!provider.isEnabled()) continue;
    try {
      const mask = await provider.run(image, photo.type);
      return { success: true, maskBase64: mask.toString("base64") };
    } catch (error) {
      console.error(`segmentPhoto: ${provider.name} falhou`, error);
    }
  }
  return { success: false, message: "Não foi possível tirar o fundo da foto." };
}
