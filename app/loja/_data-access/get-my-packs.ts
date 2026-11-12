import "server-only";
import { isPackRarity, isPackSource, isPackTier, PACK_RARITY_ORDER, type MyPack, type PackItem } from "@/lib/packs";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Skins de um pacote de várias, como o banco devolve (`[{ skin, rarity, was_duplicate }]`). */
function parseItems(raw: unknown): PackItem[] | null {
  if (!Array.isArray(raw)) return null;
  const items: PackItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { skin, rarity, was_duplicate: wasDuplicate } = entry as Record<string, unknown>;
    if (typeof skin === "string" && typeof rarity === "string" && isPackRarity(rarity)) {
      items.push({ skin, rarity, wasDuplicate: wasDuplicate === true });
    }
  }
  return items.length > 0 ? items : null;
}

/** Pacotes do logado nesta pelada (guardados e abertos), do mais novo para o mais antigo. */
export async function getMyPacks(): Promise<MyPack[]> {
  const membership = await requireActiveMembership("/loja");
  const supabase = await createClient();
  const packsResult = await supabase.rpc("get_my_packs");
  if (packsResult.error) throw packsResult.error;

  return packsResult.data
    .filter((pack) => pack.group_id === membership.groupId && isPackTier(pack.tier))
    .toReversed()
    .map((pack): MyPack => {
      const odds: MyPack["odds"] = {};
      const raw = pack.odds && typeof pack.odds === "object" && !Array.isArray(pack.odds) ? pack.odds : {};
      for (const rarity of PACK_RARITY_ORDER) {
        const value = raw[rarity];
        if (typeof value === "number") odds[rarity] = value;
      }
      return {
        id: pack.pack_id,
        matchId: pack.match_id,
        round: pack.round,
        month: pack.month,
        tier: pack.tier as MyPack["tier"],
        odds,
        openedAt: pack.opened_at,
        skin: pack.skin,
        rarity: pack.rarity !== null && isPackRarity(pack.rarity) ? pack.rarity : null,
        wasDuplicate: pack.was_duplicate,
        coinsAwarded: pack.coins_awarded,
        source: isPackSource(pack.source) ? pack.source : "round",
        price: pack.price,
        size: pack.size,
        place: pack.place,
        items: parseItems(pack.items),
      };
    });
}
