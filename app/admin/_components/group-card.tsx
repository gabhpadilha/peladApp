"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { WEEKDAY_LABELS } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { groupDetailsSchema, type GroupDetailsInput } from "@/types/group-schema";
import { setGroupSuspended } from "../_actions/set-group-suspended";
import { updateAdminGroup } from "../_actions/update-admin-group";
import type { AdminGroup } from "../_data-access/get-overview";
import { GroupDetailsFields } from "./group-details-fields";
import { DeleteGroupButton } from "./delete-group-button";
import { GroupRounds } from "./group-rounds";

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "nenhuma ainda";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function toFormValues(group: AdminGroup): GroupDetailsInput {
  return {
    groupName: group.name,
    slug: group.slug ?? "",
    city: group.city ?? "",
    state: (group.state ?? "") as GroupDetailsInput["state"],
    playWeekday: group.playWeekday === null ? "" : String(group.playWeekday),
    playTime: group.playTime ?? "",
    venue: group.venue ?? "",
    usualPlayers: group.usualPlayers === null ? "" : String(group.usualPlayers),
    weeklyRoundLimit: group.weeklyRoundLimit === null ? "" : String(group.weeklyRoundLimit),
    packMinPlayers: String(group.packMinPlayers),
    ownerContact: group.ownerContact,
    adminNotes: group.adminNotes,
  };
}

/** Uma pelada no painel: números, plano, suspender/reativar e o cadastro completo para editar. */
export function GroupCard({ group }: { group: AdminGroup }) {
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<GroupDetailsInput>({ resolver: zodResolver(groupDetailsSchema), defaultValues: toFormValues(group) });

  function handleToggleSuspended() {
    setMessage(null);
    startTransition(async () => {
      const result = await setGroupSuspended(group.id, !group.isSuspended);
      if (!result.success) setMessage(result.message);
    });
  }

  function handleSave(data: GroupDetailsInput) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateAdminGroup({ ...data, groupId: group.id });
      if (result.success) {
        setIsEditing(false);
        return;
      }
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const text = messages?.[0];
        if (text && name !== "groupId") form.setError(name as keyof GroupDetailsInput, { message: text });
      }
      setMessage(result.message);
    });
  }

  const where = [group.city, group.state].filter(Boolean).join("/");
  const when =
    group.playWeekday === null ? null : `${WEEKDAY_LABELS[group.playWeekday]}${group.playTime ? ` · ${group.playTime}` : ""}`;

  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{group.name}</h3>
          <p className="text-sm text-muted-foreground">
            {[where, when, group.venue].filter(Boolean).join(" · ") || "Sem cidade nem dia cadastrados"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
            group.isSuspended ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary",
          )}
        >
          {group.isSuspended ? "Suspensa" : "Ativa"}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-background/60 p-2">
          <dt className="text-xs text-muted-foreground">Jogadores</dt>
          <dd className="font-display text-xl font-bold tabular-nums">{group.activePlayers}</dd>
        </div>
        <div className="rounded-lg bg-background/60 p-2">
          <dt className="text-xs text-muted-foreground">Rodadas</dt>
          <dd className="font-display text-xl font-bold tabular-nums">{group.roundCount}</dd>
        </div>
        <div className="rounded-lg bg-background/60 p-2">
          <dt className="text-xs text-muted-foreground">Plano</dt>
          <dd className="font-display text-xl font-bold">
            {group.weeklyRoundLimit ? `${group.weeklyRoundLimit}/sem` : "Livre"}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Última rodada: {formatDate(group.lastRoundOn)} · código:{" "}
        <span className="font-mono">{group.slug ?? "sem código"}</span> · pacotes:{" "}
        <span>mín. {group.packMinPlayers} na rodada</span>
      </p>
      {(group.ownerContact || group.adminNotes) && (
        <p className="text-sm text-muted-foreground">
          {[group.ownerContact, group.adminNotes].filter(Boolean).join(" · ")}
        </p>
      )}

      {!isEditing && <GroupRounds rounds={group.rounds} />}

      {isEditing ? (
        <form onSubmit={form.handleSubmit(handleSave)} noValidate>
          <FieldGroup>
            <GroupDetailsFields control={form.control} idPrefix={`edit-${group.id}`} />
            {message && <FieldError>{message}</FieldError>}
            <div className="flex gap-2">
              <Button type="submit" size="lg" disabled={isPending} className="flex-1">
                {isPending ? "Salvando…" : "Salvar"}
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => { form.reset(toFormValues(group)); setMessage(null); setIsEditing(false); }}>
                Cancelar
              </Button>
            </div>
          </FieldGroup>
        </form>
      ) : (
        <>
          {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => setIsEditing(true)} className="flex-1">
              Editar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isPending}
              onClick={handleToggleSuspended}
              className={cn("flex-1", !group.isSuspended && "text-amber-400 hover:text-amber-400")}
            >
              {group.isSuspended ? "Reativar" : "Suspender"}
            </Button>
          </div>
          <DeleteGroupButton group={group} />
        </>
      )}
    </article>
  );
}
