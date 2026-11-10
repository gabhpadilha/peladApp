import "server-only";
import { GOAL_LEVELS, getMonthInfo, isGoalLevel, type GoalSlot, type MonthInfo } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";

export type MyGoals = {
  month: MonthInfo;
  slots: GoalSlot[];
  /** Pacotes de objetivo ainda lacrados (aviso no cartão). */
  unopenedPacks: number;
};

/** "Hoje" no fuso da pelada, `AAAA-MM-DD` (o servidor roda em UTC). */
const todayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/**
 * Os objetivos do mês do logado nesta pelada, ou `null` quando a pelada não tem pacotes ligados (ou sem conjunto do mês):
 * sem pacote não há prêmio, então os objetivos nem aparecem.
 */
export async function getMyGoals(groupId: string): Promise<MyGoals | null> {
  const supabase = await createClient();
  const [goalsResult, packsResult] = await Promise.all([
    supabase.rpc("get_my_goals", { target_group: groupId }),
    supabase.rpc("get_my_packs"),
  ]);
  if (goalsResult.error) throw goalsResult.error;
  if (packsResult.error) throw packsResult.error;
  if (goalsResult.data.length === 0) return null;

  const month = getMonthInfo(todayFormatter.format(new Date()));
  const slots: GoalSlot[] = GOAL_LEVELS.map((level) => {
    const rows = goalsResult.data.filter((row) => isGoalLevel(row.level) && row.level === level);
    const picked = rows.find((row) => row.chosen && row.accepted_at);
    return {
      level,
      options: rows.map((row) => ({ key: row.option_key, label: row.label, target: row.target })),
      chosen:
        picked && picked.accepted_at
          ? {
              key: picked.option_key,
              label: picked.label,
              target: picked.target,
              progress: picked.progress ?? 0,
              acceptedAt: picked.accepted_at,
              completedAt: picked.completed_at,
            }
          : null,
    };
  });

  const unopenedPacks = packsResult.data.filter((pack) => pack.source === "goal" && pack.month === month.key && pack.opened_at === null).length;
  return { month, slots, unopenedPacks };
}
