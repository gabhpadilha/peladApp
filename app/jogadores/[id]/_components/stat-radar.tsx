import { cn } from "@/lib/utils";
import type { CardStat } from "@/lib/card-stats";

type StatRadarProps = {
  /** As 3 estatísticas da carta (0–99) do jogador. */
  stats: readonly CardStat[];
  /** Média da pelada em cada uma, pelo nome (a mesma função: linha ou gol). */
  groupAverages: Record<string, number>;
  nickname: string;
};

/** Geometria do gráfico (viewBox 100 × 96): centro, raio da escala 99 e os ângulos de cada ponta (a 1ª fica no topo). */
const CENTER = { x: 50, y: 52 };
const RADIUS = 35;
const LABEL_RADIUS = 44;
const MAX_VALUE = 99;
const RINGS = [0.25, 0.5, 0.75, 1] as const;

function angleOf(index: number, total: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total;
}

function pointAt(index: number, total: number, radius: number): { x: number; y: number } {
  const angle = angleOf(index, total);
  return { x: CENTER.x + radius * Math.cos(angle), y: CENTER.y + radius * Math.sin(angle) };
}

function polygon(values: readonly number[], total: number): string {
  return values
    .map((value, index) => {
      const { x, y } = pointAt(index, total, (Math.min(value, MAX_VALUE) / MAX_VALUE) * RADIUS);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Cor da etiqueta de cada valor, como no SofaScore: baixo em vermelho, médio em âmbar, alto em verde. */
function badgeClass(value: number | null): string {
  if (value === null) return "bg-muted text-muted-foreground";
  if (value >= 70) return "bg-success text-black";
  if (value >= 55) return "bg-amber-400 text-black";
  return "bg-destructive text-white";
}

/**
 * Radar das 3 estatísticas da carta (Ataque, Criação e Defesa; no gol, Paredão, Leitura e Saída): o jogador em lima e a
 * média da pelada em tracejado, com o valor de cada ponta numa etiqueta colorida. SVG puro, sem `filter`. O texto
 * dos valores também está nas barras logo abaixo (nunca só visual).
 */
export function StatRadar({ stats, groupAverages, nickname }: StatRadarProps) {
  const total = stats.length;
  const playerValues = stats.map((stat) => stat.value ?? 0);
  const groupValues = stats.map((stat) => groupAverages[stat.label] ?? 0);
  const hasGroup = stats.some((stat) => groupAverages[stat.label] !== undefined);

  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="relative -mb-5 aspect-[100/96] w-full max-w-72">
        <svg viewBox="0 0 100 96" role="img" aria-label={`Radar das estatísticas de ${nickname}`} className="size-full">
          {RINGS.map((ring) => (
            <polygon
              key={ring}
              points={polygon(Array.from({ length: total }, () => ring * MAX_VALUE), total)}
              className={cn("fill-none stroke-border", ring === 1 ? "fill-muted/30" : "")}
              strokeWidth={0.4}
            />
          ))}
          {stats.map((stat, index) => {
            const end = pointAt(index, total, RADIUS);
            return <line key={stat.label} x1={CENTER.x} y1={CENTER.y} x2={end.x} y2={end.y} className="stroke-border" strokeWidth={0.3} />;
          })}
          {hasGroup && (
            <polygon points={polygon(groupValues, total)} className="fill-none stroke-foreground/70" strokeWidth={0.7} strokeDasharray="2 1.4" />
          )}
          <polygon points={polygon(playerValues, total)} className="fill-primary/25 stroke-primary" strokeWidth={1} strokeLinejoin="round" />
          {playerValues.map((value, index) => {
            const { x, y } = pointAt(index, total, (Math.min(value, MAX_VALUE) / MAX_VALUE) * RADIUS);
            return <circle key={stats[index].label} cx={x} cy={y} r={1.3} className="fill-primary" />;
          })}
        </svg>
        {stats.map((stat, index) => {
          const { x, y } = pointAt(index, total, LABEL_RADIUS);
          return (
            <div
              key={stat.label}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 text-center"
              // Posição vem do dado (ângulo de cada ponta).
              style={{ left: `${x}%`, top: `${(y / 96) * 100}%` }}
            >
              <span className="text-xs whitespace-nowrap text-muted-foreground">{stat.label}</span>
              <span className={cn("rounded-md px-1.5 py-0.5 font-display text-base leading-none font-bold tabular-nums", badgeClass(stat.value))}>
                {stat.value ?? "–"}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
