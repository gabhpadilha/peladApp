import "server-only";
import type { GroupDetailsInput } from "@/types/group-schema";

/** Campos de `groups` que o painel grava (texto do formulário → colunas). */
export function toGroupColumns(input: GroupDetailsInput) {
  return {
    name: input.groupName,
    slug: input.slug === "" ? null : input.slug,
    city: input.city,
    state: input.state,
    play_weekday: input.playWeekday === "" ? null : Number(input.playWeekday),
    play_time: input.playTime === "" ? null : input.playTime,
    venue: input.venue === "" ? null : input.venue,
    usual_players: input.usualPlayers === "" ? null : Number(input.usualPlayers),
    weekly_round_limit: input.weeklyRoundLimit === "" ? null : Number(input.weeklyRoundLimit),
  };
}

export function toPrivateColumns(input: GroupDetailsInput) {
  return {
    owner_contact: input.ownerContact === "" ? null : input.ownerContact,
    admin_notes: input.adminNotes === "" ? null : input.adminNotes,
    updated_at: new Date().toISOString(),
  };
}

const NAME_IN_USE = "Já existe uma pelada com esse nome (não conta maiúscula, acento nem pontuação).";
const SLUG_IN_USE = "Esse código já é de outra pelada.";

/** Traduz o erro de unicidade do banco (23505) do nome ou do código. */
export function groupConflictMessage(error: { code?: string; message?: string } | null): { field: "groupName" | "slug"; message: string } | null {
  if (error?.code !== "23505") return null;
  return error.message?.includes("groups_slug_key")
    ? { field: "slug", message: SLUG_IN_USE }
    : { field: "groupName", message: NAME_IN_USE };
}
