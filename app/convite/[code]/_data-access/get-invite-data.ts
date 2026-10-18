import { getUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type InviteData =
  | { status: "invalid" }
  /** Sem conta (ou deslogado): cadastro completo pelo convite. */
  | { status: "sign-up"; groupName: string }
  | { status: "member"; groupId: string; groupName: string }
  /** Já tem conta, mas ainda não está nessa pelada. */
  | { status: "join"; groupName: string; defaultFullName: string };

export async function getInviteData(code: string): Promise<InviteData> {
  const supabase = await createClient();

  const { data: invite } = await supabase.rpc("get_invite", { code }).maybeSingle();
  if (!invite) return { status: "invalid" };

  const userId = await getUserId();
  if (!userId) return { status: "sign-up", groupName: invite.group_name };

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", invite.group_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (membership) {
    return { status: "member", groupId: invite.group_id, groupName: invite.group_name };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();
  return { status: "join", groupName: invite.group_name, defaultFullName: profile?.full_name ?? "" };
}
