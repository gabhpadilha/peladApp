import type { LevelProgress } from "@/lib/progression";
import { cn } from "@/lib/utils";

/** Nível (XP) com a barra até o próximo; usado na Loja e no perfil do atleta. */
export function LevelProgressBar({ progress, hint, className }: { progress: LevelProgress; hint?: string; className?: string }) {
  const percent = Math.min(100, Math.round((progress.xpIntoLevel / progress.xpNeeded) * 100));
  return (
    <section className={cn("flex flex-col gap-2 rounded-xl border bg-card p-4", className)}>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-xl font-bold uppercase">Nível {progress.level}</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {progress.xpIntoLevel} / {progress.xpNeeded} XP
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="XP até o próximo nível"
        aria-valuemin={0}
        aria-valuemax={progress.xpNeeded}
        aria-valuenow={progress.xpIntoLevel}
        className="h-2.5 overflow-hidden rounded-full bg-muted"
      >
        {/* Largura dinâmica: o Tailwind não gera classes por valor calculado. */}
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">
        Faltam <span className="font-semibold text-foreground">{progress.xpNeeded - progress.xpIntoLevel} XP</span> para o nível{" "}
        {progress.level + 1}
        {hint ? ` · ${hint}` : ""}
      </p>
    </section>
  );
}
