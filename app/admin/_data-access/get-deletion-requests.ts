import "server-only";
import { getPlatformAdminId } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type DeletionRequest = {
  id: string;
  requestedAt: string;
  fullName: string;
  /** Apelido e pelada de cada participação (a pessoa pode estar em mais de uma). */
  memberships: { nickname: string; groupName: string; isOwner: boolean }[];
  /** Não dá para apagar daqui: é admin da plataforma ou Administrador de uma pelada. */
  blockedReason: string | null;
};

/** Pedidos de exclusão de conta, mais antigos primeiro. Só para o admin da plataforma (nada para os outros). */
export async function getDeletionRequests(): Promise<DeletionRequest[]> {
  if (!(await getPlatformAdminId())) return [];
  const admin = createAdminClient();
  const { data: requests } = await admin.from("account_deletion_requests").select("id, user_id, requested_at").order("requested_at");
  if (!requests || requests.length === 0) return [];

  const userIds = requests.map((request) => request.user_id);
  const [{ data: profiles }, { data: members }] = await Promise.all([
    admin.from("profiles").select("id, full_name, is_platform_admin").in("id", userIds),
    admin.from("group_members").select("user_id, nickname, groups(name, created_by)").in("user_id", userIds),
  ]);

  return requests.map((request) => {
    const profile = profiles?.find((candidate) => candidate.id === request.user_id);
    const memberships = (members ?? [])
      .filter((member) => member.user_id === request.user_id)
      .map((member) => ({ nickname: member.nickname, groupName: member.groups.name, isOwner: member.groups.created_by === request.user_id }));
    const owned = memberships.find((membership) => membership.isOwner);
    return {
      id: request.id,
      requestedAt: request.requested_at,
      fullName: profile?.full_name ?? "Sem nome",
      memberships,
      blockedReason: profile?.is_platform_admin
        ? "É admin da plataforma: tire a marca de admin antes."
        : owned
          ? `É o Administrador da pelada ${owned.groupName}. Exclua a pelada (ou combine outra saída) antes de apagar a conta.`
          : null,
    };
  });
}

/** Quantos pedidos esperam análise (para o aviso no atalho do painel). */
export async function getDeletionRequestCount(): Promise<number> {
  if (!(await getPlatformAdminId())) return 0;
  const { count } = await createAdminClient().from("account_deletion_requests").select("id", { count: "exact", head: true });
  return count ?? 0;
}
