"use server";

import { hasHfSpace, hfEnhanceAndMatte } from "@/lib/hf-matte";
import { personMattePng } from "@/lib/person-matte";
import { hasRemoveBgKey, removeBgMattePng } from "@/lib/remove-bg-matte";
import { requireActiveMembership } from "@/lib/session";

/** `photoBase64`: a foto melhorada (JPEG, mesmo tamanho), só quando veio do Space; a máscara é dela. */
export type SegmentPhotoResult =
  | { success: true; maskBase64: string; photoBase64?: string }
  | { success: false; message: string };

/** A foto já vem reduzida pelo aparelho (lado maior 1280px, JPEG). */
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type MatteResult = { mask: Buffer; photo?: Buffer };
type MatteProvider = { name: string; isEnabled: () => boolean; run: (image: Buffer, contentType: string) => Promise<MatteResult> };

/**
 * Ordem do recorte, todos gratuitos: BiRefNet no Space do Hugging Face
 * (`HF_SPACE_URL`, que também melhora a foto), remove.bg no plano grátis
 * (`REMOVE_BG_API_KEY`) e, por último, o MODNet local (sempre disponível, mas
 * fraco em foto escura). As reservas só recortam: a foto segue como veio.
 */
const PROVIDERS: MatteProvider[] = [
  { name: "Hugging Face", isEnabled: hasHfSpace, run: (image) => hfEnhanceAndMatte(image) },
  { name: "remove.bg", isEnabled: hasRemoveBgKey, run: async (image, contentType) => ({ mask: await removeBgMattePng(image, contentType) }) },
  { name: "MODNet", isEnabled: () => true, run: async (image) => ({ mask: await personMattePng(image) }) },
];

/** Máscara da pessoa (e, pelo Space, a foto melhorada) para o recorte da carta; o aparelho faz o enquadramento. Não grava nada. */
export async function segmentPhoto(formData: FormData): Promise<SegmentPhotoResult> {
  await requireActiveMembership("/elenco");

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > MAX_UPLOAD_BYTES || !ACCEPTED_TYPES.includes(photo.type)) {
    return { success: false, message: "Use uma foto PNG, JPEG ou WebP de até 3 MB." };
  }
  const image = Buffer.from(await photo.arrayBuffer());

  for (const provider of PROVIDERS) {
    if (!provider.isEnabled()) continue;
    const startedAt = Date.now();
    try {
      const { mask, photo: enhanced } = await provider.run(image, photo.type);
      // Mostra nos logs da Vercel quem recortou (ex.: se o Space caiu para a reserva).
      console.info(`segmentPhoto: máscara via ${provider.name} em ${Date.now() - startedAt}ms${enhanced ? " (foto melhorada)" : ""}`);
      return { success: true, maskBase64: mask.toString("base64"), photoBase64: enhanced?.toString("base64") };
    } catch (error) {
      console.error(`segmentPhoto: ${provider.name} falhou em ${Date.now() - startedAt}ms`, error);
    }
  }
  return { success: false, message: "Não consegui recortar essa foto. Tente outra, com boa luz e o rosto de frente." };
}
