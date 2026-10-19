"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveMembership } from "@/lib/session";
import { getDatabaseErrorMessage } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { newMatchSchema, type NewMatchInput } from "../_schemas/new-match-schema";

export type CreateMatchResult =
  | { success: true; round: number; matchId: string }
  | { success: false; message: string };

/** Organizador cria a rodada com os confirmados já divididos em Branco e Preto, titulares e reservas (atômico no banco). */
export async function createMatch(input: NewMatchInput): Promise<CreateMatchResult> {
  const membership = await requireActiveMembership("/rodadas");
  if (membership.role !== "organizer") {
    return { success: false, message: "Só o organizador cria rodadas." };
  }

  const validation = newMatchSchema.safeParse(input);
  if (!validation.success) {
    const [firstIssue] = z.flattenError(validation.error).formErrors;
    return { success: false, message: firstIssue ?? "Confira a data e os times." };
  }
  const { playedOn, players } = validation.data;

  const supabase = await createClient();
  const { data: matchId, error } = await supabase.rpc("create_match", {
    target_group: membership.groupId,
    match_date: playedOn,
    present_member_ids: players.map((player) => player.memberId),
    team_numbers: players.map((player) => player.team),
    reserve_flags: players.map((player) => player.reserve),
  });
  if (error || !matchId) {
    return {
      success: false,
      message: error
        ? getDatabaseErrorMessage(error, "Não foi possível criar a rodada.")
        : "Não foi possível criar a rodada.",
    };
  }

  const { data: match } = await supabase.from("matches").select("round").eq("id", matchId).single();
  revalidatePath("/rodadas");
  return { success: true, round: match?.round ?? 0, matchId };
}
