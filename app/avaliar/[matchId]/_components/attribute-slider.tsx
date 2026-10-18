"use client";

import { Slider } from "@/components/ui/slider";
import { SCORE_MAX, SCORE_MIN } from "@/lib/ovr";
import { cn } from "@/lib/utils";

/** Valor em que o polegar fica parado antes do primeiro toque. */
const UNTOUCHED_POSITION = Math.round((SCORE_MIN + SCORE_MAX) / 2);
const HAPTIC_MS = 8;

type AttributeSliderProps = {
  id: string;
  abbreviation: string;
  name: string;
  /** `null` = ainda não tocado (mostra "—"). */
  value: number | null;
  onChange: (value: number) => void;
};

function vibrate() {
  // Só Android; no iOS a API não existe e nada acontece.
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(HAPTIC_MS);
}

/** Nota de 1 a 10 para um atributo, com área de toque grande. */
export function AttributeSlider({ id, abbreviation, name, value, onChange }: AttributeSliderProps) {
  const isTouched = value !== null;

  function handleValueChange([next]: number[]) {
    if (next === undefined || next === value) return;
    vibrate();
    onChange(next);
  }

  // Tocar no polegar parado no meio não muda o valor: conta como nota dada mesmo assim.
  function handleFirstTouch() {
    if (!isTouched) {
      vibrate();
      onChange(UNTOUCHED_POSITION);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-baseline gap-2">
          <span className="font-display text-lg font-bold tracking-wide">{abbreviation}</span>
          <span className="text-sm text-muted-foreground">{name}</span>
        </label>
        <output
          htmlFor={id}
          aria-live="polite"
          className={cn(
            "w-10 text-right font-display text-3xl leading-none font-extrabold tabular-nums",
            !isTouched && "text-muted-foreground/60",
          )}
        >
          {value ?? "—"}
        </output>
      </div>
      <Slider
        id={id}
        min={SCORE_MIN}
        max={SCORE_MAX}
        step={1}
        value={[value ?? UNTOUCHED_POSITION]}
        onValueChange={handleValueChange}
        onPointerDown={handleFirstTouch}
        onKeyDown={handleFirstTouch}
        aria-label={`${name}: nota de ${SCORE_MIN} a ${SCORE_MAX}`}
        className={cn(
          // Área de toque alta, trilho e polegar maiores que o padrão.
          "h-10 [&_[data-slot=slider-thumb]]:size-7 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-track]]:h-2",
          !isTouched &&
            "[&_[data-slot=slider-range]]:opacity-0 [&_[data-slot=slider-thumb]]:border-muted-foreground [&_[data-slot=slider-thumb]]:bg-muted",
        )}
      />
      <div aria-hidden className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{SCORE_MIN}</span>
        <span>{SCORE_MAX}</span>
      </div>
    </div>
  );
}
