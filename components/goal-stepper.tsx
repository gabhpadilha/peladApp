"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { GOALS_MAX } from "@/lib/goal-rules";
import { cn } from "@/lib/utils";

type GoalStepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** `lg`: a tela de gols da votação; `sm`: as listas (organizador, correção). */
  size?: "lg" | "sm";
  label: string;
};

/** Seletor de gols de 0 a 15: − número +, na zona do polegar. */
export function GoalStepper({ value, onChange, size = "lg", label }: GoalStepperProps) {
  const isLarge = size === "lg";
  const button = cn(
    "flex items-center justify-center rounded-full border transition-colors disabled:opacity-30",
    isLarge ? "size-16" : "size-11",
  );
  return (
    <div role="group" aria-label={label} className={cn("flex items-center", isLarge ? "gap-6" : "gap-3")}>
      <button type="button" aria-label="Menos um gol" className={cn(button, "text-muted-foreground")} disabled={value <= 0} onClick={() => onChange(value - 1)}>
        <MinusIcon className={isLarge ? "size-7" : "size-4"} />
      </button>
      <output aria-live="polite" className={cn("text-center font-display leading-none font-extrabold tabular-nums", isLarge ? "w-24 text-8xl" : "w-8 text-3xl")}>
        {value}
      </output>
      <button type="button" aria-label="Mais um gol" className={cn(button, "border-primary text-primary")} disabled={value >= GOALS_MAX} onClick={() => onChange(value + 1)}>
        <PlusIcon className={isLarge ? "size-7" : "size-4"} />
      </button>
    </div>
  );
}
