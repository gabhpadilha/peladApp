"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelAccountDeletion, requestAccountDeletion } from "../_actions/account-deletion";

function formatRequestedAt(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(date);
}

/** "Pedir exclusão da minha conta": manda o pedido para quem opera o app (LGPD); a conta não some na hora. */
export function AccountDeletionCard({ requestedAt: initialRequestedAt }: { requestedAt: string | null }) {
  const [requestedAt, setRequestedAt] = useState(initialRequestedAt);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequest() {
    setError(null);
    startTransition(async () => {
      const result = await requestAccountDeletion();
      if (result.success) {
        setRequestedAt(new Date().toISOString());
        setIsConfirming(false);
      } else setError(result.message);
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelAccountDeletion();
      if (result.success) setRequestedAt(null);
      else setError(result.message);
    });
  }

  if (requestedAt) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p role="status">
          Pedido enviado em <strong>{formatRequestedAt(requestedAt)}</strong>. Quem opera o Cancha Club vai analisar e apagar a sua
          conta. Até lá, você continua usando o app normalmente.
        </p>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button type="button" variant="outline" size="lg" onClick={handleCancel} disabled={isPending}>
          {isPending ? "Cancelando…" : "Desistir do pedido"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        Você pode pedir para apagar a sua conta (direito da LGPD). Ela não some na hora: o pedido vai para quem opera o app, que
        analisa e apaga.
      </p>
      <p className="text-muted-foreground">
        Ao apagar, saem a sua carta, as suas cartas especiais, o seu XP e as suas CanchaCoins, e as notas que você deu e recebeu
        deixam de existir. Isso <strong>muda o OVR e o ranking de quem jogou com você</strong>. Não dá para desfazer.
      </p>
      {isConfirming ? (
        <div role="alertdialog" aria-label="Confirmar pedido de exclusão" className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <p>Enviar o pedido de exclusão da sua conta?</p>
          {error && <p role="alert" className="text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { setIsConfirming(false); setError(null); }} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleRequest} disabled={isPending}>
              {isPending ? "Enviando…" : "Enviar pedido"}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="lg" className="text-destructive hover:text-destructive" onClick={() => setIsConfirming(true)}>
          Pedir exclusão da minha conta
        </Button>
      )}
    </div>
  );
}
