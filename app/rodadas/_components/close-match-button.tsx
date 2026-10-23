"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MIN_SUBMISSIONS_TO_CLOSE } from "@/lib/round-rules";
import { closeMatch } from "../_actions/close-match";

type CloseMatchButtonProps = {
  matchId: string;
  round: number;
  /** Quantos presentes já enviaram as notas (sempre completas). */
  submittedCount: number;
};

export function CloseMatchButton({ matchId, round, submittedCount }: CloseMatchButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const missingCount = Math.max(0, MIN_SUBMISSIONS_TO_CLOSE - submittedCount);

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
        <Button size="sm" variant="outline" disabled={missingCount > 0} onClick={() => setIsConfirming(true)}>
          Fechar rodada
        </Button>
        {missingCount > 0 && (
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {missingCount === 1 ? "Falta 1 envio" : `Faltam ${missingCount} envios`} (mínimo {MIN_SUBMISSIONS_TO_CLOSE})
          </p>
        )}
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
        Fechar a rodada {round}? As notas passam a contar no OVR (sem a maior e a menor de cada jogador), ninguém mais
        envia e saem as cartas especiais: os prêmios das notas (Melhor Jogador, um por atributo, Goleiro e Bola
        Murcha), o Gol da Rodada (por voto) e o Time da Semana. Todo mundo vê o aviso na home para abrir o pacote.
      </p>
      <div className="flex shrink-0 justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setIsConfirming(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleClose} disabled={isPending}>
          {isPending ? "Fechando…" : "Fechar e distribuir as cartas"}
        </Button>
      </div>
    </div>
  );
}
