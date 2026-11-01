import { cn } from "@/lib/utils";

/** Bolinha de gol (estilo dos cards do SofaScore). */
export function GoalBall({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-3.5 shrink-0", className)}>
      <circle cx="12" cy="12" r="10.5" fill="#fff" stroke="#111" strokeWidth="1" />
      <path d="M12 8 15.8 10.8 14.4 15.2H9.6L8.2 10.8Z" fill="#111" />
      <path d="M12 8V3.2M15.8 10.8 20 9M14.4 15.2l2.6 3.6M9.6 15.2 7 18.8M8.2 10.8 4 9" stroke="#111" strokeWidth="1.3" fill="none" />
    </svg>
  );
}

/** "3 gols" / "1 gol". */
export function formatGoals(goals: number): string {
  return goals === 1 ? "1 gol" : `${goals} gols`;
}
