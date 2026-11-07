"use client";

import type { ReactNode } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BRAZIL_STATES, WEEKDAY_LABELS } from "@/lib/platform";
import type { GroupDetailsInput } from "@/types/group-schema";

type GroupDetailsFieldsProps<Values extends FieldValues & GroupDetailsInput> = {
  control: Control<Values>;
  /** Prefixo dos ids, para não repetir ids com vários formulários na mesma tela. */
  idPrefix: string;
};

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

type TextFieldProps<Values extends FieldValues> = {
  control: Control<Values>;
  name: keyof GroupDetailsInput;
  id: string;
  label: string;
  hint?: ReactNode;
  placeholder?: string;
  mono?: boolean;
  maxLength?: number;
  inputMode?: "numeric" | "text";
  type?: "text" | "time";
  lower?: boolean;
};

function TextField<Values extends FieldValues>({ control, name, id, label, hint, placeholder, mono, maxLength, inputMode, type = "text", lower }: TextFieldProps<Values>) {
  return (
    <Controller
      name={name as Path<Values>}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            onChange={(event) => field.onChange(lower ? event.target.value.toLowerCase() : event.target.value)}
            id={id}
            type={type}
            inputMode={inputMode}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            className={`h-11 text-base ${mono ? "font-mono" : ""}`}
          />
          {hint && <FieldDescription>{hint}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

/** Cadastro da pelada (nome, código, cidade, dia e horário, local, plano) e as anotações só do admin. */
export function GroupDetailsFields<Values extends FieldValues & GroupDetailsInput>({ control, idPrefix }: GroupDetailsFieldsProps<Values>) {
  const text = { control, idPrefix } as const;
  return (
    <>
      <TextField {...text} name="groupName" id={`${idPrefix}-name`} label="Nome da pelada" placeholder="Racha do Bairro" maxLength={60} hint="Não pode repetir o nome de outra pelada." />
      <TextField {...text} name="slug" id={`${idPrefix}-slug`} label="Código curto (3 a 6 letras)" placeholder="bairro" mono maxLength={6} lower hint="Vira o sufixo dos usuários novos: joao.bairro. Vazio = sem sufixo (pelada antiga)." />
      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
        <TextField {...text} name="city" id={`${idPrefix}-city`} label="Cidade" placeholder="Curitiba" maxLength={60} />
        <Controller
          name={"state" as Path<Values>}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-state`}>UF</FieldLabel>
              <select {...field} id={`${idPrefix}-state`} aria-invalid={fieldState.invalid} className={SELECT_CLASS}>
                <option value="">–</option>
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name={"playWeekday" as Path<Values>}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-weekday`}>Dia do jogo</FieldLabel>
              <select {...field} id={`${idPrefix}-weekday`} aria-invalid={fieldState.invalid} className={SELECT_CLASS}>
                <option value="">Qualquer dia</option>
                {WEEKDAY_LABELS.map((label, index) => (
                  <option key={label} value={String(index)}>{label}</option>
                ))}
              </select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <TextField {...text} name="playTime" id={`${idPrefix}-time`} label="Horário (opcional)" type="time" />
      </div>
      <TextField {...text} name="venue" id={`${idPrefix}-venue`} label="Local ou quadra (opcional)" placeholder="Quadra do Clube" maxLength={80} />
      <div className="grid grid-cols-2 gap-3">
        <TextField {...text} name="usualPlayers" id={`${idPrefix}-players`} label="Jogadores por jogo" placeholder="10" inputMode="numeric" maxLength={2} hint="Opcional." />
        <TextField {...text} name="weeklyRoundLimit" id={`${idPrefix}-limit`} label="Rodadas por semana" placeholder="1" inputMode="numeric" maxLength={1} hint="Plano. Vazio = sem limite." />
      </div>
      <Controller
        name={"packsEnabled" as Path<Values>}
        control={control}
        render={({ field }) => (
          <Field>
            <label className="flex min-h-11 items-center gap-3 text-base" htmlFor={`${idPrefix}-packs`}>
              <input
                id={`${idPrefix}-packs`}
                type="checkbox"
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
                className="size-5 accent-primary"
              />
              Pacotes de skins ligados
            </label>
            <FieldDescription>Ao fechar a rodada, quem jogou ganha um pacote. Desligado = nada muda.</FieldDescription>
          </Field>
        )}
      />
      <TextField {...text} name="packMinPlayers" id={`${idPrefix}-packmin`} label="Mínimo de jogadores para gerar pacotes" placeholder="10" inputMode="numeric" maxLength={2} hint="Rodada com menos presentes não gera pacote." />
      <TextField {...text} name="ownerContact" id={`${idPrefix}-contact`} label="Contato do dono (só você vê)" placeholder="(41) 99999-0000" maxLength={40} />
      <TextField {...text} name="adminNotes" id={`${idPrefix}-notes`} label="Observações (só você vê)" maxLength={1000} />
    </>
  );
}
