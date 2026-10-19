"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ownProfileSchema, type OwnProfileInput } from "@/types/member-schema";
import { updateOwnProfile } from "../_actions/update-own-profile";

type OwnProfileCardProps = {
  fullName: string;
  nickname: string;
};

/** Todo jogador edita o próprio nome e apelido (o resto do cadastro é com o dono). */
export function OwnProfileCard({ fullName, nickname }: OwnProfileCardProps) {
  const [status, setStatus] = useState<{ kind: "saved" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<OwnProfileInput>({
    resolver: zodResolver(ownProfileSchema),
    defaultValues: { fullName, nickname },
  });

  function handleSubmit(data: OwnProfileInput) {
    setStatus(null);
    startTransition(async () => {
      const result = await updateOwnProfile(data);
      if (result.success) {
        form.reset(data);
        setStatus({ kind: "saved", message: "Salvo!" });
        return;
      }
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof OwnProfileInput, { message });
      }
      setStatus({ kind: "error", message: result.message });
    });
  }

  return (
    <section aria-labelledby="own-profile-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 id="own-profile-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Seu perfil
        </h2>
        <p className="text-sm text-muted-foreground">Posição e usuário de login, só com o dono da pelada.</p>
      </div>
      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
        <FieldGroup>
          <Controller
            name="fullName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="own-profile-full-name">Seu nome</FieldLabel>
                <Input
                  {...field}
                  id="own-profile-full-name"
                  autoComplete="name"
                  aria-invalid={fieldState.invalid}
                  className="h-11 text-base"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="nickname"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="own-profile-nickname">Apelido</FieldLabel>
                <Input
                  {...field}
                  id="own-profile-nickname"
                  autoComplete="nickname"
                  maxLength={12}
                  aria-invalid={fieldState.invalid}
                  className="h-11 text-base"
                />
                <FieldDescription>É o nome que aparece na sua carta.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          {status && (
            <p role="status" className={status.kind === "saved" ? "text-sm text-success" : "text-sm text-destructive"}>
              {status.message}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            variant="secondary"
            disabled={isPending || !form.formState.isDirty}
            className="h-11 w-full text-base"
          >
            {isPending ? "Salvando…" : "Salvar perfil"}
          </Button>
        </FieldGroup>
      </form>
    </section>
  );
}
