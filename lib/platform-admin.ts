import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getUserId, requireUserId } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** O usuário logado é admin da plataforma (flag só por SQL em `profiles`)? */
export const isPlatformAdmin = cache(async (userId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("is_platform_admin").eq("id", userId).maybeSingle();
  return data?.is_platform_admin === true;
});

/** Painel e actions de admin: quem não é admin vê "não achei essa página" (não revela que existe). */
export async function requirePlatformAdmin(nextPath = "/admin"): Promise<string> {
  const userId = await requireUserId(nextPath);
  if (!(await isPlatformAdmin(userId))) notFound();
  return userId;
}

/** Para Server Actions: o id do admin, ou `null` (a action responde "sem permissão" em vez de abrir 404). */
export async function getPlatformAdminId(): Promise<string | null> {
  const userId = await getUserId();
  return userId && (await isPlatformAdmin(userId)) ? userId : null;
}
