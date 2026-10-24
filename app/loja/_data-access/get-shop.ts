import "server-only";
import { getLeague } from "@/lib/league";
import { createClient } from "@/lib/supabase/server";
import { getActiveSale, getSalePrice, type ShopSale } from "@/lib/shop-sale";
import { CARD_THEME_LABELS, getCurrentCardEvent, type CurrentCardEvent } from "@/lib/card-themes";
import { CARD_SKINS, isCardSkinKey, isCardSkinOnSale, type CardSkin, type CardSkinKey } from "@/types/card-skin";
import type { Player } from "@/types/player";
import type { Progression } from "@/lib/progression";

export type ShopItemState = "equipped" | "owned" | "available" | "locked";

export type ShopItem = {
  /** `null` = carta padrão (faixa do OVR), sempre do jogador. */
  skin: CardSkinKey | null;
  name: string;
  level: number;
  /** O que custa agora (com o desconto da promoção, se houver). */
  price: number;
  /** Preço de tabela quando há promoção (para riscar); `null` sem promoção. */
  originalPrice: number | null;
  state: ShopItemState;
};

/** Uma vitrine da Loja (cartas de evento ou cartas premium, as fixas). */
export type ShopSection = {
  key: "event" | "premium";
  title: string;
  /** Ex.: "Até 31 de out. · faltam 10 dias". */
  event: CurrentCardEvent | null;
  items: ShopItem[];
};

export type Shop = {
  me: Player;
  groupName: string;
  progression: Progression;
  /** CanchaCoins ganhas − o que já gastou. */
  balance: number;
  /** Cartas à venda que o jogador ainda não tem: evento do mês primeiro. */
  sections: ShopSection[];
  /** Promoção valendo hoje (ex.: Black Friday), ou nenhuma. */
  sale: ShopSale | null;
  /** Próxima carta à venda liberada por nível (ou nenhuma). */
  nextUnlock: CardSkin | null;
};

/** "Hoje" no fuso da pelada, `AAAA-MM-DD` (o servidor roda em UTC). */
const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/** Spent e compras do próprio jogador (o RLS deixa todos da pelada lerem). */
export async function getOwnPurchases(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("card_skin_purchases").select("skin, price").eq("member_id", memberId);
  if (error) throw error;
  const owned = new Set(data.map((purchase) => purchase.skin).filter(isCardSkinKey));
  const spent = data.reduce((total, purchase) => total + purchase.price, 0);
  return { owned, spent };
}

/**
 * "Minhas cartas" (página Eu): a padrão e as compradas, inclusive de eventos que
 * já acabaram, com a que está em uso marcada.
 */
export function getMyCards(me: Player, owned: ReadonlySet<CardSkinKey>): ShopItem[] {
  const equipped = me.cardSkin ?? null;
  return [
    { skin: null, name: "Padrão", level: 0, price: 0, originalPrice: null, state: equipped === null ? "equipped" : "owned" },
    ...CARD_SKINS.filter((skin) => owned.has(skin.key)).map(
      (skin): ShopItem => ({
        skin: skin.key,
        name: skin.name,
        level: skin.level,
        price: skin.price,
        originalPrice: null,
        state: equipped === skin.key ? "equipped" : "owned",
      }),
    ),
  ];
}

export async function getShop(): Promise<Shop | null> {
  const league = await getLeague("/loja");
  const me = league.players.find((player) => player.id === league.currentMemberId);
  if (!me) return null;

  const progression = league.getProgression(me.id);
  const { owned, spent } = await getOwnPurchases(me.id);
  const equipped = me.cardSkin ?? null;

  const today = todayFormatter.format(new Date());
  const sale = getActiveSale(today);

  const toItem = (skin: CardSkin): ShopItem => ({
    skin: skin.key,
    name: skin.name,
    level: skin.level,
    price: getSalePrice(skin.price, sale),
    originalPrice: sale && skin.price > 0 ? skin.price : null,
    state:
      equipped === skin.key ? "equipped" : owned.has(skin.key) ? "owned" : progression.level >= skin.level ? "available" : "locked",
  });

  // À venda: o que o jogador ainda não tem (carta de evento só durante o evento).
  const forSale = CARD_SKINS.filter((skin) => !owned.has(skin.key) && isCardSkinOnSale(skin, today));
  const event = getCurrentCardEvent(today);
  const eventSkins = forSale.filter((skin) => "event" in skin);
  const premiumSkins = forSale.filter((skin) => !("event" in skin));

  const sections: ShopSection[] = [
    ...(eventSkins.length > 0
      ? [{ key: "event" as const, title: `Evento · ${CARD_THEME_LABELS[event.theme]}`, event, items: eventSkins.map(toItem) }]
      : []),
    ...(premiumSkins.length > 0 ? [{ key: "premium" as const, title: "Personalização premium", event: null, items: premiumSkins.map(toItem) }] : []),
  ];

  return {
    me,
    groupName: league.membership.groupName,
    progression,
    balance: Math.max(0, progression.coinsEarned - spent),
    sections,
    sale,
    nextUnlock: forSale.filter((skin) => skin.level > progression.level).sort((a, b) => a.level - b.level)[0] ?? null,
  };
}
