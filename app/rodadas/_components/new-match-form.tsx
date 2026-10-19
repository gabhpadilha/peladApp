"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CheckCircle2Icon, MinusIcon, PlusIcon, ShuffleIcon } from "lucide-react";
import { OvrBadge } from "@/components/ovr-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { draftTeams, getDefaultTeamCount, MAX_TEAMS, MIN_TEAMS } from "@/lib/draft";
import { POSITION_LABELS } from "@/types/player";
import { createMatch } from "../_actions/create-match";
import type { DraftMember } from "../_data-access/get-rounds-overview";
import { newMatchSchema, type NewMatchInput } from "../_schemas/new-match-schema";

type NewMatchFormProps = {
  members: DraftMember[];
  today: string;
};

/** Data + confirmados do WhatsApp + sorteio dos times pelo OVR. */
export function NewMatchForm({ members, today }: NewMatchFormProps) {
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [teamCount, setTeamCount] = useState(MIN_TEAMS);
  const [createdRound, setCreatedRound] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<NewMatchInput>({
    resolver: zodResolver(newMatchSchema),
    defaultValues: { playedOn: today, players: [] },
  });
  const players = useWatch({ control: form.control, name: "players" });
  const memberById = new Map(members.map((member) => [member.id, member]));
  const hasTeams = players.length > 0;

  function handleConfirmedChange(nextIds: string[]) {
    setConfirmedIds(nextIds);
    setTeamCount(getDefaultTeamCount(nextIds.length));
    // Mudou a lista: o sorteio antigo não vale mais.
    form.setValue("players", []);
    setCreatedRound(null);
  }

  function handleDraft(count = teamCount) {
    const confirmed = confirmedIds.flatMap((id) => {
      const member = memberById.get(id);
      return member
        ? [{ id, role: member.position === "GOL" ? ("goalkeeper" as const) : ("outfield" as const), ovr: member.ovr }]
        : [];
    });
    const teams = draftTeams(confirmed, count);
    form.setValue(
      "players",
      teams.flatMap((team) => team.playerIds.map((memberId) => ({ memberId, team: team.number }))),
      { shouldValidate: true },
    );
  }

  function handleTeamCountChange(nextCount: number) {
    const clamped = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, nextCount));
    setTeamCount(clamped);
    if (hasTeams) handleDraft(clamped);
  }

  function handleMovePlayer(memberId: string, team: number) {
    form.setValue(
      "players",
      players.map((player) => (player.memberId === memberId ? { ...player, team } : player)),
    );
  }

  function handleSubmit(data: NewMatchInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await createMatch(data);
      if (!result.success) {
        setFormError(result.message);
        return;
      }
      setCreatedRound(result.round);
      setConfirmedIds([]);
      setTeamCount(MIN_TEAMS);
      form.reset({ playedOn: today, players: [] });
    });
  }

  const teamNumbers = Array.from({ length: teamCount }, (_, index) => index + 1);

  return (
    <section aria-labelledby="new-match-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 id="new-match-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Nova rodada
        </h2>
        <p className="text-sm text-muted-foreground">
          Marque quem confirmou no WhatsApp e sorteie os times pelo OVR.
        </p>
      </div>

      {createdRound !== null && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
          <CheckCircle2Icon aria-hidden className="size-4 text-primary" />
          Rodada {createdRound} criada. Depois do jogo, os presentes avaliam.
        </p>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
        <FieldGroup>
          <Controller
            name="playedOn"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="min-w-0">
                <FieldLabel htmlFor="new-match-date">Data do jogo</FieldLabel>
                <Input
                  {...field}
                  id="new-match-date"
                  type="date"
                  aria-invalid={fieldState.invalid}
                  // iOS: o date nativo tem largura mínima própria e vaza do card; sem a aparência
                  // nativa e com min-w-0 ele respeita o w-full (texto à esquerda como os outros campos).
                  className="h-11 w-full min-w-0 appearance-none text-base [&::-webkit-date-and-time-value]:text-left"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <FieldSet>
            <div className="flex items-baseline justify-between">
              <FieldLegend variant="label">Confirmados</FieldLegend>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() =>
                  handleConfirmedChange(
                    confirmedIds.length === members.length ? [] : members.map((member) => member.id),
                  )
                }
              >
                {confirmedIds.length === members.length ? "Limpar" : "Marcar todos"}
              </Button>
            </div>
            <FieldDescription className="tabular-nums">
              {confirmedIds.length} de {members.length} marcados
            </FieldDescription>
            <FieldGroup data-slot="checkbox-group" className="gap-0">
              {members.map((member) => (
                <Field key={member.id} orientation="horizontal" className="border-t py-2 first:border-t-0">
                  <Checkbox
                    id={`confirmed-${member.id}`}
                    checked={confirmedIds.includes(member.id)}
                    onCheckedChange={(checked) =>
                      handleConfirmedChange(
                        checked
                          ? [...confirmedIds, member.id]
                          : confirmedIds.filter((id) => id !== member.id),
                      )
                    }
                    className="size-5"
                  />
                  <FieldLabel htmlFor={`confirmed-${member.id}`} className="flex-1 font-normal">
                    {member.nickname}
                    <span className="text-xs text-muted-foreground">{POSITION_LABELS[member.position]}</span>
                  </FieldLabel>
                  <OvrBadge ovr={member.ovr} />
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>

          {confirmedIds.length >= 2 && (
            <FieldSet>
              <FieldLegend variant="label">Times</FieldLegend>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 rounded-lg border p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Menos um time"
                    disabled={teamCount <= MIN_TEAMS}
                    onClick={() => handleTeamCountChange(teamCount - 1)}
                  >
                    <MinusIcon />
                  </Button>
                  <span className="w-16 text-center text-sm tabular-nums">{teamCount} times</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mais um time"
                    disabled={teamCount >= Math.min(MAX_TEAMS, confirmedIds.length)}
                    onClick={() => handleTeamCountChange(teamCount + 1)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
                <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => handleDraft()}>
                  <ShuffleIcon aria-hidden />
                  {hasTeams ? "Sortear de novo" : "Sortear times"}
                </Button>
              </div>

              {hasTeams && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {teamNumbers.map((teamNumber) => {
                    const teamPlayers = players.filter((player) => player.team === teamNumber);
                    const knownOvrs = teamPlayers.flatMap((player) => {
                      const ovr = memberById.get(player.memberId)?.ovr;
                      return ovr == null ? [] : [ovr];
                    });
                    const averageOvr =
                      knownOvrs.length > 0
                        ? Math.round(knownOvrs.reduce((sum, ovr) => sum + ovr, 0) / knownOvrs.length)
                        : null;
                    const hasGoalkeeper = teamPlayers.some(
                      (player) => memberById.get(player.memberId)?.position === "GOL",
                    );

                    return (
                      <div key={teamNumber} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
                        <div className="flex items-baseline justify-between">
                          <h3 className="font-display text-base font-bold uppercase">Time {teamNumber}</h3>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {teamPlayers.length} · média {averageOvr ?? "–"}
                          </span>
                        </div>
                        {!hasGoalkeeper && teamPlayers.length > 0 && (
                          <p className="text-xs text-muted-foreground">Sem goleiro: rodízio no gol.</p>
                        )}
                        <ul className="flex flex-col gap-1">
                          {teamPlayers.map((player) => {
                            const member = memberById.get(player.memberId);
                            if (!member) return null;
                            return (
                              <li key={player.memberId} className="flex items-center gap-2 text-sm">
                                <span className="min-w-0 flex-1 truncate">
                                  {member.nickname}
                                  {member.position === "GOL" && (
                                    <span className="text-xs text-muted-foreground"> · GOL</span>
                                  )}
                                </span>
                                <label className="sr-only" htmlFor={`team-of-${member.id}`}>
                                  Time de {member.nickname}
                                </label>
                                <select
                                  id={`team-of-${member.id}`}
                                  value={player.team}
                                  onChange={(event) => handleMovePlayer(member.id, Number(event.target.value))}
                                  className="h-8 rounded-md border bg-background px-1.5 text-xs"
                                >
                                  {teamNumbers.map((number) => (
                                    <option key={number} value={number}>
                                      Time {number}
                                    </option>
                                  ))}
                                </select>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </FieldSet>
          )}

          {form.formState.errors.players && (
            <FieldError>{form.formState.errors.players.message}</FieldError>
          )}
          {formError && <FieldError>{formError}</FieldError>}
          <Button
            type="submit"
            size="lg"
            disabled={isPending || !hasTeams}
            className="h-11 w-full text-base"
          >
            {isPending ? "Criando…" : "Criar rodada"}
          </Button>
        </FieldGroup>
      </form>
    </section>
  );
}
