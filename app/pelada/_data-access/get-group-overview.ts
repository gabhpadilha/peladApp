import { getGroupEvaluations, getOvrByMember } from "@/lib/group-scores";
import { requireActiveMembership, type ActiveMembership, type PlayerPositionCode } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { emailToUsername } from "@/lib/username";
import { AWARD_KINDS, type AwardKind } from "@/types/award";
import type { Database } from "@/types/database";

const SITE_TIME_ZONE = "America/Sao_Paulo";

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
  /** Criou a pelada: só ele muda papéis, e os outros organizadores não mexem nele. */
  isOwner: boolean;
};

/** Jogador desativado (saiu da pelada); só o organizador vê, para reativar. */
export type InactiveMemberSummary = {
  id: string;
  nickname: string;
  position: PlayerPositionCode;
};

export type MatchSummary = {
  id: string;
  round: number;
  playedOn: string;
  status: Database["public"]["Enums"]["match_status"];
  presentCount: number;
  teamCount: number;
  submittedCount: number;
  /** Ganhadores das cartas especiais (só em rodadas fechadas). */
  winners: { kind: AwardKind; nickname: string }[];
};

export type GroupOverview = {
  membership: ActiveMembership;
  isOrganizer: boolean;
  /** Elenco ativo (sorteio, rodadas, ranking). */
  members: GroupMemberSummary[];
  /** Desativados; vazio para quem não é o dono. */
  inactiveMembers: InactiveMemberSummary[];
  /** Nome completo de quem está logado, para o card "Seu perfil". */
  myFullName: string;
  matches: MatchSummary[];
  /** Hoje no fuso da pelada (`AAAA-MM-DD`), padrão da nova rodada. */
  today: string;
  /** Usuário (ou e-mail, nas contas antigas) da conta logada, para o card de senha. */
  login: string;
  /** Tela de login, para a mensagem de acesso dos jogadores cadastrados. */
  loginUrl: string;
};

export async function getGroupOverview(): Promise<GroupOverview> {
  const membership = await requireActiveMembership("/pelada");
  const isOrganizer = membership.role === "organizer";
  // Gestão de pessoas (usuários, edição, desativados) é só do dono.
  const isOwner = membership.isOwner;
  const supabase = await createClient();

  const [claimsResult, membersResult, matchesResult, submissionsResult, evaluations, awardsResult] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("group_members")
      .select("id, user_id, nickname, position, role, deactivated_at")
      .eq("group_id", membership.groupId)
      .order("nickname"),
    supabase
      .from("matches")
      .select("id, round, played_on, status, match_attendance(team)")
      .eq("group_id", membership.groupId)
      .order("round", { ascending: false }),
    supabase.rpc("get_match_submissions", { target_group: membership.groupId }),
    getGroupEvaluations(membership.groupId),
    supabase.from("awards").select("match_id, member_id, kind").eq("group_id", membership.groupId),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (matchesResult.error) throw matchesResult.error;
  if (submissionsResult.error) throw submissionsResult.error;
  if (awardsResult.error) throw awardsResult.error;

  const nicknameByMember = new Map(membersResult.data.map((member) => [member.id, member.nickname]));

  // Usuário de login de cada um (só o organizador vê, para saber o que mandar).
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .in(
      "id",
      membersResult.data.map((member) => member.user_id),
    );
  if (profilesError) throw profilesError;
  const profileByUser = new Map(profiles.map((profile) => [profile.id, profile]));
  const activeMembers = membersResult.data.filter((member) => member.deactivated_at === null);
  const kindOrder: readonly AwardKind[] = AWARD_KINDS;

  const submittedByMatch = new Map(
    submissionsResult.data.map((row) => [row.match_id, Number(row.submitted)]),
  );
  const ovrByMember = getOvrByMember(evaluations);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return {
    membership,
    isOrganizer,
    members: activeMembers.map((member) => {
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
      };
    }),
    myFullName: (() => {
      const me = membersResult.data.find((member) => member.id === membership.memberId);
      return (me && profileByUser.get(me.user_id)?.full_name) ?? membership.nickname;
    })(),
    inactiveMembers: isOwner
      ? membersResult.data
          .filter((member) => member.deactivated_at !== null)
          .map((member) => ({ id: member.id, nickname: member.nickname, position: member.position }))
      : [],
    matches: matchesResult.data.map((match) => ({
      id: match.id,
      round: match.round,
      playedOn: match.played_on,
      status: match.status,
      presentCount: match.match_attendance.length,
      teamCount: new Set(match.match_attendance.map((attendance) => attendance.team)).size,
      submittedCount: submittedByMatch.get(match.id) ?? 0,
      winners: awardsResult.data
        .filter((award) => award.match_id === match.id)
        .toSorted((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind))
        .map((award) => ({ kind: award.kind, nickname: nicknameByMember.get(award.member_id) ?? "?" })),
    })),
    // Seguro aqui: a sessão já foi lida, então a rota é dinâmica.
    today: new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIME_ZONE }).format(new Date()),
    login: (() => {
      const email = claimsResult.data?.claims.email ?? "";
      return emailToUsername(email) ?? email;
    })(),
    loginUrl: `${siteUrl}/entrar`,
  };
}
