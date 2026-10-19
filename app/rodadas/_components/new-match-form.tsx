"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ArmchairIcon, CheckCircle2Icon, ShuffleIcon } from "lucide-react";
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
import { draftMatch, MATCH_TEAMS, PLAYERS_PER_TEAM } from "@/lib/draft";
import { teamName } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { POSITION_LABELS } from "@/types/player";
import { createMatch } from "../_actions/create-match";
import type { DraftMember } from "../_data-access/get-rounds-overview";
import { newMatchSchema, type NewMatchInput } from "../_schemas/new-match-schema";

type NewMatchFormProps = {
  members: DraftMember[];
  today: string;
};

/** Branco (1) e Preto (2), na ordem em que aparecem. */
const TEAM_NUMBERS = Array.from({ length: MATCH_TEAMS }, (_, index) => index + 1);

/** Vagas do seletor de cada jogador: titular ou reserva de cada time ("1:s", "1:r", "2:s", "2:r"). */
const SLOTS = TEAM_NUMBERS.flatMap((team) => [
  { value: `${team}:s`, team, reserve: false, label: teamName(team) },
  { value: `${team}:r`, team, reserve: true, label: `${teamName(team)} · reserva` },
]);

/** Bolinha da cor do time (branco com aro / preto com aro). */
function TeamSwatch({ team }: { team: number }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3 rounded-full border", team === 1 ? "bg-white" : "bg-black border-white/40")}
    />
  );
}

/** Data + confirmados do WhatsApp + sorteio: Branco e Preto, titulares e reservas equilibrados pelo OVR. */
export function NewMatchForm({ members, today }: NewMatchFormProps) {
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
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
    // Mudou a lista: o sorteio antigo não vale mais.
    form.setValue("players", []);
    setCreatedRound(null);
  }

  function handleDraft() {
    const confirmed = confirmedIds.flatMap((id) => {
      const member = memberById.get(id);
      return member
        ? [{ id, role: member.position === "GOL" ? ("goalkeeper" as const) : ("outfield" as const), ovr: member.ovr }]
        : [];
    });
    const { teams } = draftMatch(confirmed);
    form.setValue(
      "players",
      teams.flatMap((team) => [
        ...team.playerIds.map((memberId) => ({ memberId, team: team.number, reserve: false })),
        ...team.reserveIds.map((memberId) => ({ memberId, team: team.number, reserve: true })),
      ]),
      { shouldValidate: true },
    );
  }

  function handleMovePlayer(memberId: string, slotValue: string) {
    const slot = SLOTS.find((candidate) => candidate.value === slotValue);
    if (!slot) return;
    form.setValue(
      "players",
      players.map((player) =>
        player.memberId === memberId ? { ...player, team: slot.team, reserve: slot.reserve } : player,
      ),
      { shouldValidate: true },
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
      form.reset({ playedOn: today, players: [] });
    });
  }

  return (
    <section aria-labelledby="new-match-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 id="new-match-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Nova rodada
        </h2>
        <p className="text-sm text-muted-foreground">
          Marque quem confirmou no WhatsApp e sorteie o time Branco e o time Preto pelo OVR.
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
              <FieldDescription>
                Time Branco e time Preto com {PLAYERS_PER_TEAM} titulares (1 goleiro + {PLAYERS_PER_TEAM - 1} na
                linha), equilibrados pelo OVR. Com mais de {MATCH_TEAMS * PLAYERS_PER_TEAM} confirmados, o sorteio
                decide quem começa e divide o resto igualmente em reservas dos dois times.
              </FieldDescription>
              <Button type="button" variant="secondary" size="lg" className="h-11 w-full text-base" onClick={handleDraft}>
                <ShuffleIcon aria-hidden />
                {hasTeams ? "Sortear de novo" : "Sortear times"}
              </Button>

              {hasTeams && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {TEAM_NUMBERS.map((teamNumber) => {
                    const teamPlayers = players.filter((player) => player.team === teamNumber);
                    const starters = teamPlayers.filter((player) => !player.reserve);
                    const reserves = teamPlayers.filter((player) => player.reserve);
                    // Média só dos titulares (quem começa em quadra).
                    const knownOvrs = starters.flatMap((player) => {
                      const ovr = memberById.get(player.memberId)?.ovr;
                      return ovr == null ? [] : [ovr];
                    });
                    const averageOvr =
                      knownOvrs.length > 0
                        ? Math.round(knownOvrs.reduce((sum, ovr) => sum + ovr, 0) / knownOvrs.length)
                        : null;
                    const hasGoalkeeper = starters.some(
                      (player) => memberById.get(player.memberId)?.position === "GOL",
                    );

                    function renderPlayer(player: (typeof players)[number]) {
                      const member = memberById.get(player.memberId);
                      if (!member) return null;
                      const slotValue = `${player.team}:${player.reserve ? "r" : "s"}`;
                      return (
                        <li key={player.memberId} className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate">
                            {member.nickname}
                            {member.position === "GOL" && <span className="text-xs text-muted-foreground"> · GOL</span>}
                          </span>
                          <label className="sr-only" htmlFor={`team-of-${member.id}`}>
                            Onde fica {member.nickname}
                          </label>
                          <select
                            id={`team-of-${member.id}`}
                            value={slotValue}
                            onChange={(event) => handleMovePlayer(member.id, event.target.value)}
                            className="h-8 rounded-md border bg-background px-1.5 text-xs"
                          >
                            {SLOTS.map((slot) => (
                              <option key={slot.value} value={slot.value}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                        </li>
                      );
                    }

                    return (
                      <div key={teamNumber} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
                        <div className="flex items-baseline justify-between">
                          <h3 className="flex items-center gap-2 font-display text-base font-bold uppercase">
                            <TeamSwatch team={teamNumber} />
                            Time {teamName(teamNumber)}
                          </h3>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {starters.length} · média {averageOvr ?? "–"}
                          </span>
                        </div>
                        {!hasGoalkeeper && starters.length > 0 && (
                          <p className="text-xs text-muted-foreground">Sem goleiro: rodízio no gol.</p>
                        )}
                        <ul className="flex flex-col gap-1">{starters.map(renderPlayer)}</ul>
                        {reserves.length > 0 && (
                          <div className="flex flex-col gap-1 border-t border-dashed pt-2">
                            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
                              <ArmchairIcon aria-hidden className="size-3.5" />
                              Reservas · {reserves.length}
                            </p>
                            <ul className="flex flex-col gap-1">{reserves.map(renderPlayer)}</ul>
                          </div>
                        )}
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
