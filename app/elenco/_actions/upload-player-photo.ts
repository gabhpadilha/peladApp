"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { PLAYER_PHOTOS_BUCKET } from "@/lib/player-photo";
import { requireActiveMembership, requireUserId } from "@/lib/session";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";

export type UploadPlayerPhotoResult = { success: true } | { success: false; message: string };

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** Largura final das fotos (a carta grande tem 288px; 640 cobre telas 2x). */
const PHOTO_WIDTH = 640;
const CACHE_ONE_YEAR = "31536000";

const inputSchema = z.object({
  memberId: z.uuid(),
  kind: z.enum(["cutout", "original"]),
});

function isImageFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0 && value.size <= MAX_UPLOAD_BYTES && ACCEPTED_TYPES.includes(value.type);
}

/** Padroniza qualquer entrada (PNG/JPEG/WebP) em WebP de 640px, mantendo a transparência do recorte. */
async function toCardWebp(file: File): Promise<Buffer> {
  return sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize({ width: PHOTO_WIDTH, withoutEnlargement: true })
    .webp({ quality: 85, alphaQuality: 90 })
    .toBuffer();
}

/**
 * Salva a foto da carta: o próprio jogador ou o dono da pelada. Recebe o
 * recorte sem fundo (feito no aparelho) e a foto original, guarda as duas e
 * aponta a carta para a escolhida (`kind`).
 */
export async function uploadPlayerPhoto(formData: FormData): Promise<UploadPlayerPhotoResult> {
  const userId = await requireUserId("/elenco");
  const membership = await requireActiveMembership("/elenco");

  const validation = inputSchema.safeParse({
    memberId: formData.get("memberId"),
    kind: formData.get("kind"),
  });
  if (!validation.success) {
    return { success: false, message: "Dados inválidos." };
  }
  const cutout = formData.get("cutout");
  const original = formData.get("original");
  if (!isImageFile(cutout) || !isImageFile(original)) {
    console.error("uploadPlayerPhoto: arquivo recusado", {
      cutout: cutout instanceof File ? { type: cutout.type, size: cutout.size } : typeof cutout,
      original: original instanceof File ? { type: original.type, size: original.size } : typeof original,
    });
    return { success: false, message: "Envie uma imagem PNG, JPEG ou WebP de até 3MB." };
  }
  if (!hasAdminEnv()) {
    return { success: false, message: "Falta a SUPABASE_SECRET_KEY no .env.local." };
  }

  const { memberId, kind } = validation.data;
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("group_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("group_id", membership.groupId)
    .maybeSingle();
  if (!member) {
    return { success: false, message: "Jogador não encontrado nessa pelada." };
  }
  // Cada um troca a própria foto; o dono troca a de qualquer jogador.
  if (member.user_id !== userId && !membership.isOwner) {
    return { success: false, message: "Você só pode trocar a sua própria foto." };
  }

  let cutoutWebp: Buffer;
  let originalWebp: Buffer;
  try {
    [cutoutWebp, originalWebp] = await Promise.all([toCardWebp(cutout), toCardWebp(original)]);
  } catch (error) {
    console.error("uploadPlayerPhoto: sharp falhou", error);
    return { success: false, message: "Não foi possível ler essa imagem. Tente outra foto." };
  }

  // Nome novo a cada envio: a URL muda e o cache antigo não aparece.
  const stamp = Date.now();
  const paths = { cutout: `${memberId}/${stamp}-cutout.webp`, original: `${memberId}/${stamp}-original.webp` };
  const storage = admin.storage.from(PLAYER_PHOTOS_BUCKET);
  const uploads = await Promise.all([
    storage.upload(paths.cutout, cutoutWebp, { contentType: "image/webp", cacheControl: CACHE_ONE_YEAR }),
    storage.upload(paths.original, originalWebp, { contentType: "image/webp", cacheControl: CACHE_ONE_YEAR }),
  ]);
  if (uploads.some((upload) => upload.error)) {
    console.error("uploadPlayerPhoto: Storage recusou", uploads.map((upload) => upload.error?.message));
    await storage.remove([paths.cutout, paths.original]);
    return { success: false, message: "Não foi possível enviar a foto. Tente de novo." };
  }

  const { error: updateError } = await admin
    .from("group_members")
    .update({ photo_path: paths[kind], photo_kind: kind })
    .eq("id", memberId);
  if (updateError) {
    await storage.remove([paths.cutout, paths.original]);
    return { success: false, message: "Não foi possível salvar a foto. Tente de novo." };
  }

  // Limpa as fotos anteriores do jogador (mantém só as deste envio).
  const { data: previous } = await storage.list(memberId);
  const stale = (previous ?? [])
    .map((file) => `${memberId}/${file.name}`)
    .filter((path) => path !== paths.cutout && path !== paths.original);
  if (stale.length > 0) await storage.remove(stale);

  revalidatePath("/", "layout");
  return { success: true };
}
