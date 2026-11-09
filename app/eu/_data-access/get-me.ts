import "server-only";
import type { GroupMemberSummary } from "@/app/elenco/_data-access/get-roster";
import { getMyCards, getOwnPurchases, type ShopItem } from "@/app/loja/_data-access/get-shop";
import { getLeague } from "@/lib/league";
import { getMarketPriceRange, getMarketSuggestedPrice, type PriceRange } from "@/lib/market";
import { getMyListings } from "@/lib/market-listings";
import type { Progression } from "@/lib/progression";
import { createClient } from "@/lib/supabase/server";
import { emailToUsername } from "@/lib/username";
import type { Player } from "@/types/player";

/** O que "Minhas cartas" precisa saber do Mercado para cada skin em posse. */
export type MyCardMarket = {
  /** Anúncio ativo da skin (enquanto existe, a carta não pode ser usada). */
  listing: { id: string; price: number; remainingLabel: string } | null;
  /** Faixa permitida, ou `null` quando a skin não pode ser vendida (Esmeralda). */
  range: PriceRange | null;
  suggestedPrice: number | null;
};

export type Me = {
  me: Player;
  groupName: string;
  progression: Progression;
  /** CanchaCoins ganhas − o que já gastou. */
  balance: number;
  /** "Minhas cartas": a padrão e as compradas. */
  cards: ShopItem[];
  /** Mercado de cada skin em posse, pela chave da skin. */
  market: Record<string, MyCardMarket>;
  /** O jogador no formato do envio de foto (mesmo componente do Elenco). */
  photoMember: GroupMemberSummary;
  /** Usuário (ou e-mail, nas contas antigas) da conta logada, para o card de senha. */
  login: string;
};

/** Página Eu: a carta, as cartas compradas, a foto e os dados da própria conta. */
export async function getMe(): Promise<Me | null> {
  const league = await getLeague("/eu");
  const me = league.players.find((player) => player.id === league.currentMemberId);
  if (!me) return null;

  const supabase = await createClient();
  const [{ owned, spent }, claimsResult, listings] = await Promise.all([
    getOwnPurchases(me.id),
    supabase.auth.getClaims(),
    getMyListings(league.membership.groupId),
  ]);
  const market: Record<string, MyCardMarket> = {};
  for (const skin of owned) {
    const active = listings.find((listing) => listing.skin === skin && listing.status === "active");
    market[skin] = {
      listing: active ? { id: active.id, price: active.price, remainingLabel: active.remainingLabel ?? "" } : null,
      range: getMarketPriceRange(skin),
      suggestedPrice: getMarketSuggestedPrice(skin),
    };
  }
  const progression = league.getProgression(me.id);
  const email = claimsResult.data?.claims.email ?? "";

  return {
    me,
    groupName: league.membership.groupName,
    progression,
    balance: Math.max(0, progression.coinsEarned - spent),
    cards: getMyCards(me, owned),
    market,
    photoMember: {
      id: me.id,
      nickname: me.nickname,
      position: me.position,
      role: league.membership.role,
      ovr: me.ovr,
      username: null,
      fullName: me.fullName,
      isOwner: league.membership.isOwner,
      photo: me.photo ?? null,
      cardSkin: me.cardSkin ?? null,
    },
    login: emailToUsername(email) ?? email,
  };
}
