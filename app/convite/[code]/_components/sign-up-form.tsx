"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { MemberProfileFields } from "@/components/member-profile-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signUpSchema, type SignUpInput } from "@/types/member-schema";
import { signUp } from "../_actions/sign-up";

type SignUpFormProps = {
  inviteCode: string;
};

/** Cadastro único: dados de jogador + e-mail e senha. */
export function SignUpForm({ inviteCode }: SignUpFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { inviteCode, fullName: "", nickname: "", email: "", password: "" },
  });

  function handleSubmit(data: SignUpInput) {
    setFormError(null);
    setIsExistingAccount(false);
    startTransition(async () => {
      // Em caso de sucesso a action redireciona; só volta aqui com erro.
      const result = await signUp(data);
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof SignUpInput, { message });
      }
      setIsExistingAccount(result.isExistingAccount ?? false);
      setFormError(result.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <FieldGroup>
        <MemberProfileFields control={form.control} idPrefix="sign-up" />

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-up-email">E-mail</FieldLabel>
              <Input
                {...field}
                id="sign-up-email"
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
              <FieldLabel htmlFor="sign-up-password">Senha</FieldLabel>
              <Input
                {...field}
                id="sign-up-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                className="h-11 text-base"
              />
              <FieldDescription>Mínimo de 8 caracteres. Você só cadastra uma vez.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {formError && (
          <FieldError>
            {formError}{" "}
            {isExistingAccount && (
              <Link href={`/entrar?next=/convite/${inviteCode}`} className="underline">
                Entrar
              </Link>
            )}
          </FieldError>
        )}
        <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full text-base">
          {isPending ? "Criando conta…" : "Criar conta e entrar"}
        </Button>
      </FieldGroup>
    </form>
  );
}
