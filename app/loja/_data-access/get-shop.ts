import "server-only";
import { getLeague } from "@/lib/league";
import { PACK_RARITY_ORDER, PACK_SHOP_PRICES, PACK_SHOP_TIERS, isPackRarity, isPackTier, type PackRarity, type PackTier } from "@/lib/packs";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveSale, getSalePrice, type ShopSale } from "@/lib/shop-sale";
import { getCurrentShopEvent, type CurrentShopEvent } from "@/lib/shop-events";
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
  event: CurrentShopEvent | null;
  items: ShopItem[];
};

/** Um pacote à venda (uma faixa), com o preço de hoje e as chances de cada raridade neste mês. */
export type ShopPack = {
  tier: PackTier;
  price: number;
  /** Preço de tabela quando há promoção (para riscar); `null` sem promoção. */
  originalPrice: number | null;
  odds: Partial<Record<PackRarity, number>>;
};

/** Os pacotes do mês na Loja, ou `null` quando o conjunto do mês ainda não foi cadastrado. */
export type ShopPacks = { month: string; eventLabel: string | null; items: ShopPack[] };

export type Shop = {
  me: Player;
  groupName: string;
  progression: Progression;
  /** CanchaCoins ganhas − o que já gastou. */
  balance: number;
  /** Cartas à venda que o jogador ainda não tem (as fixas; as de evento só saem em pacote). */
  sections: ShopSection[];
  /** Pacotes à venda neste mês (`null` = sem conjunto cadastrado). */
  packs: ShopPacks | null;
  /** Promoção valendo hoje (ex.: Black Friday), ou nenhuma. */
  sale: ShopSale | null;
  /** Próxima carta à venda liberada por nível (ou nenhuma). */
  nextUnlock: CardSkin | null;
};

/** "Hoje" no fuso da pelada, `AAAA-MM-DD` (o servidor roda em UTC). */
const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/**
 * Gasto e skins em posse do próprio jogador (o RLS deixa todos da pelada lerem). Skin vendida no Mercado
 * continua no gasto (o preço pago não volta) e sai da posse (`transferred_at`).
 */
export async function getOwnPurchases(memberId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_skin_purchases")
    .select("skin, price, transferred_at")
    .eq("member_id", memberId);
  if (error) throw error;
  const owned = new Set(data.filter((purchase) => purchase.transferred_at === null).map((purchase) => purchase.skin).filter(isCardSkinKey));
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

/**
 * Pacotes do mês: as raridades que existem no conjunto (`pack_sets`) e as chances de cada faixa (`pack_tier_odds`), normalizadas como o
 * sorteio do banco faz. As duas tabelas não têm acesso pelo login do jogador, então a leitura vai pela chave secreta (só leitura).
 */
async function getShopPacks(today: string, sale: ShopSale | null): Promise<ShopPacks | null> {
  if (!hasAdminEnv()) return null;
  const month = today.slice(0, 7);
  const admin = createAdminClient();
  const [setResult, oddsResult] = await Promise.all([
    admin.from("pack_sets").select("rarity").eq("month", month),
    admin.from("pack_tier_odds").select("tier, rarity, weight"),
  ]);
  if (setResult.error || oddsResult.error) {
    console.error("getShopPacks: leitura falhou", setResult.error ?? oddsResult.error);
    return null;
  }
  const present = new Set(setResult.data.map((row) => row.rarity).filter(isPackRarity));
  if (present.size === 0) return null;

  const items = PACK_SHOP_TIERS.map((tier): ShopPack => {
    const weights = oddsResult.data.filter((row) => row.tier === tier && isPackRarity(row.rarity) && present.has(row.rarity));
    const total = weights.reduce((sum, row) => sum + Number(row.weight), 0);
    const odds: ShopPack["odds"] = {};
    for (const rarity of PACK_RARITY_ORDER) {
      const row = weights.find((candidate) => candidate.rarity === rarity);
      if (row && total > 0) odds[rarity] = Math.round((1000 * Number(row.weight)) / total) / 10;
    }
    const tablePrice = PACK_SHOP_PRICES[tier];
    return { tier, price: getSalePrice(tablePrice, sale), originalPrice: sale ? tablePrice : null, odds };
  }).filter((item) => isPackTier(item.tier));
  return { month, eventLabel: getCurrentShopEvent(today).label, items };
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
  const event = getCurrentShopEvent(today);
  const eventSkins = forSale.filter((skin) => "event" in skin);
  const premiumSkins = forSale.filter((skin) => !("event" in skin));

  const sections: ShopSection[] = [
    ...(eventSkins.length > 0
      ? [{ key: "event" as const, title: `Evento · ${event.label}`, event, items: eventSkins.map(toItem) }]
      : []),
    ...(premiumSkins.length > 0 ? [{ key: "premium" as const, title: "Personalização premium", event: null, items: premiumSkins.map(toItem) }] : []),
  ];

  return {
    me,
    groupName: league.membership.groupName,
    progression,
    balance: Math.max(0, progression.coinsEarned - spent),
    sections,
    packs: await getShopPacks(today, sale),
    sale,
    nextUnlock: forSale.filter((skin) => skin.level > progression.level).sort((a, b) => a.level - b.level)[0] ?? null,
  };
}
