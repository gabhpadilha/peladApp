"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AWARD_KINDS } from "@/types/award";
import type { MatchWinners } from "../_data-access/get-match-winners";
import { markAwardsSeen } from "../_actions/mark-awards-seen";
import { RevealAward } from "./reveal-award";
import { RevealPack } from "./reveal-pack";
import { RevealSummary } from "./reveal-summary";
import { RevealTeam } from "./reveal-team";
import { PACK_THEMES } from "./reveal-theme";

/** Tempo do pacote tremendo e abrindo antes da primeira carta (igual às animações do CSS). */
const OPENING_MS = 1600;

type Stage =
  | { type: "pack" }
  | { type: "opening" }
  | { type: "award"; index: number }
  | { type: "team" }
  | { type: "summary" };

type WinnersRevealProps = {
  winners: MatchWinners;
  currentMemberId: string;
};

function describeContents(cardCount: number, hasTeam: boolean): string {
  const cards = cardCount === 1 ? "1 carta" : `${cardCount} cartas`;
  if (cardCount === 0) return "Time da Semana";
  return hasTeam ? `${cards} + Time da Semana` : cards;
}

/** Abertura do pacote da rodada: uma carta por vez, depois o Time da Semana e o resumo. */
export function WinnersReveal({ winners, currentMemberId }: WinnersRevealProps) {
  const { match, theme, revealed, team } = winners;
  const [stage, setStage] = useState<Stage>({ type: "pack" });
  const [, startTransition] = useTransition();
  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (openingTimer.current) clearTimeout(openingTimer.current);
    };
  }, []);

  function goAfterAwards() {
    setStage(team.length > 0 ? { type: "team" } : { type: "summary" });
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
    openingTimer.current = setTimeout(() => {
      if (revealed.length > 0) setStage({ type: "award", index: 0 });
      else goAfterAwards();
    }, OPENING_MS);
  }

  function handleNext(index: number) {
    if (index + 1 < revealed.length) setStage({ type: "award", index: index + 1 });
    else goAfterAwards();
  }

  function handleReplay() {
    setStage({ type: "pack" });
  }

  const total = revealed.length + (team.length > 0 ? 1 : 0);
  const step = stage.type === "award" ? stage.index : stage.type === "team" ? revealed.length : null;
  const isPlaying = step !== null;
  const summaryAwards = revealed.toSorted((a, b) => AWARD_KINDS.indexOf(a.kind) - AWARD_KINDS.indexOf(b.kind));

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 overflow-hidden text-foreground",
        PACK_THEMES[theme].screen,
        // Quem prefere menos movimento vê tudo parado (as camadas de efeito somem).
        "motion-reduce:**:animate-none!",
      )}
    >
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
            onClick={() => setStage({ type: "summary" })}
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

      {stage.type === "award" && (
        <RevealAward
          // Nova `key` a cada carta: a sequência de animações recomeça.
          key={revealed[stage.index].id}
          award={revealed[stage.index]}
          nextLabel={
            stage.index + 1 < revealed.length
              ? `Próxima carta (${stage.index + 2}/${revealed.length})`
              : team.length > 0
                ? "E o Time da Semana…"
                : "Ver todos os vencedores"
          }
          onNext={() => handleNext(stage.index)}
        />
      )}

      {stage.type === "team" && <RevealTeam team={team} onDone={() => setStage({ type: "summary" })} />}

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
