"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { CommunityActionResult } from "../_actions/community-actions";

type CommunityToggleProps = {
  title: string;
  description: string;
  initialEnabled: boolean;
  action: (enabled: boolean) => Promise<CommunityActionResult>;
};

/** Interruptor de opt-in da comunidade (pelada ou jogador). Vale na hora; erro volta o interruptor. */
export function CommunityToggle({ title, description, initialEnabled, action }: CommunityToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await action(next);
      if (!result.success) {
        setEnabled(!next);
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={title}
          disabled={isPending}
          onClick={handleToggle}
          className={cn(
            "relative h-11 w-16 shrink-0 rounded-full border transition-colors disabled:opacity-60",
            enabled ? "border-primary bg-primary" : "bg-muted",
          )}
        >
          <span
            aria-hidden
            className={cn("absolute top-1/2 left-1 size-8 -translate-y-1/2 rounded-full bg-background transition-transform", enabled && "translate-x-5")}
          />
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
