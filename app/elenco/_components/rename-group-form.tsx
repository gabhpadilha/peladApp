"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { PencilIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { renameGroup } from "../_actions/rename-group";

const formSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome para a pelada.").max(60, "Use no máximo 60 caracteres."),
});
type FormValues = z.infer<typeof formSchema>;

/** Nome da pelada com "Renomear". O nome não pode repetir o de outra pelada (a regra é do banco). */
export function RenameGroupForm({ groupName }: { groupName: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentName, setCurrentName] = useState(groupName);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: groupName } });

  function handleSubmit(values: FormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await renameGroup(values);
      if (result.success) {
        setCurrentName(result.name);
        setIsEditing(false);
        return;
      }
      setFormError(result.message);
    });
  }

  return (
    <section aria-labelledby="rename-group-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="rename-group-title" className="font-display text-lg font-bold tracking-wide uppercase">Nome da pelada</h2>
          {!isEditing && <p className="truncate text-base">{currentName}</p>}
        </div>
        {!isEditing && (
          <Button type="button" variant="outline" size="lg" onClick={() => { form.reset({ name: currentName }); setIsEditing(true); }}>
            <PencilIcon aria-hidden />
            Renomear
          </Button>
        )}
      </div>
      {isEditing && (
        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="flex flex-col gap-3">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || formError !== null}>
                <FieldLabel htmlFor="rename-group-name">Novo nome</FieldLabel>
                <Input {...field} id="rename-group-name" maxLength={60} autoComplete="off" aria-invalid={fieldState.invalid} className="h-11 text-base" />
                <FieldDescription>Não pode ser igual ao nome de outra pelada (a comparação ignora maiúsculas, acentos e pontuação).</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          {formError && <FieldError>{formError}</FieldError>}
          <div className="flex gap-2">
            <Button type="submit" size="lg" disabled={isPending} className="flex-1">{isPending ? "Salvando…" : "Salvar"}</Button>
            <Button type="button" size="lg" variant="outline" onClick={() => { setIsEditing(false); setFormError(null); }}>Cancelar</Button>
          </div>
        </form>
      )}
    </section>
  );
}
