"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_GROUP_COOKIE } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_GROUP_COOKIE);
  redirect("/entrar");
}
