import "server-only";
import { isPackRarity, isPackTier, PACK_RARITY_ORDER, type MyPack } from "@/lib/packs";
import { requireActiveMembership } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Pacotes do logado nesta pelada (guardados e abertos), do mais novo para o mais antigo. */
export async function getMyPacks(): Promise<MyPack[]> {
  const membership = await requireActiveMembership("/loja");
  const supabase = await createClient();
  const [packsResult, matchesResult] = await Promise.all([
    supabase.rpc("get_my_packs"),
    supabase.from("matches").select("id").eq("group_id", membership.groupId),
  ]);
  if (packsResult.error) throw packsResult.error;
  if (matchesResult.error) throw matchesResult.error;
  const groupMatchIds = new Set(matchesResult.data.map((match) => match.id));

  return packsResult.data
    .filter((pack) => groupMatchIds.has(pack.match_id) && isPackTier(pack.tier))
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
      };
    })
    .toSorted((a, b) => b.round - a.round);
}
