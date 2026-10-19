import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/** Cookie com o grupo ativo, para quem está em mais de uma pelada. */
export const ACTIVE_GROUP_COOKIE = "peladapp_active_group";
const ACTIVE_GROUP_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type MemberRole = Database["public"]["Enums"]["member_role"];
export type PlayerPositionCode = Database["public"]["Enums"]["player_position"];

export type ActiveMembership = {
  memberId: string;
  groupId: string;
  groupName: string;
  inviteCode: string;
  role: MemberRole;
  nickname: string;
  position: PlayerPositionCode;
  /** Conta de quem criou a pelada: só ela muda papéis, e ninguém mais mexe nela. */
  ownerUserId: string;
  /** O usuário logado é o dono da pelada. */
  isOwner: boolean;
};

/**
 * Marca em `user_metadata` de quem foi cadastrado pelo organizador com senha
 * provisória. Sai quando a pessoa define a própria senha.
 */
export const MUST_CHANGE_PASSWORD_FLAG = "must_change_password";
export const CHANGE_PASSWORD_PATH = "/trocar-senha";

type SessionUser = { id: string; mustChangePassword: boolean };

async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) return null;

  const metadata: Record<string, unknown> = data.claims.user_metadata ?? {};
  return { id: data.claims.sub, mustChangePassword: metadata[MUST_CHANGE_PASSWORD_FLAG] === true };
}

/** Id do usuário logado (validado pelo JWT), ou `null`. */
export async function getUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}

/**
 * Exige login; sem sessão, manda para /entrar voltando a `nextPath`.
 * Com senha provisória, manda para a troca obrigatória (exceto na própria troca).
 */
export async function requireUserId(
  nextPath = "/",
  { allowTempPassword = false }: { allowTempPassword?: boolean } = {},
): Promise<string> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  }
  if (user.mustChangePassword && !allowTempPassword) {
    redirect(CHANGE_PASSWORD_PATH);
  }
  return user.id;
}

/** Tela de quem foi desativado pelo organizador em todas as peladas. */
export const DEACTIVATED_PATH = "/conta-desativada";

/**
 * Grupo em que o usuário está agora: o do cookie, se ele ainda for membro,
 * senão o mais antigo. `null` se não participa de nenhum. Quem só tem
 * participações desativadas vai para `/conta-desativada`.
 */
export async function getActiveMembership(userId: string): Promise<ActiveMembership | null> {
  const supabase = await createClient();
  const { data: allRows, error } = await supabase
    .from("group_members")
    .select("id, group_id, role, nickname, position, deactivated_at, groups(name, invite_code, created_by)")
    .eq("user_id", userId)
    .order("joined_at");

  if (error) throw error;
  if (!allRows || allRows.length === 0) return null;

  const data = allRows.filter((member) => member.deactivated_at === null);
  if (data.length === 0) {
    redirect(DEACTIVATED_PATH);
  }

  const activeGroupId = (await cookies()).get(ACTIVE_GROUP_COOKIE)?.value;
  const row = data.find((member) => member.group_id === activeGroupId) ?? data[0];

  return {
    memberId: row.id,
    groupId: row.group_id,
    groupName: row.groups.name,
    inviteCode: row.groups.invite_code,
    role: row.role,
    nickname: row.nickname,
    position: row.position,
    ownerUserId: row.groups.created_by,
    isOwner: row.groups.created_by === userId,
  };
}

/** Exige login e grupo; sem grupo, manda para o onboarding. */
export async function requireActiveMembership(nextPath = "/"): Promise<ActiveMembership> {
  const userId = await requireUserId(nextPath);
  const membership = await getActiveMembership(userId);
  if (!membership) {
    redirect("/bem-vindo");
  }
  return membership;
}

/** Só em Server Actions/Route Handlers (Server Components não gravam cookies). */
export async function setActiveGroup(groupId: string): Promise<void> {
  (await cookies()).set(ACTIVE_GROUP_COOKIE, groupId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_GROUP_MAX_AGE_SECONDS,
  });
}
