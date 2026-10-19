"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { CheckCircle2Icon } from "lucide-react";
import { setPassword } from "@/app/_actions/set-password";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { setPasswordSchema, type SetPasswordInput } from "@/types/member-schema";

type PasswordFormProps = {
  /** Usuário (ou e-mail) da conta, para o gerenciador de senhas do navegador. */
  email: string;
  submitLabel?: string;
};

/** Trocar a senha da conta logada (continua logado). */
export function PasswordForm({ email, submitLabel = "Salvar senha" }: PasswordFormProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmation: "" },
  });

  function handleSubmit(data: SetPasswordInput) {
    setFormError(null);
    setIsSaved(false);
    startTransition(async () => {
      const result = await setPassword(data);
      if (result.success) {
        setIsSaved(true);
        form.reset();
        return;
      }
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof SetPasswordInput, { message });
      }
      setFormError(result.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <FieldGroup>
        {isSaved && (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
            <CheckCircle2Icon aria-hidden className="size-4 shrink-0 text-primary" />
            Senha salva. Use ela na tela de login.
          </p>
        )}
        {/* Ajuda o gerenciador de senhas do navegador a salvar com o usuário certo. */}
        <input type="text" name="username" value={email} autoComplete="username" readOnly hidden />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
              <Input
                {...field}
                id="new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base"
              />
              <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="confirmation"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="new-password-confirmation">Repita a senha</FieldLabel>
              <Input
                {...field}
                id="new-password-confirmation"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {formError && <FieldError>{formError}</FieldError>}
        <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full text-base">
          {isPending ? "Salvando…" : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
