import { getSupabaseEnv } from "@/lib/supabase/env";
import type { PlayerPhoto } from "@/types/player";

/** Bucket público das fotos das cartas (migration player_photos_bucket). */
export const PLAYER_PHOTOS_BUCKET = "player-photos";

/**
 * Foto da carta a partir de `group_members.photo_path`/`photo_kind`; `null`
 * sem foto (a carta mostra as iniciais).
 */
export function toPlayerPhoto(path: string | null, kind: string | null): PlayerPhoto | null {
  if (!path) return null;
  const { url } = getSupabaseEnv();
  return {
    url: `${url}/storage/v1/object/public/${PLAYER_PHOTOS_BUCKET}/${path}`,
    kind: kind === "cutout" ? "cutout" : "original",
  };
}
