"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";
import { submitEvaluations } from "@/app/avaliar/[matchId]/_actions/submit-evaluations";
import {
  submitEvaluationsSchema,
  type PlayerEvaluationInput,
  type RoundVotesInput,
} from "@/app/avaliar/[matchId]/_schemas/evaluation-schema";
import type { RatingTarget } from "@/app/avaliar/[matchId]/_data-access/get-rating-session";
import { Button } from "@/components/ui/button";
import { countFilled, draftAverage, isDraftComplete, type ScoreDraft } from "@/lib/rating-drafts";
import type { VoteAwardKind } from "@/types/award";
import { GOALKEEPER_ATTRIBUTES, OUTFIELD_ATTRIBUTES, type PlayerAttribute } from "@/types/player";
import type { BoardPlayer, MatchBoard } from "../_data-access/get-match-board";
import type { RatingState } from "./board-card";
import { RatePlayerSheet } from "./rate-player-sheet";
import { SendRatingsSheet } from "./send-ratings-sheet";
import { TeamPitch } from "./team-pitch";

type MatchBoardViewProps = {
  board: MatchBoard;
};

/**
 * Mesa tática da rodada: Branco e Preto em campo, com as cartas completas.
 * Em rodada aberta, tocar numa carta abre as notas do jogador; no fim, "Votar e
 * enviar" manda tudo de uma vez (mesma ação da tela passo a passo).
 */
export function MatchBoardView({ board }: MatchBoardViewProps) {
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});
  const [votes, setVotes] = useState<RoundVotesInput>({});
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [sent, setSent] = useState<{ ratedCount: number; voteCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const everyone: BoardPlayer[] = board.teams.flatMap((team) => [...team.starters, ...team.reserves]);
  const ratable = everyone.filter((entry) => !entry.isSelf);
  const canRate = board.canRate && sent === null;
  const rated = ratable.filter((entry) => isDraftComplete(entry.player, drafts[entry.player.id]));
  const ratingEntry = everyone.find((entry) => entry.player.id === ratingId) ?? null;
  const targets: RatingTarget[] = ratable.map((entry) => ({
    player: entry.player,
    team: entry.team,
    isReserve: entry.isReserve,
  }));

  function ratingOf(playerId: string): RatingState {
    const entry = everyone.find((candidate) => candidate.player.id === playerId);
    const draft = drafts[playerId];
    if (!entry || !draft) return { kind: "idle" };
    if (isDraftComplete(entry.player, draft)) return { kind: "done", average: draftAverage(draft) ?? 0 };
    const filled = countFilled(entry.player, draft);
    return filled > 0 ? { kind: "partial", filled } : { kind: "idle" };
  }

  function handleScore(playerId: string, key: PlayerAttribute, value: number) {
    setDrafts((current) => ({ ...current, [playerId]: { ...current[playerId], [key]: value } }));
  }

  function handleClear(playerId: string) {
    setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== playerId)));
  }

  function handleVote(kind: VoteAwardKind, playerId: string | undefined) {
    setVotes((current) => ({ ...current, [kind]: playerId }));
  }

  function handleSubmit() {
    setError(null);
    const evaluations: PlayerEvaluationInput[] = rated.map(({ player }) => {
      const scores = drafts[player.id];
      return player.role === "goalkeeper"
        ? {
            playerId: player.id,
            role: "goalkeeper",
            scores: Object.fromEntries(GOALKEEPER_ATTRIBUTES.map((key) => [key, scores[key]])) as Extract<
              PlayerEvaluationInput,
              { role: "goalkeeper" }
            >["scores"],
          }
        : {
            playerId: player.id,
            role: "outfield",
            scores: Object.fromEntries(OUTFIELD_ATTRIBUTES.map((key) => [key, scores[key]])) as Extract<
              PlayerEvaluationInput,
              { role: "outfield" }
            >["scores"],
          };
    });

    const validation = submitEvaluationsSchema.safeParse({ matchId: board.match.id, evaluations, votes });
    if (!validation.success) {
      setError("Avalie pelo menos um jogador antes de enviar.");
      return;
    }

    startTransition(async () => {
      const response = await submitEvaluations(validation.data);
      if (response.success) {
        setSent({ ratedCount: response.ratedCount, voteCount: response.voteCount });
        setIsSendOpen(false);
        window.scrollTo({ top: 0 });
        return;
      }
      setError(response.message);
    });
  }

  const mode = canRate ? "rate" : "view";

  return (
    <>
      {sent && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm">
          <CheckCircle2Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Notas enviadas! Você avaliou {sent.ratedCount} {sent.ratedCount === 1 ? "jogador" : "jogadores"}
            {sent.voteCount > 0 && ` e deu ${sent.voteCount} ${sent.voteCount === 1 ? "voto" : "votos"}`}. Quando o
            organizador fechar a rodada, as notas entram no OVR e os mais votados ganham as cartas especiais.
          </span>
        </p>
      )}
      {board.isOutOfRound && (
        <p role="status" className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Você não jogou essa rodada: aqui é só para ver os times. Quem jogou dá as notas até o organizador fechar a
          rodada.
        </p>
      )}
      {(board.hasSubmitted || sent) && !sent && (
        <p role="status" className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Você já enviou suas notas dessa rodada. Elas entram no OVR quando o organizador fechar a rodada.
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">
        {board.teams.map((team) => (
          <TeamPitch key={team.number} team={team} mode={mode} ratingOf={ratingOf} onRate={setRatingId} />
        ))}
      </div>

      {canRate && (
        <>
          {/* `data-rate-bar`: enquanto ela aparece, o menu de baixo sai do caminho (globals.css). */}
          <div data-rate-bar className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums">
                  Avaliados {rated.length} de {ratable.length}
                </p>
                <progress
                  value={rated.length}
                  max={Math.max(ratable.length, 1)}
                  aria-label="Progresso da avaliação"
                  className="mt-1 h-1 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
                />
              </div>
              <Button size="lg" className="h-12 px-5 text-base" onClick={() => setIsSendOpen(true)}>
                Votar e enviar
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Toque numa carta para dar as notas.{" "}
            <Link href={`/avaliar/${board.match.id}`} className="underline underline-offset-2">
              Prefere um por vez?
            </Link>
          </p>
        </>
      )}

      <RatePlayerSheet
        entry={canRate ? ratingEntry : null}
        draft={ratingEntry ? drafts[ratingEntry.player.id] : undefined}
        onScore={handleScore}
        onClear={handleClear}
        onClose={() => setRatingId(null)}
      />
      <SendRatingsSheet
        open={canRate && isSendOpen}
        onOpenChange={setIsSendOpen}
        targets={targets}
        ratedCount={rated.length}
        votes={votes}
        onVote={handleVote}
        error={error}
        isPending={isPending}
        onSubmit={handleSubmit}
      />
    </>
  );
}
