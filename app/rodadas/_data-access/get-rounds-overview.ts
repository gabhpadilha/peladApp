import { getGroupEvaluations, getOvrByMember } from "@/lib/group-scores";
import { getRequiredCompleteRaters } from "@/lib/round-closing";
import { requireActiveMembership, type ActiveMembership, type PlayerPositionCode } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AWARD_KINDS, type AwardKind } from "@/types/award";
import type { Database } from "@/types/database";

const SITE_TIME_ZONE = "America/Sao_Paulo";

/** Jogador ativo para o checklist de confirmados e o sorteio. */
export type DraftMember = {
  id: string;
  nickname: string;
  position: PlayerPositionCode;
  /** OVR atual (rodadas fechadas); `null` se ainda não foi avaliado. */
  ovr: number | null;
};

export type MatchSummary = {
  id: string;
  round: number;
  playedOn: string;
  status: Database["public"]["Enums"]["match_status"];
  presentCount: number;
  /** Titulares e reservas (os reservas também jogam o rodízio e avaliam). */
  starterCount: number;
  reserveCount: number;
  submittedCount: number;
  /** Quantos avaliaram todos os outros presentes. */
  completeCount: number;
  /** Avaliações completas que a rodada precisa para fechar. */
  requiredCompleteCount: number;
  /** Ganhadores das cartas especiais (só em rodadas fechadas). */
  winners: { kind: AwardKind; nickname: string }[];
};

export type RoundsOverview = {
  membership: ActiveMembership;
  isOrganizer: boolean;
  /** Elenco ativo, para o sorteio. */
  members: DraftMember[];
  /** Mais recente primeiro. */
  matches: MatchSummary[];
  /** Hoje no fuso da pelada (`AAAA-MM-DD`), padrão da nova rodada. */
  today: string;
};

export async function getRoundsOverview(): Promise<RoundsOverview> {
  const membership = await requireActiveMembership("/rodadas");
  const supabase = await createClient();

  const [membersResult, matchesResult, submissionsResult, evaluations, awardsResult] = await Promise.all([
    supabase
      .from("group_members")
      .select("id, nickname, position, deactivated_at")
      .eq("group_id", membership.groupId)
      .order("nickname"),
    supabase
      .from("matches")
      .select("id, round, played_on, status, match_attendance(reserve)")
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

  // Ganhadores antigos podem estar desativados: o apelido vem de todos.
  const nicknameByMember = new Map(membersResult.data.map((member) => [member.id, member.nickname]));
  const submissionsByMatch = new Map(submissionsResult.data.map((row) => [row.match_id, row]));
  const ovrByMember = getOvrByMember(evaluations);
  const kindOrder: readonly AwardKind[] = AWARD_KINDS;

  return {
    membership,
    isOrganizer: membership.role === "organizer",
    members: membersResult.data
      .filter((member) => member.deactivated_at === null)
      .map((member) => ({
        id: member.id,
        nickname: member.nickname,
        position: member.position,
        ovr: ovrByMember.get(member.id) ?? null,
      })),
    matches: matchesResult.data.map((match) => ({
      id: match.id,
      round: match.round,
      playedOn: match.played_on,
      status: match.status,
      presentCount: match.match_attendance.length,
      starterCount: match.match_attendance.filter((attendance) => !attendance.reserve).length,
      reserveCount: match.match_attendance.filter((attendance) => attendance.reserve).length,
      submittedCount: Number(submissionsByMatch.get(match.id)?.submitted ?? 0),
      completeCount: Number(submissionsByMatch.get(match.id)?.complete ?? 0),
      requiredCompleteCount: getRequiredCompleteRaters(match.match_attendance.length),
      winners: awardsResult.data
        .filter((award) => award.match_id === match.id)
        .toSorted((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind))
        .map((award) => ({ kind: award.kind, nickname: nicknameByMember.get(award.member_id) ?? "?" })),
    })),
    // Seguro aqui: a sessão já foi lida, então a rota é dinâmica.
    today: new Intl.DateTimeFormat("en-CA", { timeZone: SITE_TIME_ZONE }).format(new Date()),
  };
}
