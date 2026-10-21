import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpIcon, CoinsIcon, SendIcon, SparklesIcon, StarIcon, TrendingUpIcon, UserCheckIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoundRewards } from "@/lib/progression";

type RevealRewardsProps = {
  round: number;
  rewards: RoundRewards & { balance: number };
  onDone: () => void;
};

/** Ícone de cada linha do que a rodada deu. */
function gainIcon(key: string): LucideIcon {
  if (key === "score") return StarIcon;
  if (key === "submitted") return SendIcon;
  if (key === "played") return UserCheckIcon;
  if (key === "ovr") return TrendingUpIcon;
  return SparklesIcon;
}

function Tile({ value, unit, label, className }: { value: number; unit: string; label: string; className: string }) {
  return (
    <div className={`flex flex-1 flex-col items-center gap-1 rounded-xl border p-3 ${className}`}>
      <span className="flex items-baseline gap-1 font-display leading-none font-extrabold tabular-nums">
        <span className="text-5xl">+{value}</span>
        <span className="text-lg">{unit}</span>
      </span>
      <span className="text-xs tracking-wide uppercase opacity-80">{label}</span>
    </div>
  );
}

/**
 * "Você ganhou": o XP e as PeladaCoins que a rodada deu a quem abriu o pacote,
 * linha a linha, com a barra de nível andando (aprovado pelo dono do app em 2026-10-21).
 */
export function RevealRewards({ round, rewards, onDone }: RevealRewardsProps) {
  const { gains, before, after, levelUpCoins, balance } = rewards;
  const hasLeveledUp = after.level > before.level;
  const fillTo = Math.round((after.xpIntoLevel / after.xpNeeded) * 100);
  // Subiu de nível: a barra do nível novo começa vazia.
  const fillFrom = hasLeveledUp ? 0 : Math.round((before.xpIntoLevel / before.xpNeeded) * 100);
  // Largura e ponto de partida calculados: o Tailwind não gera classes por valor.
  const barStyle = { width: `${fillTo}%`, "--fill-from": `${fillFrom}%` } as CSSProperties;

  return (
    <section
      aria-label="O que você ganhou na rodada"
      // pt-22: abaixo da barrinha de progresso do topo.
      className="absolute inset-0 overflow-y-auto px-4 pt-22 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex animate-[reveal-in_0.4s_ease-out_both] flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Rodada {round}</p>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Você ganhou</h1>
        </div>

        <div className="flex animate-[reveal-pop_0.45s_ease-out_0.15s_both] gap-3">
          <Tile value={Math.round(rewards.xp)} unit="XP" label="Experiência" className="border-primary/40 bg-primary/10 text-primary" />
          <Tile value={rewards.coins} unit="PC" label="PeladaCoins" className="border-amber-300/40 bg-amber-300/10 text-amber-200" />
        </div>

        {hasLeveledUp && (
          <div className="flex animate-[reveal-pop_0.45s_ease-out_0.4s_both] items-center gap-3 rounded-xl border border-primary/50 bg-primary/15 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowUpIcon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col">
              <p className="font-display text-xl leading-tight font-bold uppercase">Subiu para o nível {after.level}!</p>
              <p className="text-sm text-muted-foreground">+{levelUpCoins} PC de bônus por nível</p>
            </div>
          </div>
        )}

        <div className="flex animate-[reveal-fade_0.4s_ease-out_0.5s_both] flex-col gap-2 rounded-xl border bg-card/80 p-3">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-lg font-bold uppercase">Nível {after.level}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {Math.round(after.xpIntoLevel)} / {after.xpNeeded} XP
            </p>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 animate-[reveal-fill_1.2s_cubic-bezier(0.2,0.8,0.2,1)_0.8s_both] rounded-full bg-primary"
              style={barStyle}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {hasLeveledUp
              ? `Nível ${before.level} → ${after.level}`
              : `Faltam ${Math.ceil(after.xpNeeded - after.xpIntoLevel)} XP para o nível ${after.level + 1}`}
          </p>
        </div>

        <ul className="flex animate-[reveal-fade_0.4s_ease-out_0.7s_both] flex-col divide-y rounded-xl border bg-card/80">
          {gains.map((gain) => {
            const Icon = gainIcon(gain.key);
            return (
              <li key={gain.key} className="flex items-center gap-3 px-3 py-2.5">
                <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{gain.label}</span>
                  {gain.detail && <span className="text-xs text-muted-foreground">{gain.detail}</span>}
                </span>
                <span className="flex shrink-0 flex-col items-end text-sm font-semibold tabular-nums">
                  {gain.xp > 0 && <span className="text-primary">+{Math.round(gain.xp)} XP</span>}
                  {gain.coins > 0 && <span className="text-amber-200">+{gain.coins} PC</span>}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex animate-[reveal-fade_0.4s_ease-out_0.9s_both] items-center justify-between rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-amber-200/80">
            <CoinsIcon aria-hidden className="size-4" /> Seu saldo
          </span>
          <span className="font-display text-2xl font-extrabold text-amber-200 tabular-nums">{balance} PC</span>
        </div>

        <div className="flex animate-[reveal-fade_0.4s_ease-out_1.1s_both] flex-col gap-2.5 pt-1">
          <Button size="lg" className="h-11 text-base" onClick={onDone}>
            Ver todos os vencedores
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 text-base">
            <Link href="/loja">Gastar na Loja</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
