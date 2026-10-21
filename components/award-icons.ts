import {
  CogIcon,
  CrownIcon,
  HandPlatterIcon,
  RocketIcon,
  FlameIcon,
  FrownIcon,
  GoalIcon,
  HandIcon,
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  UtensilsIcon,
  type LucideIcon,
} from "lucide-react";
import type { AwardKind } from "@/types/award";

/** Ícone de cada prêmio: o mesmo na carta, na votação, na coleção e na revelação. */
export const AWARD_ICONS: Record<AwardKind, LucideIcon> = {
  craque: TrophyIcon,
  gol: GoalIcon,
  foguete: RocketIcon,
  garcom: HandPlatterIcon,
  motor: CogIcon,
  drible: SparklesIcon,
  atacante: FlameIcon,
  defensor: ShieldCheckIcon,
  goleiro: HandIcon,
  fair_play: HeartIcon,
  fominha: UtensilsIcon,
  bola_murcha: FrownIcon,
  time_da_semana: StarIcon,
  jogador_do_mes: CrownIcon,
};
