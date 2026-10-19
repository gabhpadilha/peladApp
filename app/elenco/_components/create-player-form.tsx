"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { UserPlusIcon } from "lucide-react";
import { MemberProfileFields } from "@/components/member-profile-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { suggestUsername, USERNAME_RULE } from "@/lib/username";
import { createPlayerSchema, type CreatePlayerInput } from "@/types/member-schema";
import { createPlayer } from "../_actions/create-player";
import { AccessCard } from "./access-card";

type CreatedPlayer = { username: string; nickname: string; tempPassword: string };

type CreatePlayerFormProps = {
  /** Link da tela de login, para a mensagem do WhatsApp. */
  loginUrl: string;
};

const EMPTY_FORM: CreatePlayerInput = { fullName: "", nickname: "", username: "", position: "ALA" };

/**
 * Organizador cadastra o jogador por usuário (sem e-mail) e repassa o acesso
 * com senha provisória. O usuário é sugerido a partir do apelido.
 */
export function CreatePlayerForm({ loginUrl }: CreatePlayerFormProps) {
  const [created, setCreated] = useState<CreatedPlayer | null>(null);
  const [isUsernameEdited, setIsUsernameEdited] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreatePlayerInput>({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: { ...EMPTY_FORM, position: undefined },
  });
  const nickname = useWatch({ control: form.control, name: "nickname" });

  // Enquanto o organizador não mexer no usuário, ele acompanha o apelido.
  useEffect(() => {
    if (!isUsernameEdited) form.setValue("username", suggestUsername(nickname ?? ""));
  }, [nickname, isUsernameEdited, form]);

  function handleSubmit(data: CreatePlayerInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await createPlayer(data);
      if (result.success) {
        setCreated(result);
        setIsUsernameEdited(false);
        form.reset({ ...EMPTY_FORM, position: undefined });
        return;
      }
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof CreatePlayerInput, { message });
      }
      setFormError(result.message);
    });
  }

  return (
    <section aria-labelledby="create-player-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div>
        <h2 id="create-player-title" className="font-display text-lg font-bold tracking-wide uppercase">
          Cadastrar jogador
        </h2>
        <p className="text-sm text-muted-foreground">
          Sem e-mail: o jogador entra com usuário e uma senha provisória, e escolhe a dele no primeiro acesso.
        </p>
      </div>

      {created ? (
        <AccessCard
          title={`${created.nickname} cadastrado!`}
          nickname={created.nickname}
          login={created.username}
          tempPassword={created.tempPassword}
          loginUrl={loginUrl}
        >
          <Button size="lg" variant="secondary" onClick={() => setCreated(null)}>
            <UserPlusIcon aria-hidden />
            Cadastrar outro
          </Button>
        </AccessCard>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <FieldGroup>
            <MemberProfileFields control={form.control} idPrefix="create-player" />
            <Controller
              name="username"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-player-username">Usuário para entrar no app</FieldLabel>
                  <Input
                    {...field}
                    onChange={(event) => {
                      setIsUsernameEdited(true);
                      field.onChange(event.target.value.toLowerCase());
                    }}
                    id="create-player-username"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={20}
                    placeholder="magrao"
                    aria-invalid={fieldState.invalid}
                    className="h-11 font-mono text-base"
                  />
                  <FieldDescription>{USERNAME_RULE}</FieldDescription>
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
