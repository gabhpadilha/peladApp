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
  LightbulbIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  UtensilsIcon,
  createLucideIcon,
  type LucideIcon,
} from "lucide-react";
import type { AwardKind } from "@/types/award";

/** Bola de futebol (o lucide só tem a de vôlei): círculo, pentágono central e as costuras até a borda. */
const SoccerBallIcon = createLucideIcon("soccer-ball", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "c" }],
  ["path", { d: "M12 8.5 15.3 10.9 14 14.8H10L8.7 10.9Z", key: "p" }],
  ["path", { d: "M12 8.5V2.2M15.3 10.9 21.2 9M14 14.8 17.6 19.7M10 14.8 6.4 19.7M8.7 10.9 2.8 9", key: "l" }],
]);

/** Ícone de cada prêmio: o mesmo na carta, na votação, na coleção e na revelação. */
export const AWARD_ICONS: Record<AwardKind, LucideIcon> = {
  craque: StarIcon,
  gol: GoalIcon,
  goleador: SoccerBallIcon,
  foguete: RocketIcon,
  garcom: HandPlatterIcon,
  motor: CogIcon,
  drible: SparklesIcon,
  atacante: FlameIcon,
  criativo: LightbulbIcon,
  defensor: ShieldCheckIcon,
  goleiro: HandIcon,
  fair_play: HeartIcon,
  fominha: UtensilsIcon,
  bola_murcha: FrownIcon,
  time_da_semana: StarIcon,
  jogador_do_mes: CrownIcon,
  campeao_do_mes: TrophyIcon,
};
