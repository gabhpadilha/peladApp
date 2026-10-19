import { FrownIcon, GoalIcon, TrophyIcon, type LucideIcon } from "lucide-react";
import type { AwardKind } from "@/types/award";

/** Ícone de cada prêmio, igual ao da carta especial. */
export const AWARD_ICONS: Record<AwardKind, LucideIcon> = {
  craque: TrophyIcon,
  gol: GoalIcon,
  bola_murcha: FrownIcon,
};
