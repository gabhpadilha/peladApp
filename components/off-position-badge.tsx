import { ArrowLeftRightIcon, HandIcon } from "lucide-react";
import type { PlayerRole } from "@/lib/round-position";
import { cn } from "@/lib/utils";

type OffPositionBadgeProps = {
  /** Papel na rodada: goleiro = "No gol"; linha = "Na linha" (goleiro que jogou na linha). */
  role: PlayerRole;
  /** Texto longo, para a folha de notas: diz que as notas são do outro tipo. */
  withHint?: boolean;
  className?: string;
};

/**
 * Selo âmbar de quem jogou fora da posição do cadastro na rodada ("Jogou no gol",
 * aprovado pelo dono do app em 2026-10-23). Usado na mesa tática e nas notas.
 */
export function OffPositionBadge({ role, withHint = false, className }: OffPositionBadgeProps) {
  const isGoal = role === "goalkeeper";
  const Icon = isGoal ? HandIcon : ArrowLeftRightIcon;
  const label = withHint
    ? isGoal
      ? "Jogou no gol: notas de goleiro"
      : "Jogou na linha: notas de linha"
    : isGoal
      ? "No gol"
      : "Na linha";

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full font-semibold whitespace-nowrap",
        withHint ? "bg-amber-400/15 px-2 py-0.5 text-xs text-amber-400" : "bg-amber-400 px-1.5 py-px text-[10px] text-black",
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {label}
    </span>
  );
}
