"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, awardOrder, type Award } from "@/types/award";
import type { MatchWinners } from "../_data-access/get-match-winners";
import { markAwardsSeen } from "../_actions/mark-awards-seen";
import { RevealAward } from "./reveal-award";
import { RevealHighlights } from "./reveal-highlights";
import { RevealPack } from "./reveal-pack";
import { RevealRewards } from "./reveal-rewards";
import { RevealSummary } from "./reveal-summary";
import { RevealTeam } from "./reveal-team";
import { PACK_THEMES, ZOEIRA_AWARDS } from "./reveal-theme";
import { RevealZoeira } from "./reveal-zoeira";

/** Tempo do pacote tremendo e abrindo antes da primeira carta (igual às animações do CSS). */
const OPENING_MS = 1600;

type Stage = { type: "pack" } | { type: "opening" } | { type: "step"; index: number } | { type: "summary" };

/** Um passo da revelação: um grupo de cartas numa tela só, o Melhor Jogador ou a sua rodada. */
type Step =
  | { type: "zoeira"; awards: Award[] }
  | { type: "highlights"; awards: Award[] }
  | { type: "team" }
  | { type: "month"; awards: Award[] }
  | { type: "award"; award: Award }
  | { type: "rewards" };

/**
 * O pacote em até 6 passos (pedido do dono do app em 2026-10-21, "menos
 * maçante"): a zoeira (Bola Murcha e Fominha juntas), os destaques da rodada num
 * quadro (atributos, Goleiro e Gol), o Time da Semana, o Time do Mês (só na última
 * quinta), o Melhor Jogador sozinho e, fechando, a sua rodada.
 */
function buildSteps(revealed: Award[], hasTeam: boolean, hasRewards: boolean): Step[] {
  const zoeira = revealed.filter((award) => ZOEIRA_AWARDS.includes(award.kind));
  const month = revealed.filter((award) => award.kind === "jogador_do_mes");
  const best = revealed.filter((award) => award.kind === "craque");
  const highlights = revealed.filter(
    (award) => !ZOEIRA_AWARDS.includes(award.kind) && award.kind !== "jogador_do_mes" && award.kind !== "craque",
  );
  const steps: Step[] = [];
  if (zoeira.length > 0) steps.push({ type: "zoeira", awards: zoeira });
  if (highlights.length > 0) steps.push({ type: "highlights", awards: highlights });
  if (hasTeam) steps.push({ type: "team" });
  if (month.length > 0) steps.push({ type: "month", awards: month });
  for (const award of best) steps.push({ type: "award", award });
  if (hasRewards) steps.push({ type: "rewards" });
  return steps;
}

/** Texto do botão que leva ao próximo passo (anuncia o que vem). */
function nextLabel(steps: Step[], index: number): string {
  const current = steps[index];
  const next = steps[index + 1];
  if (!next || current.type === "rewards") return "Ver todos os vencedores";
  switch (next.type) {
    case "highlights":
      return "Ver os destaques da rodada";
    case "team":
      return "E o Time da Semana…";
    case "month":
      return "E o Time do Mês…";
    case "rewards":
      return "Ver a sua rodada";
    case "award":
      return current.type === "award" ? "Próxima carta" : `E o ${AWARD_LABELS[next.award.kind].title}…`;
    default:
      return "Próximo";
  }
}

type WinnersRevealProps = {
  winners: MatchWinners;
  currentMemberId: string;
};

function describeContents(cardCount: number, hasTeam: boolean): string {
  const cards = cardCount === 1 ? "1 carta" : `${cardCount} cartas`;
  if (cardCount === 0) return "Time da Semana";
  return hasTeam ? `${cards} + Time da Semana` : cards;
}

/** Abertura do pacote da rodada: um passo por vez (`buildSteps`), depois o resumo. */
export function WinnersReveal({ winners, currentMemberId }: WinnersRevealProps) {
  const { match, theme, revealed, team, rewards } = winners;
  const [stage, setStage] = useState<Stage>({ type: "pack" });
  const [, startTransition] = useTransition();
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const steps = buildSteps(revealed, team.length > 0, Boolean(rewards));

  useEffect(() => {
    return () => {
      if (openingTimer.current) clearTimeout(openingTimer.current);
    };
  }, []);

  function goToStep(index: number) {
    setStage(index < steps.length ? { type: "step", index } : { type: "summary" });
  }

  function handleOpen() {
    if (stage.type !== "pack") return;
    setStage({ type: "opening" });
    // Abriu o pacote: o aviso some da home (falhar aqui não atrapalha a animação).
    startTransition(async () => {
      try {
        await markAwardsSeen(match.id);
      } catch (error) {
        console.error("markAwardsSeen", error);
      }
    });
    openingTimer.current = setTimeout(() => goToStep(0), OPENING_MS);
  }

  function handleReplay() {
    setStage({ type: "pack" });
  }

  const total = steps.length;
  const step = stage.type === "step" ? stage.index : null;
  const isPlaying = step !== null;
  const current = step === null ? null : steps[step];
  const summaryAwards = revealed.toSorted((a, b) => awardOrder(a.kind) - awardOrder(b.kind));

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 overflow-hidden text-foreground",
        PACK_THEMES[theme].screen,
        // Quem prefere menos movimento vê tudo parado (as camadas de efeito somem).
        "motion-reduce:**:animate-none!",
      )}
    >
      {/* Sombra atrás do cabeçalho: o que rola por baixo não se mistura ao título. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-linear-to-b from-black/85 via-black/60 to-transparent"
      />
      <header className="absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between gap-2 px-2">
        <Link
          href="/"
          aria-label="Fechar"
          className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <XIcon aria-hidden className="size-5" />
        </Link>
        <span className="font-display text-lg font-bold tracking-wider text-muted-foreground uppercase">
          Rodada {match.round} · Vencedores
        </span>
        {isPlaying ? (
          <button
            type="button"
            // Pular leva à "Sua rodada" (se houver), para ninguém perder o que ganhou.
            onClick={() => {
              const rewardsIndex = steps.findIndex((candidate) => candidate.type === "rewards");
              goToStep(rewardsIndex >= 0 && current?.type !== "rewards" ? rewardsIndex : steps.length);
            }}
            className="h-11 px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Pular
          </button>
        ) : (
          <span className="size-11" />
        )}
      </header>

      {isPlaying && (
        <div aria-hidden className="absolute inset-x-0 top-15 z-20 flex justify-center gap-1.5 px-4">
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-1 w-5 rounded-full",
                index < step ? "bg-primary" : index === step ? "bg-foreground" : "bg-white/20",
              )}
            />
          ))}
        </div>
      )}

      {(stage.type === "pack" || stage.type === "opening") && (
        <RevealPack
          round={match.round}
          theme={theme}
          contents={describeContents(revealed.length, team.length > 0)}
          isOpening={stage.type === "opening"}
          onOpen={handleOpen}
        />
      )}

      {step !== null && current?.type === "award" && (
        <RevealAward
          // Nova `key` a cada carta: a sequência de animações recomeça.
          key={current.award.id}
          award={current.award}
          nextLabel={nextLabel(steps, step)}
          onNext={() => goToStep(step + 1)}
        />
      )}

      {step !== null && current?.type === "zoeira" && (
        <RevealZoeira awards={current.awards} nextLabel={nextLabel(steps, step)} onNext={() => goToStep(step + 1)} />
      )}

      {step !== null && current?.type === "highlights" && (
        <RevealHighlights awards={current.awards} nextLabel={nextLabel(steps, step)} onNext={() => goToStep(step + 1)} />
      )}

      {step !== null && current?.type === "team" && (
        <RevealTeam
          key="time-da-semana"
          team={team}
          subtitle="As 4 maiores notas da linha e a maior do gol"
          doneLabel={nextLabel(steps, step)}
          onDone={() => goToStep(step + 1)}
        />
      )}

      {step !== null && current?.type === "month" && (
        <RevealTeam
          key="time-do-mes"
          team={current.awards}
          subtitle="As 4 maiores médias do mês na linha e a maior do gol"
          doneLabel={nextLabel(steps, step)}
          onDone={() => goToStep(step + 1)}
        />
      )}

      {step !== null && current?.type === "rewards" && rewards && (
        <RevealRewards round={match.round} rewards={rewards} onDone={() => goToStep(step + 1)} />
      )}

      {stage.type === "summary" && (
        <RevealSummary
          round={match.round}
          awards={summaryAwards}
          team={team}
          collectionHref={`/jogadores/${currentMemberId}/colecao`}
          onReplay={handleReplay}
        />
      )}
    </div>
  );
}
