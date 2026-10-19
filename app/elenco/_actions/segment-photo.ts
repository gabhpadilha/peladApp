"use server";

import { personMattePng } from "@/lib/person-matte";
import { requireActiveMembership } from "@/lib/session";

export type SegmentPhotoResult = { success: true; maskBase64: string } | { success: false; message: string };

/** A foto já vem reduzida pelo aparelho (lado maior 1280px, JPEG). */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Reserva do recorte de fundo: quando o aparelho não roda o MediaPipe, o
 * servidor devolve a máscara da pessoa e o aparelho segue o mesmo
 * enquadramento de sempre. Não grava nada.
 */
export async function segmentPhoto(formData: FormData): Promise<SegmentPhotoResult> {
  await requireActiveMembership("/elenco");

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > MAX_UPLOAD_BYTES || !ACCEPTED_TYPES.includes(photo.type)) {
    return { success: false, message: "Envie uma imagem PNG, JPEG ou WebP de até 3MB." };
  }

  try {
    const mask = await personMattePng(Buffer.from(await photo.arrayBuffer()));
    return { success: true, maskBase64: mask.toString("base64") };
  } catch (error) {
    console.error("segmentPhoto: recorte no servidor falhou", error);
    return { success: false, message: "Não foi possível tirar o fundo da foto." };
  }
}
