"use client";

import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAdminRound } from "../_actions/delete-admin-round";
import type { AdminGroup } from "../_data-access/get-overview";

function formatDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

/** Rodadas da pelada. Só o admin exclui rodada fechada (o organizador só exclui aberta). */
export function GroupRounds({ rounds }: { rounds: AdminGroup["rounds"] }) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (rounds.length === 0) return null;

  function handleDelete(matchId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAdminRound(matchId);
      if (!result.success) setMessage(result.message);
      setConfirmingId(null);
    });
  }

  return (
    <details className="rounded-lg border bg-background/40">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">
        Rodadas ({rounds.length})
      </summary>
      <ul className="flex flex-col gap-1 px-3 pb-3">
        {rounds.map((round) => (
          <li key={round.id} className="flex flex-col gap-2 py-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>
                Rodada {round.round} · {formatDate(round.playedOn)} ·{" "}
                <span className="text-muted-foreground">{round.status === "open" ? "aberta" : "fechada"}</span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmingId(round.id)}
                aria-label={`Excluir a rodada ${round.round}`}
              >
                <Trash2Icon aria-hidden />
                Excluir
              </Button>
            </div>
            {confirmingId === round.id && (
              <div role="alertdialog" className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-sm">
                  Excluir a rodada {round.round}? Notas, votos, cartas, XP e moedas dela somem para todos e o OVR é recalculado.
                  Não dá para desfazer.
                </p>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)} disabled={isPending}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(round.id)} disabled={isPending}>
                    {isPending ? "Excluindo…" : "Excluir rodada"}
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {message && <p role="alert" className="px-3 pb-3 text-sm text-destructive">{message}</p>}
    </details>
  );
}
