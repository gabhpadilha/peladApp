"use server";

import { falMattePng, hasFalKey } from "@/lib/fal-matte";
import { personMattePng } from "@/lib/person-matte";
import { requireActiveMembership } from "@/lib/session";

export type SegmentPhotoResult = { success: true; maskBase64: string } | { success: false; message: string };

/** A foto já vem reduzida pelo aparelho (lado maior 1280px, JPEG). */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Máscara da pessoa para o recorte da carta: BiRefNet no fal.ai (com
 * `FAL_KEY`) e, se ele falhar ou não estiver configurado, o MODNet local.
 * O aparelho faz o enquadramento com ela. Não grava nada.
 */
export async function segmentPhoto(formData: FormData): Promise<SegmentPhotoResult> {
  await requireActiveMembership("/elenco");

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > MAX_UPLOAD_BYTES || !ACCEPTED_TYPES.includes(photo.type)) {
    return { success: false, message: "Envie uma imagem PNG, JPEG ou WebP de até 3MB." };
  }
  const image = Buffer.from(await photo.arrayBuffer());

  if (hasFalKey()) {
    try {
      const mask = await falMattePng(image, photo.type);
      return { success: true, maskBase64: mask.toString("base64") };
    } catch (error) {
      console.error("segmentPhoto: fal.ai falhou; usando o MODNet", error);
    }
  }

  try {
    const mask = await personMattePng(image);
    return { success: true, maskBase64: mask.toString("base64") };
  } catch (error) {
    console.error("segmentPhoto: recorte no servidor falhou", error);
    return { success: false, message: "Não foi possível tirar o fundo da foto." };
  }
}
