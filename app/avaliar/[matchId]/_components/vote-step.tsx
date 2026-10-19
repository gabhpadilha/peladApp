"use client";

import { FrownIcon, GoalIcon, TrophyIcon, type LucideIcon } from "lucide-react";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AWARD_LABELS, type AwardKind } from "@/types/award";
import { POSITION_LABELS } from "@/types/player";
import type { RatingTarget } from "../_data-access/get-rating-session";

const AWARD_ICONS: Record<AwardKind, LucideIcon> = {
  craque: TrophyIcon,
  gol: GoalIcon,
  bola_murcha: FrownIcon,
};

/** Valor do RadioGroup para "não votar nesse prêmio". */
export const NO_VOTE = "none";

type VoteStepProps = {
  kind: AwardKind;
  targets: RatingTarget[];
  /** Id do jogador escolhido; `undefined` = ninguém. */
  selected: string | undefined;
  onSelect: (playerId: string | undefined) => void;
};

/** Um prêmio por tela: escolhe um jogador (ou ninguém). Votos são anônimos. */
export function VoteStep({ kind, targets, selected, onSelect }: VoteStepProps) {
  const Icon = AWARD_ICONS[kind];
  const groupId = `vote-${kind}`;

  return (
    <section aria-labelledby={`${groupId}-title`} className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon aria-hidden className="size-6" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground uppercase">{AWARD_LABELS[kind].title}</p>
          <h1 id={`${groupId}-title`} className="font-display text-2xl font-bold">
            {AWARD_LABELS[kind].question}
          </h1>
          <p className="text-sm text-muted-foreground">{AWARD_LABELS[kind].hint} Seu voto é anônimo.</p>
        </div>
      </div>

      <RadioGroup
        aria-labelledby={`${groupId}-title`}
        value={selected ?? NO_VOTE}
        onValueChange={(value) => onSelect(value === NO_VOTE ? undefined : value)}
        className="gap-2"
      >
        {targets.map(({ player, team }) => (
          <FieldLabel key={player.id} htmlFor={`${groupId}-${player.id}`}>
            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-0.5">
                <FieldTitle>{player.nickname}</FieldTitle>
                <span className="text-xs text-muted-foreground">
                  {team !== null ? `Time ${team} · ` : "Banco · "}
                  {POSITION_LABELS[player.position]}
                </span>
              </div>
              <RadioGroupItem value={player.id} id={`${groupId}-${player.id}`} className="size-5" />
            </Field>
          </FieldLabel>
        ))}
        <FieldLabel htmlFor={`${groupId}-${NO_VOTE}`}>
          <Field orientation="horizontal">
            <div className="flex flex-1 flex-col gap-0.5">
              <FieldTitle>Ninguém</FieldTitle>
              <span className="text-xs text-muted-foreground">Não quero votar nesse prêmio.</span>
            </div>
            <RadioGroupItem value={NO_VOTE} id={`${groupId}-${NO_VOTE}`} className="size-5" />
          </Field>
        </FieldLabel>
      </RadioGroup>
    </section>
  );
}
