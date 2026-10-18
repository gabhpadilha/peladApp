import { getGroupEvaluations, getOvrByMember } from "@/lib/group-scores";
import { requireActiveMembership, type ActiveMembership, type PlayerPositionCode } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
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
  /** Só para o organizador. */
  inviteUrl: string | null;
  members: GroupMemberSummary[];
  matches: MatchSummary[];
  /** Hoje no fuso da pelada (`AAAA-MM-DD`), padrão da nova rodada. */
  today: string;
  /** E-mail da conta logada, mostrado no card de senha. */
  email: string;
  /** Tela de login, para a mensagem de acesso dos jogadores cadastrados. */
  loginUrl: string;
};

export async function getGroupOverview(): Promise<GroupOverview> {
  const membership = await requireActiveMembership("/pelada");
  const isOrganizer = membership.role === "organizer";
  const supabase = await createClient();

  const [claimsResult, membersResult, matchesResult, submissionsResult, evaluations, awardsResult] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("group_members")
      .select("id, nickname, position, role")
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
  const kindOrder: readonly AwardKind[] = AWARD_KINDS;

  const submittedByMatch = new Map(
    submissionsResult.data.map((row) => [row.match_id, Number(row.submitted)]),
  );
  const ovrByMember = getOvrByMember(evaluations);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return {
    membership,
    isOrganizer,
    inviteUrl: isOrganizer ? `${siteUrl}/convite/${membership.inviteCode}` : null,
    members: membersResult.data.map((member) => ({
      ...member,
      ovr: ovrByMember.get(member.id) ?? null,
    })),
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
    email: claimsResult.data?.claims.email ?? "",
    loginUrl: `${siteUrl}/entrar`,
  };
}
