"use client";

import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { PlusIcon } from "lucide-react";
import { AccessCard } from "@/app/elenco/_components/access-card";
import { MemberProfileFields } from "@/components/member-profile-fields";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FREE_WEEKLY_ROUND_LIMIT } from "@/lib/platform";
import { suggestUsername } from "@/lib/username";
import { createAdminGroupSchema, type CreateAdminGroupInput } from "@/types/group-schema";
import { createAdminGroup } from "../_actions/create-admin-group";
import { GroupDetailsFields } from "./group-details-fields";

type CreatedGroup = { groupName: string; nickname: string; username: string; tempPassword: string };

const EMPTY: Omit<CreateAdminGroupInput, "position" | "state"> = {
  groupName: "", slug: "", city: "", playWeekday: "", playTime: "20:00", venue: "", usualPlayers: "",
  weeklyRoundLimit: String(FREE_WEEKLY_ROUND_LIMIT), ownerContact: "", adminNotes: "",
  fullName: "", nickname: "", ownerUsername: "",
};

/** Nova pelada com a conta do dono; o acesso aparece uma vez, com a mensagem do WhatsApp. */
export function CreateGroupForm({ loginUrl, canCreate }: { loginUrl: string; canCreate: boolean }) {
  const [created, setCreated] = useState<CreatedGroup | null>(null);
  const [isUsernameEdited, setIsUsernameEdited] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateAdminGroupInput>({
    resolver: zodResolver(createAdminGroupSchema),
    defaultValues: { ...EMPTY, state: undefined, position: undefined },
  });
  const nickname = useWatch({ control: form.control, name: "nickname" });
  const slug = useWatch({ control: form.control, name: "slug" });
  const ownerUsername = useWatch({ control: form.control, name: "ownerUsername" });

  // Enquanto o usuário do dono não for editado, ele acompanha o apelido.
  useEffect(() => {
    if (!isUsernameEdited) form.setValue("ownerUsername", suggestUsername(nickname ?? "").slice(0, 14));
  }, [nickname, isUsernameEdited, form]);

  function handleSubmit(data: CreateAdminGroupInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await createAdminGroup(data);
      if (result.success) {
        setCreated(result);
        setIsUsernameEdited(false);
        form.reset({ ...EMPTY, state: undefined, position: undefined });
        return;
      }
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof CreateAdminGroupInput, { message });
      }
      setFormError(result.message);
    });
  }

  return (
    <section aria-labelledby="create-group-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <h2 id="create-group-title" className="font-display text-lg font-bold tracking-wide uppercase">Nova pelada</h2>

      {created ? (
        <AccessCard
          title={`${created.groupName} criada!`}
          nickname={created.nickname}
          login={created.username}
          tempPassword={created.tempPassword}
          loginUrl={loginUrl}
        >
          <Button size="lg" variant="secondary" onClick={() => setCreated(null)}>
            <PlusIcon aria-hidden />
            Criar outra
          </Button>
        </AccessCard>
      ) : !canCreate ? (
        <p className="text-sm text-muted-foreground">O limite de peladas ativas foi atingido. Suspenda uma para criar outra.</p>
      ) : (
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <FieldGroup>
            <GroupDetailsFields control={form.control} idPrefix="new-group" />
            <p className="font-display text-sm font-bold tracking-wide text-primary uppercase">Dono da pelada</p>
            <MemberProfileFields control={form.control} idPrefix="new-group-owner" nameLabel="Nome do dono" />
            <Controller
              name="ownerUsername"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-group-username">Usuário do dono</FieldLabel>
                  <Input
                    {...field}
                    onChange={(event) => {
                      setIsUsernameEdited(true);
                      field.onChange(event.target.value.toLowerCase());
                    }}
                    id="new-group-username"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={14}
                    aria-invalid={fieldState.invalid}
                    className="h-11 font-mono text-base"
                  />
                  <FieldDescription>
                    Ele entra como <span className="font-mono">{ownerUsername || "usuario"}.{slug || "codigo"}</span>.
                  </FieldDescription>
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
      )}
    </section>
  );
}
