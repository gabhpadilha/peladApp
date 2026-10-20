import { getGroupEvaluations, getOvrByMember } from "@/lib/group-scores";
import { requireActiveMembership, type ActiveMembership, type PlayerPositionCode } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { toPlayerPhoto } from "@/lib/player-photo";
import { emailToUsername } from "@/lib/username";
import type { Database } from "@/types/database";
import { isCardSkinKey, type CardSkinKey } from "@/types/card-skin";
import type { PlayerPhoto } from "@/types/player";

export type GroupMemberSummary = {
  id: string;
  nickname: string;
  position: PlayerPositionCode;
  role: Database["public"]["Enums"]["member_role"];
  /** OVR atual (rodadas fechadas); `null` se ainda não foi avaliado. */
  ovr: number | null;
  /** Usuário de login (só para o dono); `null` em contas antigas, que entram por e-mail. */
  username: string | null;
  /** Nome completo (só para o dono, que edita o jogador). */
  fullName: string;
  /** Criou a pelada: único que gerencia pessoas. */
  isOwner: boolean;
  /** Foto atual da carta (prévia do upload); `null` sem foto. */
  photo: PlayerPhoto | null;
  /** Carta da Loja em uso (a prévia do upload mostra a carta de verdade). */
  cardSkin: CardSkinKey | null;
};

/** Jogador desativado (saiu da pelada); só o dono vê, para reativar. */
export type InactiveMemberSummary = {
  id: string;
  nickname: string;
  position: PlayerPositionCode;
};

export type Roster = {
  membership: ActiveMembership;
  /** Elenco ativo. */
  members: GroupMemberSummary[];
  /** Desativados; vazio para quem não é o dono. */
  inactiveMembers: InactiveMemberSummary[];
  /** Usuário (ou e-mail, nas contas antigas) da conta logada, para o card de senha. */
  login: string;
  /** Tela de login, para a mensagem de acesso dos jogadores cadastrados. */
  loginUrl: string;
};

export async function getRoster(): Promise<Roster> {
  const membership = await requireActiveMembership("/elenco");
  // Gestão de pessoas (usuários, edição, desativados) é só do dono.
  const isOwner = membership.isOwner;
  const supabase = await createClient();

  const [claimsResult, membersResult, evaluations] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("group_members")
      .select("id, user_id, nickname, position, role, deactivated_at, photo_path, photo_kind, card_skin")
      .eq("group_id", membership.groupId)
      .order("nickname"),
    getGroupEvaluations(membership.groupId),
  ]);
  if (membersResult.error) throw membersResult.error;

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .in(
      "id",
      membersResult.data.map((member) => member.user_id),
    );
  if (profilesError) throw profilesError;
  const profileByUser = new Map(profiles.map((profile) => [profile.id, profile]));
  const ovrByMember = getOvrByMember(evaluations);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return {
    membership,
    members: membersResult.data
      .filter((member) => member.deactivated_at === null)
      .map((member) => {
        const profile = profileByUser.get(member.user_id);
        return {
          id: member.id,
          nickname: member.nickname,
          position: member.position,
          role: member.role,
          ovr: ovrByMember.get(member.id) ?? null,
          username: isOwner ? (profile?.username ?? null) : null,
          fullName: isOwner ? (profile?.full_name ?? member.nickname) : "",
          isOwner: member.user_id === membership.ownerUserId,
          photo: toPlayerPhoto(member.photo_path, member.photo_kind),
          cardSkin: isCardSkinKey(member.card_skin) ? member.card_skin : null,
        };
      }),
    inactiveMembers: isOwner
      ? membersResult.data
          .filter((member) => member.deactivated_at !== null)
          .map((member) => ({ id: member.id, nickname: member.nickname, position: member.position }))
      : [],
    login: (() => {
      const email = claimsResult.data?.claims.email ?? "";
      return emailToUsername(email) ?? email;
    })(),
    loginUrl: `${siteUrl}/entrar`,
  };
}
