"use client";

import { useState } from "react";
import { ChevronLeftIcon } from "lucide-react";
import { VoteStep } from "@/app/avaliar/[matchId]/_components/vote-step";
import type { RatingTarget } from "@/app/avaliar/[matchId]/_data-access/get-rating-session";
import type { RoundVotesInput } from "@/app/avaliar/[matchId]/_schemas/evaluation-schema";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { VOTE_AWARD_KINDS, type VoteAwardKind } from "@/types/award";

type SendRatingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: RatingTarget[];
  ratedCount: number;
  votes: RoundVotesInput;
  onVote: (kind: VoteAwardKind, playerId: string | undefined) => void;
  error: string | null;
  isPending: boolean;
  onSubmit: () => void;
};

/**
 * Votos nos prêmios por voto, um por tela (hoje só o Gol da Rodada; pedido do
 * dono do app: nada de rolar entre prêmios), e o envio de todas as notas de uma
 * vez na última.
 */
export function SendRatingsSheet({ open, onOpenChange, ...props }: SendRatingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-hidden rounded-t-2xl">
        {/* Montado a cada abertura: sempre começa no primeiro voto. */}
        {open && <VoteSteps {...props} />}
      </SheetContent>
    </Sheet>
  );
}

function VoteSteps({
  targets,
  ratedCount,
  votes,
  onVote,
  error,
  isPending,
  onSubmit,
}: Omit<SendRatingsSheetProps, "open" | "onOpenChange">) {
  const [step, setStep] = useState(0);
  const kind = VOTE_AWARD_KINDS[step];
  const isLast = step === VOTE_AWARD_KINDS.length - 1;
  // Com um voto só (hoje, o Gol), sem contador nem barrinhas.
  const hasManyVotes = VOTE_AWARD_KINDS.length > 1;

  return (
    <>
      <SheetHeader className="border-b pb-4 text-left">
        {/* pr-9: o contador não encosta no X de fechar a folha. */}
        <div className="flex items-center justify-between gap-3 pr-9">
          <SheetTitle className="font-display text-2xl font-bold">Votar e enviar</SheetTitle>
          {hasManyVotes && (
            <span className="text-sm text-muted-foreground tabular-nums">
              Voto {step + 1} de {VOTE_AWARD_KINDS.length}
            </span>
          )}
        </div>
        {hasManyVotes && (
          <div aria-hidden className="flex gap-1.5">
            {VOTE_AWARD_KINDS.map((key, index) => (
              <span key={key} className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        )}
        <SheetDescription>
          Você avaliou {ratedCount} de {targets.length}. Os votos são opcionais e anônimos; quem você não avaliar fica
          sem nota sua.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
        <VoteStep key={kind} kind={kind} targets={targets} selected={votes[kind]} onSelect={(playerId) => onVote(kind, playerId)} />
      </div>

      <div className="flex flex-col gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          {step > 0 && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-12 px-4 text-base"
              aria-label="Voto anterior"
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeftIcon aria-hidden className="size-5" />
            </Button>
          )}
          {isLast ? (
            <Button
              type="button"
              size="lg"
              className="h-12 flex-1 text-base"
              disabled={isPending || ratedCount === 0}
              onClick={onSubmit}
            >
              {isPending ? "Enviando…" : `Enviar notas (${ratedCount})`}
            </Button>
          ) : (
            <Button type="button" size="lg" className="h-12 flex-1 text-base" onClick={() => setStep(step + 1)}>
              Próximo voto
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
