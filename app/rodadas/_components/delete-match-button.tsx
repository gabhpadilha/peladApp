"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMatch } from "../_actions/delete-match";

type DeleteMatchButtonProps = {
  matchId: string;
  round: number;
  /** Rodada fechada: excluir muda o OVR de todos e apaga as cartas dela. */
  isClosed: boolean;
};

/** Exclui a rodada (criada errada) depois de uma confirmação em tom destrutivo. */
export function DeleteMatchButton({ matchId, round, isClosed }: DeleteMatchButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMatch(matchId);
      if (!result.success) {
        setError(result.message);
        setIsConfirming(false);
      }
    });
  }

  if (!isConfirming) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setIsConfirming(true)}
          aria-label={`Excluir a rodada ${round}`}
        >
          <Trash2Icon aria-hidden />
          Excluir
        </Button>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label={`Excluir a rodada ${round}`}
      className="flex basis-full flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
    >
      <p className="text-sm">
        Excluir a rodada {round}?{" "}
        {isClosed
          ? "Ela some do histórico: as notas, os votos e as cartas especiais dela são apagados e o OVR de todos é recalculado sem ela."
          : "Ela some do histórico e as notas e os votos já enviados são apagados."}{" "}
        Não dá para desfazer.
      </p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setIsConfirming(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
          {isPending ? "Excluindo…" : "Excluir rodada"}
        </Button>
      </div>
    </div>
  );
}
