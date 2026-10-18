"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "../_actions/sign-in";
import { signInSchema, type SignInInput } from "../_schemas/sign-in-schema";

type SignInFormProps = {
  /** Para onde voltar depois do login. */
  next?: string;
};

export function SignInForm({ next }: SignInFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function handleSubmit(data: SignInInput) {
    setFormError(null);
    startTransition(async () => {
      // Em caso de sucesso a action redireciona; só volta aqui com erro.
      const result = await signIn(data, next);
      setFormError(result.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-in-email">E-mail</FieldLabel>
              <Input
                {...field}
                id="sign-in-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="voce@email.com"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-in-password">Senha</FieldLabel>
              <Input
                {...field}
                id="sign-in-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {formError && <FieldError>{formError}</FieldError>}
        <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full text-base">
          {isPending ? "Entrando…" : "Entrar"}
        </Button>
      </FieldGroup>
    </form>
  );
}
