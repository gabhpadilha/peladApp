"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId, setActiveGroup } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Quem já é membro e abriu o convite de novo: troca para essa pelada. */
export async function enterGroup(groupId: string): Promise<void> {
  const userId = await requireUserId("/");
  const parsedGroupId = z.uuid().parse(groupId);

  // Só troca se for mesmo membro (o RLS também esconderia o grupo).
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", parsedGroupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    await setActiveGroup(parsedGroupId);
  }
  redirect("/");
}
