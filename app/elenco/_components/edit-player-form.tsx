"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { MemberProfileFields } from "@/components/member-profile-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { USERNAME_RULE } from "@/lib/username";
import { editPlayerSchema, type EditPlayerInput } from "@/types/member-schema";
import { editPlayer } from "../_actions/edit-player";
import type { GroupMemberSummary } from "../_data-access/get-roster";

type EditPlayerFormProps = {
  member: GroupMemberSummary;
  /** Fecha o formulário (salvou ou cancelou). */
  onDone: () => void;
};

/** Organizador corrige nome, apelido, posição e usuário de um jogador. */
export function EditPlayerForm({ member, onDone }: EditPlayerFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasUsername = member.username !== null;
  const idPrefix = `edit-${member.id}`;
  const form = useForm<EditPlayerInput>({
    resolver: zodResolver(editPlayerSchema),
    defaultValues: {
      fullName: member.fullName,
      nickname: member.nickname,
      position: member.position,
      username: member.username ?? "",
    },
  });

  function handleSubmit(data: EditPlayerInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await editPlayer(member.id, data);
      if (result.success) {
        onDone();
        return;
      }
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof EditPlayerInput, { message });
      }
      setFormError(result.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate aria-label={`Editar ${member.nickname}`}>
      <FieldGroup>
        <MemberProfileFields control={form.control} idPrefix={idPrefix} nameLabel="Nome" />
        {hasUsername && (
          <Controller
            name="username"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${idPrefix}-username`}>Usuário para entrar no app</FieldLabel>
                <Input
                  {...field}
                  onChange={(event) => field.onChange(event.target.value.toLowerCase())}
                  id={`${idPrefix}-username`}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={20}
                  aria-invalid={fieldState.invalid}
                  className="h-11 font-mono text-base"
                />
                <FieldDescription>
                  {USERNAME_RULE} Se trocar, avise o jogador: a senha continua a mesma.
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
        {formError && <FieldError>{formError}</FieldError>}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="lg" className="h-11 flex-1 text-base" onClick={onDone} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" className="h-11 flex-1 text-base" disabled={isPending}>
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
