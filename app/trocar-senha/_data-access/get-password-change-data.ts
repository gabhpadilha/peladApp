import { requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { emailToUsername } from "@/lib/username";

/** Usuário (ou e-mail, nas contas antigas) da conta logada, com ou sem senha provisória. */
export async function getPasswordChangeData(): Promise<{ email: string }> {
  await requireUserId("/trocar-senha", { allowTempPassword: true });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email ?? "";
  return { email: emailToUsername(email) ?? email };
}
