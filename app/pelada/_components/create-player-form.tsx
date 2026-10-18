"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { CheckIcon, CopyIcon, UserPlusIcon } from "lucide-react";
import { MemberProfileFields } from "@/components/member-profile-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createPlayerSchema, type CreatePlayerInput } from "@/types/member-schema";
import { createPlayer } from "../_actions/create-player";

const COPIED_FEEDBACK_MS = 2000;

type CreatedPlayer = { email: string; nickname: string; tempPassword: string };

type CreatePlayerFormProps = {
  /** Link da tela de login, para a mensagem do WhatsApp. */
  loginUrl: string;
};

/** Organizador cadastra o jogador e repassa o acesso com senha provisória. */
export function CreatePlayerForm({ loginUrl }: CreatePlayerFormProps) {
  const [created, setCreated] = useState<CreatedPlayer | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreatePlayerInput>({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: { fullName: "", nickname: "", email: "" },
  });

  function handleSubmit(data: CreatePlayerInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await createPlayer(data);
      if (result.success) {
        setCreated(result);
        form.reset({ fullName: "", nickname: "", email: "" });
        return;
      }
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof CreatePlayerInput, { message });
      }
      setFormError(result.message);
    });
  }

  async function handleCopyMessage(player: CreatedPlayer) {
    const message = [
      `Fala, ${player.nickname}! Seu acesso ao PeladApp:`,
      loginUrl,
      `E-mail: ${player.email}`,
      `Senha provisória: ${player.tempPassword}`,
      "No primeiro acesso você escolhe sua senha.",
    ].join("\n");
    await navigator.clipboard.writeText(message);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  }

  return (
    <section aria-labelledby="create-player-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 id="create-player-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Cadastrar jogador
        </h2>
        <p className="text-sm text-muted-foreground">
          A conta é criada com uma senha provisória. No primeiro acesso, o jogador escolhe a dele.
        </p>
      </div>

      {created ? (
        <div role="status" className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="font-medium">{created.nickname} cadastrado!</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="truncate">{created.email}</dd>
            <dt className="text-muted-foreground">Senha provisória</dt>
            <dd className="font-mono font-medium select-all">{created.tempPassword}</dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            Anote ou mande agora: a senha provisória não aparece de novo.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={() => handleCopyMessage(created)} className="flex-1">
              {isCopied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
              {isCopied ? "Mensagem copiada" : "Copiar mensagem para o WhatsApp"}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setCreated(null)}>
              <UserPlusIcon aria-hidden />
              Cadastrar outro
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <FieldGroup>
            <MemberProfileFields control={form.control} idPrefix="create-player" />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-player-email">E-mail do jogador</FieldLabel>
                  <Input
                    {...field}
                    id="create-player-email"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    placeholder="jogador@email.com"
                    aria-invalid={fieldState.invalid}
                    className="h-11 text-base"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {formError && <FieldError>{formError}</FieldError>}
            <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full text-base">
              {isPending ? "Cadastrando…" : "Cadastrar jogador"}
            </Button>
          </FieldGroup>
        </form>
      )}
    </section>
  );
}
