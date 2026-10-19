"use client";

import { useState, useTransition } from "react";
import { UserCheckIcon, UserXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setMemberActive } from "../_actions/set-member-active";

type MemberActiveButtonProps = {
  memberId: string;
  nickname: string;
  /** Estado que o botão aplica: `false` = desativar (com confirmação), `true` = reativar. */
  activate: boolean;
};

/** Desativa quem saiu da pelada (histórico fica) ou reativa quem voltou. */
export function MemberActiveButton({ memberId, nickname, activate }: MemberActiveButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    setError(null);
    startTransition(async () => {
      const result = await setMemberActive(memberId, activate);
      if (!result.success) setError(result.message);
      setIsConfirming(false);
    });
  }

  if (isConfirming) {
    return (
      <div
        role="alertdialog"
        aria-label={`Desativar ${nickname}`}
        className="flex basis-full flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
      >
        <p className="text-sm">
          Desativar {nickname}? O login dele para de funcionar e ele sai do elenco, do ranking e do sorteio. As notas e
          cartas continuam no histórico, e dá para reativar depois.
        </p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setIsConfirming(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button size="sm" variant="destructive" onClick={handleApply} disabled={isPending}>
            {isPending ? "Desativando…" : "Desativar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {activate ? (
        <Button size="xs" variant="ghost" onClick={handleApply} disabled={isPending} aria-label={`Reativar ${nickname}`}>
          <UserCheckIcon aria-hidden />
          {isPending ? "Reativando…" : "Reativar"}
        </Button>
      ) : (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setIsConfirming(true)}
          aria-label={`Desativar ${nickname}`}
          className="text-destructive hover:text-destructive"
        >
          <UserXIcon aria-hidden />
          Desativar
        </Button>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
