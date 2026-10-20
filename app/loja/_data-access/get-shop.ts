import "server-only";
import { getLeague } from "@/lib/league";
import { createClient } from "@/lib/supabase/server";
import { CARD_SKINS, isCardSkinKey, type CardSkin, type CardSkinKey } from "@/types/card-skin";
import type { Player } from "@/types/player";
import type { Progression } from "@/lib/progression";

export type ShopItemState = "equipped" | "owned" | "available" | "locked";

export type ShopItem = {
  /** `null` = carta padrão (faixa do OVR), sempre do jogador. */
  skin: CardSkinKey | null;
  name: string;
  level: number;
  price: number;
  state: ShopItemState;
};

export type Shop = {
  me: Player;
  groupName: string;
  progression: Progression;
  /** PeladaCoins ganhas − o que já gastou. */
  balance: number;
  items: ShopItem[];
  /** Próxima carta liberada por nível (ou nenhuma). */
  nextUnlock: CardSkin | null;
};

/** Spent e compras do próprio jogador (o RLS deixa todos da pelada lerem). */
export async function getOwnPurchases(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("card_skin_purchases").select("skin, price").eq("member_id", memberId);
  if (error) throw error;
  const owned = new Set(data.map((purchase) => purchase.skin).filter(isCardSkinKey));
  const spent = data.reduce((total, purchase) => total + purchase.price, 0);
  return { owned, spent };
}

export async function getShop(): Promise<Shop | null> {
  const league = await getLeague("/loja");
  const me = league.players.find((player) => player.id === league.currentMemberId);
  if (!me) return null;

  const progression = league.getProgression(me.id);
  const { owned, spent } = await getOwnPurchases(me.id);
  const equipped = me.cardSkin ?? null;

  const items: ShopItem[] = [
    { skin: null, name: "Padrão", level: 0, price: 0, state: equipped === null ? "equipped" : "owned" },
    ...CARD_SKINS.map((skin): ShopItem => {
      const state: ShopItemState =
        equipped === skin.key
          ? "equipped"
          : owned.has(skin.key)
            ? "owned"
            : progression.level >= skin.level
              ? "available"
              : "locked";
      return { skin: skin.key, name: skin.name, level: skin.level, price: skin.price, state };
    }),
  ];

  return {
    me,
    groupName: league.membership.groupName,
    progression,
    balance: Math.max(0, progression.coinsEarned - spent),
    items,
    nextUnlock: CARD_SKINS.find((skin) => skin.level > progression.level) ?? null,
  };
}
