import { redirect } from "next/navigation";
import { getActiveMembership, requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export type OnboardingData = {
  fullName: string;
};

/** Onboarding é só para quem está logado e ainda não está em nenhuma pelada. */
export async function getOnboardingData(): Promise<OnboardingData> {
  const userId = await requireUserId("/bem-vindo");
  if (await getActiveMembership(userId)) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
  return { fullName: data?.full_name ?? "" };
}
