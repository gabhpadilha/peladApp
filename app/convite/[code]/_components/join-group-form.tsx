"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MemberProfileFields } from "@/components/member-profile-fields";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { joinGroupSchema, type JoinGroupInput } from "@/types/member-schema";
import { joinGroup } from "../_actions/join-group";

type JoinGroupFormProps = {
  inviteCode: string;
  defaultFullName: string;
};

export function JoinGroupForm({ inviteCode, defaultFullName }: JoinGroupFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<JoinGroupInput>({
    resolver: zodResolver(joinGroupSchema),
    defaultValues: { inviteCode, fullName: defaultFullName, nickname: "" },
  });

  function handleSubmit(data: JoinGroupInput) {
    setFormError(null);
    startTransition(async () => {
      // Em caso de sucesso a action redireciona; só volta aqui com erro.
      const result = await joinGroup(data);
      for (const [name, messages] of Object.entries(result.errors ?? {})) {
        const message = messages?.[0];
        if (message) form.setError(name as keyof JoinGroupInput, { message });
      }
      setFormError(result.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <FieldGroup>
        <MemberProfileFields control={form.control} idPrefix="join-group" />
        {formError && <FieldError>{formError}</FieldError>}
        <Button type="submit" size="lg" disabled={isPending} className="h-11 w-full text-base">
          {isPending ? "Entrando…" : "Entrar na pelada"}
        </Button>
      </FieldGroup>
    </form>
  );
}
