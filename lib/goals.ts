import type { PackTier } from "@/lib/packs";

/**
 * Objetivos do mês (design em docs/superpowers/specs/2026-11-09-objetivos-mensais-design.md).
 * O catálogo mora no banco (`goal_options`: o banco avalia e o app só lê); aqui ficam os nomes, a faixa do pacote de cada nível
 * e as mensagens de erro. Usado no servidor e no navegador.
 */
export type GoalLevel = "easy" | "medium" | "hard";

export const GOAL_LEVELS: readonly GoalLevel[] = ["easy", "medium", "hard"];

export const GOAL_LEVEL_NAMES: Record<GoalLevel, string> = { easy: "Fácil", medium: "Médio", hard: "Difícil" };

/** Quanto mais difícil, melhor o pacote (decisão do dono do app em 2026-11-09). O banco usa a mesma regra em `draw_goal_pack`. */
export const GOAL_LEVEL_TIER: Record<GoalLevel, PackTier> = { easy: "C", medium: "B", hard: "A" };

export function isGoalLevel(value: string): value is GoalLevel {
  return value === "easy" || value === "medium" || value === "hard";
}

export type GoalOption = { key: string; label: string; target: number };

/** Uma vaga do mês: as opções (antes de escolher) ou a escolhida com o progresso. */
export type GoalSlot = {
  level: GoalLevel;
  options: GoalOption[];
  chosen: { key: string; label: string; target: number; progress: number; acceptedAt: string; completedAt: string | null } | null;
};

export type MonthInfo = { key: string; name: string; daysLeft: number };

/** Mês de `today` (`AAAA-MM-DD`, horário de Brasília): chave, nome por extenso e dias até o fim (0 = último dia). */
export function getMonthInfo(today: string): MonthInfo {
  const [year, month, day] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const name = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 15)));
  return { key: today.slice(0, 7), name, daysLeft: lastDay - day };
}

/** "termina hoje" / "termina em 1 dia" / "termina em 21 dias". */
export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft <= 0) return "termina hoje";
  return `termina em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`;
}

/** Recusas do banco (PA0xx) em texto para o usuário. */
export const GOAL_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  PA009: "Sua pelada está suspensa. Fale com o Administrador.",
  PA020: "Sua conta está desativada nesta pelada.",
  PA040: "Você já escolheu o objetivo desse nível. A escolha é única.",
  PA041: "Esse objetivo não está disponível para a sua posição. Recarregue a página.",
  PA042: "Os objetivos ainda não estão ligados na sua pelada.",
};
