"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { MemberProfileFields } from "@/components/member-profile-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createGroupSchema, type CreateGroupInput } from "@/types/member-schema";
import { createGroup } from "../_actions/create-group";

type CreateGroupFormProps = {
  defaultFullName: string;
};

export function CreateGroupForm({ defaultFullName }: CreateGroupFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { groupName: "", fullName: defaultFullName, nickname: "", password: "" },
  });

  function handleSubmit(data: CreateGroupInput) {
    setFormError(null);
    startTransition(async () => {
      // Em caso de sucesso a action redireciona; só volta aqui com erro.
      const result = await createGroup(data);
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof CreateGroupInput, { message });
      }
      setFormError(result.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="groupName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="create-group-name">Nome da pelada</FieldLabel>
              <Input
                {...field}
                id="create-group-name"
                placeholder="Pelada de Sábado"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <MemberProfileFields control={form.control} idPrefix="create-group" />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="create-group-password">Sua senha</FieldLabel>
              <Input
                {...field}
                id="create-group-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base"
              />
              <FieldDescription>Para entrar de outros aparelhos. Mínimo de 8 caracteres.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {formError && <FieldError>{formError}</FieldError>}
        <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full text-base">
          {isPending ? "Criando…" : "Criar pelada"}
        </Button>
      </FieldGroup>
    </form>
  );
}
