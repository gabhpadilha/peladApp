import "server-only";
import { getOwnPurchases } from "@/app/loja/_data-access/get-shop";
import { getLeague } from "@/lib/league";
import { getMarketListings, getMyListings, type MarketListing, type MyListing } from "@/lib/market-listings";
import type { CardSkinKey } from "@/types/card-skin";
import type { Player } from "@/types/player";

export type Market = {
  me: Player;
  groupName: string;
  /** CanchaCoins ganhas (rodadas, pacotes e vendas) − o que já gastou. */
  balance: number;
  /** Anúncios no ar de todas as peladas, mais recentes primeiro. */
  listings: MarketListing[];
  /** Skins que o jogador já tem (não dá para comprar de novo). */
  owned: CardSkinKey[];
  /** Os anúncios do próprio jogador (ativos, vendidos, cancelados e vencidos). */
  myListings: MyListing[];
};

/** Tudo o que o Mercado e "Meus anúncios" mostram para o logado, na pelada ativa. */
export async function getMarket(nextPath: string): Promise<Market | null> {
  const league = await getLeague(nextPath);
  const me = league.players.find((player) => player.id === league.currentMemberId);
  if (!me) return null;
  const groupId = league.membership.groupId;
  const [{ owned, spent }, listings, myListings] = await Promise.all([
    getOwnPurchases(me.id),
    getMarketListings(groupId),
    getMyListings(groupId),
  ]);
  return {
    me,
    groupName: league.membership.groupName,
    balance: Math.max(0, league.getProgression(me.id).coinsEarned - spent),
    listings,
    owned: [...owned],
    myListings,
  };
}
