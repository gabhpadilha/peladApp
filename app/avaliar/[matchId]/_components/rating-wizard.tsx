"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { CheckCircle2Icon, ChevronLeftIcon, PencilIcon, XIcon } from "lucide-react";
import { PlayerCard } from "@/components/player-card";
import { Button } from "@/components/ui/button";
import { formatWeekdayDate } from "@/lib/format-date";
import { teamRoleLabel } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { AWARD_LABELS, VOTE_AWARD_KINDS, type VoteAwardKind } from "@/types/award";
import {
  ATTRIBUTE_LABELS,
  GOALKEEPER_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITION_LABELS,
  type Player,
  type PlayerAttribute,
} from "@/types/player";
import { submitEvaluations } from "../_actions/submit-evaluations";
import type { RatingTarget } from "../_data-access/get-rating-session";
import {
  submitEvaluationsSchema,
  type PlayerEvaluationInput,
  type RoundVotesInput,
} from "../_schemas/evaluation-schema";
import { AttributeSlider } from "./attribute-slider";
import { VoteStep } from "./vote-step";

type Draft = {
  skipped: boolean;
  scores: Partial<Record<PlayerAttribute, number>>;
};

type RatingFormValues = {
  drafts: Record<string, Draft>;
  votes: RoundVotesInput;
};

type RatingWizardProps = {
  match: { id: string; round: number; date: string };
  targets: RatingTarget[];
};

/** Passo atual: um jogador, um prêmio para votar ou a revisão. */
type Step =
  | { type: "player"; target: RatingTarget }
  | { type: "vote"; kind: VoteAwardKind }
  | { type: "review" };

function getAttributeKeys(player: Player): readonly PlayerAttribute[] {
  return player.role === "goalkeeper" ? GOALKEEPER_ATTRIBUTES : OUTFIELD_ATTRIBUTES;
}

function isComplete(player: Player, draft: Draft | undefined): boolean {
  return getAttributeKeys(player).every((key) => draft?.scores[key] !== undefined);
}

function averageScore(draft: Draft): number {
  const values = Object.values(draft.scores).filter((score) => score !== undefined);
  return values.reduce((sum, score) => sum + score, 0) / values.length;
}

/**
 * Notas da rodada, um jogador por vez (mobile, no vestiário): 6 sliders,
 * "Próximo" só com os 6 tocados, "Pular" para quem você não viu jogar.
 * Depois, um voto por prêmio (Gol da Rodada, Fominha, Bola Murcha; o resto sai das notas), revisão
 * e envio de tudo de uma vez.
 */
export function RatingWizard({ match, targets }: RatingWizardProps) {
  const steps: Step[] = [
    ...targets.map((target) => ({ type: "player" as const, target })),
    ...VOTE_AWARD_KINDS.map((kind) => ({ type: "vote" as const, kind })),
    { type: "review" },
  ];
  const reviewIndex = steps.length - 1;
  const firstVoteIndex = targets.length;

  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<{ ratedCount: number; voteCount: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<RatingFormValues>({ defaultValues: { drafts: {}, votes: {} } });
  const drafts = useWatch({ control: form.control, name: "drafts" });
  const votes = useWatch({ control: form.control, name: "votes" });

  const step = steps[index];
  const currentDraft = step.type === "player" ? drafts[step.target.player.id] : undefined;
  const canAdvance = step.type === "player" ? isComplete(step.target.player, currentDraft) : true;
  const ratedTargets = targets.filter(
    (target) => !drafts[target.player.id]?.skipped && isComplete(target.player, drafts[target.player.id]),
  );
  const nameById = new Map(targets.map((target) => [target.player.id, target.player.nickname]));

  function setScore(playerId: string, key: PlayerAttribute, value: number) {
    const draft = form.getValues(`drafts.${playerId}`) ?? { skipped: false, scores: {} };
    form.setValue(`drafts.${playerId}`, { skipped: false, scores: { ...draft.scores, [key]: value } });
  }

  function setVote(kind: VoteAwardKind, playerId: string | undefined) {
    form.setValue(`votes.${kind}`, playerId);
  }

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    window.scrollTo({ top: 0 });
  }

  function handleNext() {
    if (step.type === "player") form.setValue(`drafts.${step.target.player.id}.skipped`, false);
    goTo(index + 1);
  }

  function handleSkip() {
    if (step.type === "player") {
      const playerId = step.target.player.id;
      const draft = form.getValues(`drafts.${playerId}`) ?? { skipped: true, scores: {} };
      form.setValue(`drafts.${playerId}`, { ...draft, skipped: true });
    } else if (step.type === "vote") {
      setVote(step.kind, undefined);
    }
    goTo(index + 1);
  }

  function handleSubmit() {
    setSubmitError(null);
    const evaluations: PlayerEvaluationInput[] = ratedTargets.map(({ player }) => {
      const scores = drafts[player.id].scores;
      return player.role === "goalkeeper"
        ? { playerId: player.id, role: "goalkeeper", scores: Object.fromEntries(GOALKEEPER_ATTRIBUTES.map((key) => [key, scores[key]])) as Extract<PlayerEvaluationInput, { role: "goalkeeper" }>["scores"] }
        : { playerId: player.id, role: "outfield", scores: Object.fromEntries(OUTFIELD_ATTRIBUTES.map((key) => [key, scores[key]])) as Extract<PlayerEvaluationInput, { role: "outfield" }>["scores"] };
    });

    const validation = submitEvaluationsSchema.safeParse({ matchId: match.id, evaluations, votes });
    if (!validation.success) {
      setSubmitError("Avalie pelo menos um jogador antes de enviar.");
      return;
    }

    startTransition(async () => {
      const response = await submitEvaluations(validation.data);
      if (response.success) {
        setResult({ ratedCount: response.ratedCount, voteCount: response.voteCount });
        window.scrollTo({ top: 0 });
        return;
      }
      setSubmitError(response.message);
    });
  }

  if (result) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <CheckCircle2Icon aria-hidden className="size-14 text-primary" />
        <h1 className="font-display text-3xl font-bold">Notas enviadas!</h1>
        <p className="text-muted-foreground">
          Você avaliou {result.ratedCount} {result.ratedCount === 1 ? "jogador" : "jogadores"}
          {result.voteCount > 0 && ` e deu ${result.voteCount} ${result.voteCount === 1 ? "voto" : "votos"}`} na
          rodada {match.round}. Quando o organizador fechar a rodada, as notas entram no OVR e os mais votados
          ganham as cartas especiais.
        </p>
        <Button asChild size="lg" className="h-11 w-full text-base">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </main>
    );
  }

  const progressLabel =
    step.type === "player"
      ? `${index + 1}/${targets.length}`
      : step.type === "vote"
        ? `Voto ${index - firstVoteIndex + 1}/${VOTE_AWARD_KINDS.length}`
        : "Revisão";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Topo fixo: rodada e progresso */}
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 pt-3 pb-2">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Sair da avaliação">
            <Link href="/">
              <XIcon />
            </Link>
          </Button>
          <div className="flex flex-1 flex-col">
            <p className="text-sm font-medium">Rodada {match.round}</p>
            <p className="text-xs text-muted-foreground first-letter:uppercase">{formatWeekdayDate(match.date)}</p>
          </div>
          <p className="font-display text-lg font-bold tabular-nums" aria-live="polite">
            {progressLabel}
          </p>
        </div>
        <div className="mx-auto w-full max-w-md px-4 pb-2">
          <progress
            value={index}
            max={reviewIndex}
            aria-label="Progresso da avaliação"
            className="h-1 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-5 pb-32">
        {step.type === "player" && (
          <>
            <div className="flex items-center gap-4">
              <PlayerCard player={step.target.player} size="sm" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase">
                  {step.target.team !== null && `${teamRoleLabel(step.target.team, step.target.isReserve)} · `}
                  {POSITION_LABELS[step.target.player.position]}
                </p>
                <h1 className="truncate font-display text-3xl font-bold">{step.target.player.nickname}</h1>
                <p className="truncate text-sm text-muted-foreground">{step.target.player.fullName}</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {getAttributeKeys(step.target.player).map((key) => (
                <AttributeSlider
                  key={`${step.target.player.id}-${key}`}
                  id={`score-${step.target.player.id}-${key}`}
                  abbreviation={ATTRIBUTE_LABELS[key].abbreviation}
                  name={ATTRIBUTE_LABELS[key].name}
                  value={currentDraft?.scores[key] ?? null}
                  onChange={(value) => setScore(step.target.player.id, key, value)}
                />
              ))}
            </div>
          </>
        )}

        {step.type === "vote" && (
          <VoteStep
            kind={step.kind}
            targets={targets}
            selected={votes[step.kind]}
            onSelect={(playerId) => setVote(step.kind, playerId)}
          />
        )}

        {step.type === "review" && (
          <ReviewList
            targets={targets}
            drafts={drafts}
            votes={votes}
            nameById={nameById}
            ratedCount={ratedTargets.length}
            firstVoteIndex={firstVoteIndex}
            onEdit={goTo}
          />
        )}
      </main>

      {/* Rodapé fixo na zona do polegar */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
          {step.type === "review" ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="lg" className="h-12" onClick={() => goTo(reviewIndex - 1)} aria-label="Voltar">
                <ChevronLeftIcon />
              </Button>
              <Button
                size="lg"
                className="h-12 flex-1 text-base"
                disabled={isPending || ratedTargets.length === 0}
                onClick={handleSubmit}
              >
                {isPending ? "Enviando…" : `Enviar notas (${ratedTargets.length})`}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="lg"
                className="h-12"
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
                aria-label="Voltar"
              >
                <ChevronLeftIcon />
              </Button>
              <Button variant="secondary" size="lg" className="h-12" onClick={handleSkip}>
                Pular
              </Button>
              <Button size="lg" className="h-12 flex-1 text-base" disabled={!canAdvance} onClick={handleNext}>
                {index === reviewIndex - 1 ? "Revisar" : "Próximo"}
              </Button>
            </div>
          )}
          {step.type === "player" && !canAdvance && (
            <p className="text-center text-xs text-muted-foreground">Dê nota nos 6 atributos ou toque em Pular.</p>
          )}
        </div>
      </footer>
    </div>
  );
}

type ReviewListProps = {
  targets: RatingTarget[];
  drafts: Record<string, Draft>;
  votes: RoundVotesInput;
  nameById: Map<string, string>;
  ratedCount: number;
  firstVoteIndex: number;
  onEdit: (index: number) => void;
};

function ReviewList({ targets, drafts, votes, nameById, ratedCount, firstVoteIndex, onEdit }: ReviewListProps) {
  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-6">
      <div>
        <h1 id="review-title" className="font-display text-3xl font-bold">Revisão</h1>
        <p className="text-sm text-muted-foreground">
          Você avaliou {ratedCount} de {targets.length}. Toque em um item para mudar.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-medium text-muted-foreground uppercase">Seus votos</h2>
        <ul className="flex flex-col">
          {VOTE_AWARD_KINDS.map((kind, kindIndex) => {
            const nomineeId = votes[kind];
            return (
              <li key={kind} className="border-t first:border-t-0">
                <button
                  type="button"
                  onClick={() => onEdit(firstVoteIndex + kindIndex)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{AWARD_LABELS[kind].title}</span>
                  <span className={cn("text-sm", nomineeId ? "font-medium" : "text-muted-foreground")}>
                    {nomineeId ? nameById.get(nomineeId) : "Ninguém"}
                  </span>
                  <PencilIcon aria-hidden className="size-4 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-medium text-muted-foreground uppercase">Suas notas</h2>
        <ul className="flex flex-col">
          {targets.map(({ player, team, isReserve }, targetIndex) => {
            const draft = drafts[player.id];
            const isRated = draft !== undefined && !draft.skipped && isComplete(player, draft);
            return (
              <li key={player.id} className="border-t first:border-t-0">
                <button
                  type="button"
                  onClick={() => onEdit(targetIndex)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{player.nickname}</span>
                    <span className="text-xs text-muted-foreground">
                      {team !== null && `${teamRoleLabel(team, isReserve)} · `}
                      {POSITION_LABELS[player.position]}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "font-display text-lg font-bold tabular-nums",
                      !isRated && "text-sm font-medium text-muted-foreground",
                    )}
                  >
                    {isRated ? averageScore(draft).toFixed(1).replace(".", ",") : "Pulado"}
                  </span>
                  <PencilIcon aria-hidden className="size-4 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
