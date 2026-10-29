import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CoinsIcon,
  SendIcon,
  SparklesIcon,
  StarIcon,
  TrendingUpIcon,
  UserCheckIcon,
  type LucideIcon,
} from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { CARD_TIER_LABELS, getCardTier } from "@/lib/card-tier";
import type { RoundRewards } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { formatRoundScore } from "@/types/award";
import type { Player } from "@/types/player";

type RevealRewardsProps = {
  round: number;
  rewards: RoundRewards & { balance: number; card: Player | null };
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
        <span className="text-4xl">+{value}</span>
        <span className="text-lg">{unit}</span>
      </span>
      <span className="text-xs tracking-wide uppercase opacity-80">{label}</span>
    </div>
  );
}

/**
 * "Sua rodada", o fim do pacote (aprovado pelo dono do app em 2026-10-21): a sua
 * carta de hoje, a nota da rodada, o OVR antes → depois, o XP e as CanchaCoins
 * que a rodada deu, com a barra de nível andando e o detalhe recolhido.
 */
export function RevealRewards({ round, rewards, onDone }: RevealRewardsProps) {
  const { gains, before, after, levelUpCoins, balance, card, score, ratings, ovrBefore, ovrAfter } = rewards;
  const ovrDelta = ovrBefore === null || ovrAfter === null ? 0 : Math.round(ovrAfter) - Math.round(ovrBefore);
  const tierChanged =
    ovrBefore !== null && ovrAfter !== null && getCardTier(Math.round(ovrBefore)) !== getCardTier(Math.round(ovrAfter));
  const hasLeveledUp = after.level > before.level;
  const fillTo = Math.round((after.xpIntoLevel / after.xpNeeded) * 100);
  // Subiu de nível: a barra do nível novo começa vazia.
  const fillFrom = hasLeveledUp ? 0 : Math.round((before.xpIntoLevel / before.xpNeeded) * 100);
  // Largura e ponto de partida calculados: o Tailwind não gera classes por valor.
  const barStyle = { width: `${fillTo}%`, "--fill-from": `${fillFrom}%` } as CSSProperties;

  return (
    <section
      aria-label="Sua rodada"
      // A área que rola começa abaixo do cabeçalho e da barrinha de progresso: nada passa por baixo deles.
      className="absolute inset-x-0 top-20 bottom-0 overflow-y-auto px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <div className="flex animate-[reveal-in_0.4s_ease-out_both] flex-col items-center gap-1 text-center">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Rodada {round}</p>
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">Sua rodada</h1>
        </div>

        {/* A sua carta de hoje, a nota da rodada e o OVR antes → depois. */}
        <div className="flex animate-[reveal-pop_0.45s_ease-out_0.1s_both] items-center gap-4 rounded-xl border bg-card/80 p-3">
          {card && (
            <div className="w-28 shrink-0">
              <PlayerCard player={card} size="fill" />
            </div>
          )}
          <dl className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Sua nota</dt>
              <dd className="flex items-baseline gap-2">
                <span className="font-display text-5xl leading-none font-extrabold tabular-nums">
                  {score === null ? "–" : formatRoundScore(score / 10)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ratings === 1 ? "1 avaliação" : `${ratings} avaliações`}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Seu OVR</dt>
              <dd className="flex items-baseline gap-2 font-display font-extrabold tabular-nums">
                {ovrBefore !== null && <span className="text-2xl text-muted-foreground">{Math.round(ovrBefore)} →</span>}
                <span className="animate-[reveal-slam_0.5s_ease-out_0.7s_both] text-4xl leading-none">
                  {ovrAfter === null ? "–" : Math.round(ovrAfter)}
                </span>
                {ovrDelta !== 0 && (
                  <span className={cn("flex items-center text-lg", ovrDelta > 0 ? "text-success" : "text-destructive")}>
                    {ovrDelta > 0 ? <ArrowUpIcon aria-hidden className="size-4" /> : <ArrowDownIcon aria-hidden className="size-4" />}
                    {Math.abs(ovrDelta)}
                  </span>
                )}
              </dd>
              {tierChanged && ovrAfter !== null && (
                <p className="mt-1 text-xs font-medium text-primary">Você subiu para {CARD_TIER_LABELS[getCardTier(ovrAfter)]}!</p>
              )}
            </div>
          </dl>
        </div>

        <div className="flex animate-[reveal-pop_0.45s_ease-out_0.3s_both] gap-3">
          <Tile value={Math.round(rewards.xp)} unit="XP" label="Experiência" className="border-primary/40 bg-primary/10 text-primary" />
          <Tile value={rewards.coins} unit="CC" label="CanchaCoins" className="border-amber-300/40 bg-amber-300/10 text-amber-200" />
        </div>

        {hasLeveledUp && (
          <div className="flex animate-[reveal-pop_0.45s_ease-out_0.4s_both] items-center gap-3 rounded-xl border border-primary/50 bg-primary/15 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowUpIcon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col">
              <p className="font-display text-xl leading-tight font-bold uppercase">Subiu para o nível {after.level}!</p>
              <p className="text-sm text-muted-foreground">+{levelUpCoins} CC de bônus por nível</p>
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

        {/* Detalhe recolhido: a tela fica enxuta; quem quiser abre. */}
        <details className="group animate-[reveal-fade_0.4s_ease-out_0.7s_both] rounded-xl border bg-card/80">
          <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            De onde veio o XP e as CanchaCoins
            <ChevronDownIcon aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
        <ul className="flex flex-col divide-y border-t">
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
                  {gain.coins > 0 && <span className="text-amber-200">+{gain.coins} CC</span>}
                </span>
              </li>
            );
          })}
        </ul>
        </details>

        <div className="flex animate-[reveal-fade_0.4s_ease-out_0.9s_both] items-center justify-between rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm text-amber-200/80">
            <CoinsIcon aria-hidden className="size-4" /> Seu saldo
          </span>
          <span className="font-display text-2xl font-extrabold text-amber-200 tabular-nums">{balance} CC</span>
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
