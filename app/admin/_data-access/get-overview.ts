import "server-only";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminGroup = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  playWeekday: number | null;
  playTime: string | null;
  venue: string | null;
  usualPlayers: number | null;
  plan: string;
  weeklyRoundLimit: number | null;
  isSuspended: boolean;
  createdAt: string;
  activePlayers: number;
  roundCount: number;
  lastRoundOn: string | null;
  /** Rodadas da pelada (só número, data e situação), da mais nova para a mais antiga. */
  rounds: { id: string; round: number; playedOn: string; status: string }[];
  ownerContact: string;
  adminNotes: string;
};

export type AdminOverview = {
  groups: AdminGroup[];
  activeGroups: number;
  suspendedGroups: number;
  totalPlayers: number;
};

/**
 * Painel da plataforma: só números e cadastro da pelada. Nunca lê notas, votos nem fotos.
 * Usa a chave secreta (ignora RLS) depois de checar que quem chama é admin.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  await requirePlatformAdmin();
  const admin = createAdminClient();

  const [groupsRes, membersRes, matchesRes, privateRes] = await Promise.all([
    admin.from("groups").select("*").order("created_at"),
    admin.from("group_members").select("group_id").is("deactivated_at", null),
    admin.from("matches").select("id, group_id, round, played_on, status").order("round", { ascending: false }),
    admin.from("group_private").select("group_id, owner_contact, admin_notes"),
  ]);
  if (groupsRes.error) throw new Error("Não foi possível ler as peladas.");

  const players = new Map<string, number>();
  for (const { group_id } of membersRes.data ?? []) players.set(group_id, (players.get(group_id) ?? 0) + 1);
  const rounds = new Map<string, { count: number; last: string | null; list: AdminGroup["rounds"] }>();
  for (const { id, group_id, round, played_on, status } of matchesRes.data ?? []) {
    const current = rounds.get(group_id) ?? { count: 0, last: null, list: [] };
    current.count += 1;
    current.last = current.last && current.last > played_on ? current.last : played_on;
    current.list.push({ id, round, playedOn: played_on, status });
    rounds.set(group_id, current);
  }
  const privates = new Map((privateRes.data ?? []).map((row) => [row.group_id, row]));

  const groups: AdminGroup[] = groupsRes.data.map((group) => ({
    id: group.id,
    name: group.name,
    slug: group.slug,
    city: group.city,
    state: group.state,
    playWeekday: group.play_weekday,
    playTime: group.play_time?.slice(0, 5) ?? null,
    venue: group.venue,
    usualPlayers: group.usual_players,
    plan: group.plan,
    weeklyRoundLimit: group.weekly_round_limit,
    isSuspended: group.suspended_at !== null,
    createdAt: group.created_at,
    activePlayers: players.get(group.id) ?? 0,
    roundCount: rounds.get(group.id)?.count ?? 0,
    lastRoundOn: rounds.get(group.id)?.last ?? null,
    rounds: rounds.get(group.id)?.list ?? [],
    ownerContact: privates.get(group.id)?.owner_contact ?? "",
    adminNotes: privates.get(group.id)?.admin_notes ?? "",
  }));

  return {
    groups,
    activeGroups: groups.filter((group) => !group.isSuspended).length,
    suspendedGroups: groups.filter((group) => group.isSuspended).length,
    totalPlayers: groups.reduce((sum, group) => sum + group.activePlayers, 0),
  };
}
