"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { MailCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sendMagicLink } from "../_actions/send-magic-link";
import { signInSchema, type SignInInput } from "../_schemas/sign-in-schema";

type SignInFormProps = {
  /** Para onde voltar depois do login (ex.: um convite). */
  next?: string;
};

export function SignInForm({ next }: SignInFormProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "" },
  });

  function handleSubmit(data: SignInInput) {
    startTransition(async () => {
      const result = await sendMagicLink(data, next);
      if (result.success) {
        setSentTo(result.email);
        return;
      }
      form.setError("email", { message: result.errors?.email?.[0] ?? result.message });
    });
  }

  if (sentTo) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <MailCheckIcon aria-hidden className="size-10 text-primary" />
        <p className="font-medium">Link enviado para {sentTo}</p>
        <p className="text-sm text-muted-foreground">
          Abra o e-mail no celular e toque no link para entrar. Pode fechar esta tela.
        </p>
        <Button variant="ghost" onClick={() => setSentTo(null)}>
          Usar outro e-mail
        </Button>
      </div>
    );
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
        <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full text-base">
          {isPending ? "Enviando…" : "Receber link de acesso"}
        </Button>
      </FieldGroup>
    </form>
  );
}
