import type { CSSProperties } from "react";
import { ArrowUpIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { getStatsFromAttributes } from "@/lib/card-stats";
import type { RoundFusion } from "@/lib/progression";
import { GOALKEEPER_ATTRIBUTES, OUTFIELD_ATTRIBUTES, type Player, type PlayerAttribute } from "@/types/player";

type CardNumbers = { ovr: number | null; attributes: Partial<Record<PlayerAttribute, number>> };

/** A mesma carta do jogador (skin, foto, nome) com outros números. */
function withNumbers(card: Player, numbers: CardNumbers): Player {
  const keys: readonly PlayerAttribute[] = card.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
  const attributes = Object.fromEntries(keys.map((key) => [key, numbers.attributes[key] ?? null]));
  return { ...card, ovr: numbers.ovr, attributes } as Player;
}

/** Contador que sobe por CSS (sem JavaScript): `steps` = quantos números passa. */
function Count({ from, to, delay, duration, steps }: { from: number; to: number; delay: number; duration: number; steps: number }) {
  const style = {
    "--from": from,
    "--to": to,
    "--del": `${delay}s`,
    "--dur": `${duration}s`,
    "--ease": `steps(${Math.max(1, steps)}, end)`,
  } as CSSProperties;
  return <span className="fusion-count tabular-nums" style={style} />;
}

type RevealFusionProps = {
  card: Player;
  fusion: RoundFusion;
  round: number;
};

/**
 * A animação do fim da rodada (aprovada pelo dono do app em 2026-11-10): a sua carta de antes e a carta do
 * desempenho da rodada se fundem na carta nova. Os gols aparecem só aqui, como bolinhas que sobem o Ataque da
 * rodada. Só CSS (`transform` e `opacity`); com movimento reduzido, o fim da cena aparece parado.
 */
export function RevealFusion({ card, fusion, round }: RevealFusionProps) {
  const { before, after } = fusion;
  if (!before || before.ovr === null || after.ovr === null) return null;
  const role = card.role;
  const mine = withNumbers(card, before);
  const roundCard = withNumbers(card, fusion.round);
  const fused = withNumbers(card, after);
  const attackTo = getStatsFromAttributes(role, fusion.round.attributes)[0]?.value ?? null;
  const attackFrom = fusion.roundWithoutGoals ? (getStatsFromAttributes(role, fusion.roundWithoutGoals.attributes)[0]?.value ?? null) : null;
  const hasGoals = fusion.goals > 0 && attackFrom !== null && attackTo !== null && attackTo > attackFrom;
  const ovrFrom = Math.round(before.ovr);
  const ovrTo = Math.round(after.ovr);
  const delta = ovrTo - ovrFrom;
  const balls = Math.min(5, hasGoals ? attackTo - attackFrom : 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="fusion-stage relative mx-auto w-full max-w-sm" style={{ aspectRatio: "100 / 92" }}>
        {/* Sua carta de antes (esquerda) e a carta da rodada (direita). */}
        <div className="fusion-mine absolute" style={{ left: "5%", top: "4%", width: "40%" }}>
          <PlayerCard player={mine} size="fill" />
        </div>
        <div className="fusion-round absolute" style={{ left: "55%", top: "4%", width: "40%" }}>
          <PlayerCard player={roundCard} size="fill" />
        </div>

        {hasGoals && (
          <>
            <div
              className="fusion-goal-tag absolute flex items-center justify-center gap-1 text-sm font-bold"
              style={{ left: "55%", top: "67%", width: "40%" }}
            >
              <span aria-hidden>⚽</span>
              {fusion.goals === 1 ? "1 gol" : `${fusion.goals} gols`}
            </div>
            <div
              className="fusion-goal-tag absolute flex items-baseline justify-center gap-1.5 font-display font-extrabold"
              style={{ left: "55%", top: "74%", width: "40%" }}
            >
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Ataque</span>
              <span className="text-2xl">
                <Count from={attackFrom} to={attackTo} delay={2.2} duration={0.8} steps={attackTo - attackFrom} />
              </span>
            </div>
            {Array.from({ length: balls }, (_, index) => (
              <span
                key={index}
                aria-hidden
                className="fusion-ball absolute text-lg"
                style={{ left: "73%", top: "66%", "--d": `${1.5 + index * 0.2}s`, "--dx": "-12cqw", "--dy": "-9cqw" } as CSSProperties}
              >
                ⚽
              </span>
            ))}
          </>
        )}

        {/* A carta nova. */}
        <div className="fusion-fused absolute" style={{ left: "27%", top: "2%", width: "46%" }}>
          <PlayerCard player={fused} size="fill" />
        </div>
        <div
          className="fusion-cap-2 absolute flex items-baseline justify-center gap-2 font-display font-extrabold"
          style={{ left: "10%", top: "75%", width: "80%" }}
        >
          <span className="text-xs tracking-wide text-muted-foreground uppercase">Sua média (OVR)</span>
          <span className="text-3xl">
            <Count from={ovrFrom} to={ovrTo} delay={4.9} duration={0.5} steps={Math.abs(delta)} />
          </span>
          {delta !== 0 && (
            <span className="fusion-delta flex items-center text-lg text-success">
              <ArrowUpIcon aria-hidden className={`size-4 ${delta < 0 ? "rotate-180 text-destructive" : ""}`} />
              {Math.abs(delta)}
            </span>
          )}
        </div>
        <div
          aria-hidden
          className="fusion-flash pointer-events-none absolute -inset-x-6 -inset-y-4"
          style={{ background: "radial-gradient(circle at 50% 38%, #fff 0, rgba(255,230,160,.8) 25%, transparent 60%)" }}
        />
      </div>
      <p className="fusion-cap-1 text-center text-sm font-medium">
        Sua carta + o desempenho da <span className="text-primary">rodada {round}</span>
        {hasGoals ? ". Os gols somam no Ataque." : "."}
      </p>
    </div>
  );
}
