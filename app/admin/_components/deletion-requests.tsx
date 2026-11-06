"use client";

import { useState, useTransition } from "react";
import { resolveDeletionRequest } from "../_actions/resolve-deletion-request";
import { Button } from "@/components/ui/button";
import type { DeletionRequest } from "../_data-access/get-deletion-requests";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

function RequestCard({ request }: { request: DeletionRequest }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handle(action: "delete" | "dismiss") {
    setMessage(null);
    startTransition(async () => {
      const result = await resolveDeletionRequest(request.id, action);
      if (!result.success) {
        setMessage(result.message);
        setIsConfirming(false);
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-background/60 p-3">
      <div>
        <p className="font-bold">{request.fullName}</p>
        <p className="text-sm text-muted-foreground">
          {request.memberships.map((membership) => `${membership.nickname} (${membership.groupName})`).join(", ") || "Sem pelada"} ·
          pediu em {formatDate(request.requestedAt)}
        </p>
      </div>
      {request.blockedReason && <p className="text-sm text-amber-300">{request.blockedReason}</p>}
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      {isConfirming ? (
        <div role="alertdialog" className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-sm">
            Apagar a conta de <strong>{request.fullName}</strong>? Saem a carta, as cartas especiais, o XP, as moedas e as notas
            que ele deu e recebeu. O OVR e o ranking de quem jogou com ele mudam. <strong>Não dá para desfazer.</strong>
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setIsConfirming(false)} disabled={isPending}>Cancelar</Button>
            <Button size="sm" variant="destructive" onClick={() => handle("delete")} disabled={isPending}>
              {isPending ? "Apagando…" : "Apagar a conta"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="lg" className="flex-1 text-destructive hover:text-destructive" disabled={request.blockedReason !== null || isPending} onClick={() => setIsConfirming(true)}>
            Apagar a conta
          </Button>
          <Button type="button" variant="outline" size="lg" className="flex-1" disabled={isPending} onClick={() => handle("dismiss")}>
            Dispensar
          </Button>
        </div>
      )}
    </li>
  );
}

/** Fila de pedidos de exclusão de conta (LGPD), no topo do painel. Só aparece quando há pedido. */
export function DeletionRequests({ requests }: { requests: DeletionRequest[] }) {
  if (requests.length === 0) return null;
  return (
    <section aria-labelledby="deletion-title" className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <h2 id="deletion-title" className="font-display text-lg font-bold tracking-wide uppercase">
        Pedidos de exclusão de conta ({requests.length})
      </h2>
      <p className="text-sm text-muted-foreground">
        Quem pediu quer ter a conta apagada (LGPD). Apagar leva as notas e cartas da pessoa e muda o OVR dos colegas. Responda
        em até 15 dias.
      </p>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </ul>
    </section>
  );
}
