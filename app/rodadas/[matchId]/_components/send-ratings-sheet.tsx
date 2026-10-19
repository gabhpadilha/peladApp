"use client";

import { VoteStep } from "@/app/avaliar/[matchId]/_components/vote-step";
import type { RatingTarget } from "@/app/avaliar/[matchId]/_data-access/get-rating-session";
import type { RoundVotesInput } from "@/app/avaliar/[matchId]/_schemas/evaluation-schema";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AWARD_KINDS, type AwardKind } from "@/types/award";

type SendRatingsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: RatingTarget[];
  ratedCount: number;
  votes: RoundVotesInput;
  onVote: (kind: AwardKind, playerId: string | undefined) => void;
  error: string | null;
  isPending: boolean;
  onSubmit: () => void;
};

/** Votos (Craque, Gol da Semana, Bola Murcha) e envio de todas as notas de uma vez. */
export function SendRatingsSheet({
  open,
  onOpenChange,
  targets,
  ratedCount,
  votes,
  onVote,
  error,
  isPending,
  onSubmit,
}: SendRatingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-md gap-0 overflow-hidden rounded-t-2xl">
        <SheetHeader className="border-b pb-4 text-left">
          <SheetTitle className="font-display text-2xl font-bold">Votar e enviar</SheetTitle>
          <SheetDescription>
            Você avaliou {ratedCount} de {targets.length}. Os votos são opcionais e anônimos; quem você não avaliar fica
            sem nota sua.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-5">
          {AWARD_KINDS.map((kind) => (
            <VoteStep
              key={kind}
              kind={kind}
              targets={targets}
              selected={votes[kind]}
              onSelect={(playerId) => onVote(kind, playerId)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="button"
            size="lg"
            className="h-12 w-full text-base"
            disabled={isPending || ratedCount === 0}
            onClick={onSubmit}
          >
            {isPending ? "Enviando…" : `Enviar notas (${ratedCount})`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
