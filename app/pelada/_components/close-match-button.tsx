"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { closeMatch } from "../_actions/close-match";

type CloseMatchButtonProps = {
  matchId: string;
  round: number;
};

export function CloseMatchButton({ matchId, round }: CloseMatchButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      const result = await closeMatch(matchId);
      if (!result.success) setError(result.message);
      setIsConfirming(false);
    });
  }

  if (!isConfirming) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Button size="sm" variant="outline" onClick={() => setIsConfirming(true)}>
          Fechar rodada
        </Button>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Fechar a rodada ${round}`}
      className="flex basis-full flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground">
        Fechar a rodada {round}? As notas passam a contar no OVR e ninguém mais envia.
      </p>
      <div className="flex shrink-0 justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setIsConfirming(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleClose} disabled={isPending}>
          {isPending ? "Fechando…" : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
