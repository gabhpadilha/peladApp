import { GoalBall } from "@/components/goal-ball";
import { SectionTitle } from "@/components/section-title";
import { cn } from "@/lib/utils";
import type { GoalStatsData } from "../_data-access/get-athlete-profile";

/** As façanhas de gols num jogo só (nomes do futebol: doblete, hat-trick e poker; 5 ou mais sem nome). */
const FEATS = [
  { key: "doblete", label: "Doblete", detail: "2 gols", mark: "2" },
  { key: "hatTrick", label: "Hat-trick", detail: "3 gols", mark: "3" },
  { key: "poker", label: "Poker", detail: "4 gols", mark: "4" },
  { key: "fivePlus", label: "5 ou mais", detail: "gols", mark: "5+" },
] as const;

/** Quantos jogos recentes entram no gráfico de gols por rodada (mais que isso espreme as barras). */
const CHART_GAMES = 5;

/** Os cinco remendos pretos da borda da bola, cortados pela borda (como numa bola de futebol vista de frente): cada um é um pentágono com uma ponta para o centro, mais a costura até perto do número. */
const BALL_PATCHES = Array.from({ length: 5 }, (_, index) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
  const toPoint = (radius: number, around = angle) => `${(24 + radius * Math.cos(around)).toFixed(2)},${(24 + radius * Math.sin(around)).toFixed(2)}`;
  const center = { x: 24 + 19 * Math.cos(angle), y: 24 + 19 * Math.sin(angle) };
  const points = Array.from({ length: 5 }, (_, vertex) => {
    const around = angle + Math.PI + (vertex * 2 * Math.PI) / 5;
    return `${(center.x + 7 * Math.cos(around)).toFixed(2)},${(center.y + 7 * Math.sin(around)).toFixed(2)}`;
  }).join(" ");
  // A costura sai da ponta do remendo que aponta para o centro e vai até perto do número.
  const inner = { x: center.x + 7 * Math.cos(angle + Math.PI), y: center.y + 7 * Math.sin(angle + Math.PI) };
  return { points, seam: `${inner.x.toFixed(2)},${inner.y.toFixed(2)} ${toPoint(11.5)}` };
});

/** Ícone da façanha: uma bola de futebol com o número de gols no meio (a mesma para todas, para ficar uniforme). */
function FeatBall({ mark, earned }: { mark: string; earned: boolean }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("size-14", !earned && "opacity-40")}>
      {earned ? (
        <>
          <defs>
            <clipPath id="feat-ball-clip">
              <circle cx="24" cy="24" r="21" />
            </clipPath>
          </defs>
          <circle cx="24" cy="24" r="21" fill="#fff" />
          <g clipPath="url(#feat-ball-clip)">
            {BALL_PATCHES.map((patch) => (
              <g key={patch.points}>
                <polyline points={patch.seam} fill="none" stroke="#111" strokeWidth={1.3} strokeLinecap="round" />
                <polygon points={patch.points} fill="#111" />
              </g>
            ))}
          </g>
          <circle cx="24" cy="24" r="21" fill="none" stroke="#111" strokeWidth={2} />
        </>
      ) : (
        <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 3" className="text-muted-foreground" />
      )}
      <text
        x="24"
        y="24.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={mark.length > 1 ? 18 : 24}
        fontWeight={800}
        className={cn("font-display", earned ? "fill-[#111]" : "fill-muted-foreground")}
        // Contorno branco para o número ler por cima das costuras.
        stroke={earned ? "#fff" : "none"}
        strokeWidth={earned ? 3.2 : 0}
        paintOrder="stroke"
      >
        {mark}
      </text>
    </svg>
  );
}

const perGameFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/**
 * Gols confirmados pelos colegas (3 "sim"): a única estatística real do jogo, então ganha destaque. Total grande, por
 * jogo, melhor rodada e em quantos jogos fez gol e o gráfico de gols por rodada; a posição na artilharia vem no
 * título e a lista da pelada fica na home. Sempre aparece (mesmo sem gols) e explica o que falta.
 */
export function GoalStats({ stats }: { stats: GoalStatsData }) {
  const recent = stats.byRound.slice(-CHART_GAMES);
  const maxGoals = Math.max(1, ...recent.map((entry) => entry.goals));
  const blocks = [
    { value: perGameFormatter.format(stats.perGame), label: "por jogo" },
    { value: stats.best ? String(stats.best.goals) : "–", label: stats.best ? `melhor · R${stats.best.round}` : "melhor rodada" },
    { value: stats.games > 0 ? `${stats.goalGames}/${stats.games}` : "–", label: "jogos com gol" },
  ];

  return (
    <section aria-labelledby="goals-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <SectionTitle id="goals-title" aside={stats.rank !== null ? `${stats.rank}º na artilharia` : null}>
        Gols
      </SectionTitle>

      <div className="flex items-center gap-4 rounded-lg bg-muted/40 px-4 py-3">
        <GoalBall className="size-10" />
        <div className="flex flex-col leading-none">
          <span className="font-display text-6xl font-extrabold tabular-nums">{stats.total}</span>
          <span className="mt-1 text-sm text-muted-foreground">{stats.total === 1 ? "gol confirmado" : "gols confirmados"}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {blocks.map((block) => (
          <div key={block.label} className="flex flex-col items-center rounded-lg bg-muted/40 px-2 py-3 text-center">
            <span className="font-display text-2xl font-bold tabular-nums">{block.value}</span>
            <span className="text-xs text-muted-foreground">{block.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">Gols num jogo só</h3>
        <ul className="grid grid-cols-4 gap-2">
          {FEATS.map((feat) => {
            const count = stats.feats[feat.key];
            return (
              <li key={feat.key} className="flex flex-col items-center gap-1 text-center" aria-label={`${feat.label}: ${count}`}>
                <FeatBall mark={feat.mark} earned={count > 0} />
                <span className={cn("font-display text-2xl leading-none font-bold tabular-nums", count === 0 && "text-muted-foreground")}>{count}</span>
                <span className="text-xs leading-tight font-medium">{feat.label}</span>
                <span className="text-[10px] leading-none text-muted-foreground">{feat.detail}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {stats.games === 0 ? (
        <p className="text-sm text-muted-foreground">
          Os gols aparecem aqui quando fechar a primeira rodada com a contagem: cada um informa os seus e três colegas confirmam.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">Gols nos últimos {recent.length === 1 ? "jogo" : `${recent.length} jogos`}</h3>
          <ol className="flex h-28 items-end gap-1.5 border-b border-border sm:gap-3">
            {recent.map((entry) => (
              <li
                key={entry.round}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                aria-label={`Rodada ${entry.round}: ${entry.goals === 1 ? "1 gol" : `${entry.goals} gols`}`}
              >
                <span className={cn("text-xs font-semibold tabular-nums", entry.goals === 0 && "text-muted-foreground")}>{entry.goals}</span>
                <span
                  aria-hidden
                  className={cn("w-full max-w-10 rounded-t-md", entry.goals > 0 ? "bg-primary" : "bg-muted")}
                  // Altura vem do dado; rodada sem gol fica uma linha fina.
                  style={{ height: `${entry.goals > 0 ? Math.max(12, (entry.goals / maxGoals) * 70) : 4}%` }}
                />
              </li>
            ))}
          </ol>
          <ol className="flex gap-1.5 sm:gap-3">
            {recent.map((entry) => (
              <li key={entry.round} className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground tabular-nums">
                R{entry.round}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Só gols confirmados por 3 colegas, desde que a contagem começou.</p>
    </section>
  );
}
