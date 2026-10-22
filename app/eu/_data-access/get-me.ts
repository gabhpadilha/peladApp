import "server-only";
import type { GroupMemberSummary } from "@/app/elenco/_data-access/get-roster";
import { getMyCards, getOwnPurchases, type ShopItem } from "@/app/loja/_data-access/get-shop";
import { getLeague } from "@/lib/league";
import type { Progression } from "@/lib/progression";
import { createClient } from "@/lib/supabase/server";
import { emailToUsername } from "@/lib/username";
import type { Player } from "@/types/player";

export type Me = {
  me: Player;
  groupName: string;
  progression: Progression;
  /** PeladaCoins ganhas − o que já gastou. */
  balance: number;
  /** "Minhas cartas": a padrão e as compradas. */
  cards: ShopItem[];
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
  const [{ owned, spent }, claimsResult] = await Promise.all([getOwnPurchases(me.id), supabase.auth.getClaims()]);
  const progression = league.getProgression(me.id);
  const email = claimsResult.data?.claims.email ?? "";

  return {
    me,
    groupName: league.membership.groupName,
    progression,
    balance: Math.max(0, progression.coinsEarned - spent),
    cards: getMyCards(me, owned),
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
