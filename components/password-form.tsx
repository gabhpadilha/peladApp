"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { CheckCircle2Icon } from "lucide-react";
import { setPassword } from "@/app/_actions/set-password";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { setPasswordSchema, type SetPasswordInput } from "@/types/member-schema";

/** Tempo para ler o aviso de sucesso antes de ir para o login. */
const LOGIN_REDIRECT_DELAY_MS = 1800;
const LOGIN_PATH_AFTER_PASSWORD = "/entrar?senha=criada";

type PasswordFormProps = {
  email: string;
  /**
   * `stay`: continua logado na mesma tela (trocar senha na página da pelada).
   * `login`: encerra a sessão e leva para a tela de login (troca obrigatória do 1º acesso).
   */
  afterSave?: "stay" | "login";
  submitLabel?: string;
};

/** Definir ou trocar a senha da conta logada. */
export function PasswordForm({ email, afterSave = "stay", submitLabel = "Salvar senha" }: PasswordFormProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmation: "" },
  });
  const isLeaving = isSaved && afterSave === "login";

  useEffect(() => {
    if (!isLeaving) return;
    const timeout = setTimeout(() => router.replace(LOGIN_PATH_AFTER_PASSWORD), LOGIN_REDIRECT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [isLeaving, router]);

  function handleSubmit(data: SetPasswordInput) {
    setFormError(null);
    setIsSaved(false);
    startTransition(async () => {
      const result = await setPassword(data, { signOutAfter: afterSave === "login" });
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
            {afterSave === "login"
              ? "Senha criada com sucesso! Levando você para o login…"
              : "Senha salva. Use ela na tela de login."}
          </p>
        )}
        {/* Ajuda o gerenciador de senhas do navegador a salvar com o e-mail certo. */}
        <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
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
                disabled={isLeaving}
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
                disabled={isLeaving}
                aria-invalid={fieldState.invalid}
                className="h-11 text-base"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {formError && <FieldError>{formError}</FieldError>}
        <Button type="submit" size="lg" disabled={isPending || isLeaving} className="h-11 w-full text-base">
          {isPending ? "Salvando…" : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
