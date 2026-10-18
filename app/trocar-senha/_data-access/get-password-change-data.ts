import { requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** E-mail da conta logada (com ou sem senha provisória). */
export async function getPasswordChangeData(): Promise<{ email: string }> {
  await requireUserId("/trocar-senha", { allowTempPassword: true });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { email: data?.claims.email ?? "" };
}
