"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { POSITION_LABELS } from "@/types/player";
import { PLAYER_POSITION_CODES, type MemberProfileInput } from "@/types/member-schema";

const POSITION_HINTS: Record<(typeof PLAYER_POSITION_CODES)[number], string> = {
  FIX: "Defesa, último homem",
  ALA: "Pelos lados, ataque e volta",
  PIV: "Referência no ataque",
  GOL: "Carta e notas de goleiro",
};

type MemberProfileFieldsProps<Values extends FieldValues & MemberProfileInput> = {
  control: Control<Values>;
  /** Prefixo dos ids, para não repetir ids com dois formulários na mesma tela. */
  idPrefix: string;
};

/** Nome, apelido e posição: o que todo jogador informa ao entrar numa pelada. */
export function MemberProfileFields<Values extends FieldValues & MemberProfileInput>({
  control,
  idPrefix,
}: MemberProfileFieldsProps<Values>) {
  return (
    <>
      <Controller
        name={"fullName" as Path<Values>}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-full-name`}>Seu nome</FieldLabel>
            <Input
              {...field}
              id={`${idPrefix}-full-name`}
              autoComplete="name"
              placeholder="Thiago Costa"
              aria-invalid={fieldState.invalid}
              className="h-11 text-base"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name={"nickname" as Path<Values>}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${idPrefix}-nickname`}>Apelido</FieldLabel>
            <Input
              {...field}
              id={`${idPrefix}-nickname`}
              autoComplete="nickname"
              maxLength={12}
              placeholder="Tico"
              aria-invalid={fieldState.invalid}
              className="h-11 text-base"
            />
            <FieldDescription>É o nome que aparece na sua carta.</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name={"position" as Path<Values>}
        control={control}
        render={({ field, fieldState }) => (
          <FieldSet data-invalid={fieldState.invalid}>
            <FieldLegend variant="label">Posição</FieldLegend>
            <RadioGroup
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              aria-invalid={fieldState.invalid}
              className="grid-cols-2"
            >
              {PLAYER_POSITION_CODES.map((code) => (
                <FieldLabel key={code} htmlFor={`${idPrefix}-position-${code}`}>
                  <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <FieldTitle>{POSITION_LABELS[code]}</FieldTitle>
                      <span className="text-xs text-muted-foreground">{POSITION_HINTS[code]}</span>
                    </div>
                    <RadioGroupItem
                      value={code}
                      id={`${idPrefix}-position-${code}`}
                      aria-invalid={fieldState.invalid}
                    />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </FieldSet>
        )}
      />
    </>
  );
}
