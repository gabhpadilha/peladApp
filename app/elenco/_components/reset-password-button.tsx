"use client";

import { useState, useTransition } from "react";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetMemberPassword, type ResetMemberPasswordResult } from "../_actions/reset-member-password";
import { AccessCard } from "./access-card";

type ResetPasswordButtonProps = {
  memberId: string;
  nickname: string;
  loginUrl: string;
};

type Stage = "idle" | "confirming" | "done";

/** Dono gera uma senha nova para quem esqueceu a dele. */
export function ResetPasswordButton({ memberId, nickname, loginUrl }: ResetPasswordButtonProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<Extract<ResetMemberPasswordResult, { success: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const response = await resetMemberPassword(memberId);
      if (!response.success) {
        setError(response.message);
        setStage("idle");
        return;
      }
      setResult(response);
      setStage("done");
    });
  }

  if (stage === "done" && result) {
    return (
      <div className="basis-full">
        <AccessCard
          title={`Nova senha de ${result.nickname}`}
          nickname={result.nickname}
          login={result.login}
          tempPassword={result.tempPassword}
          loginUrl={loginUrl}
        >
          <Button size="lg" variant="secondary" onClick={() => setStage("idle")}>
            Fechar
          </Button>
        </AccessCard>
      </div>
    );
  }

  if (stage === "confirming") {
    return (
      <div
        role="alertdialog"
        aria-label={`Redefinir a senha de ${nickname}`}
        className="flex basis-full flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-sm text-muted-foreground">
          Gerar uma senha nova para {nickname}? A senha atual deixa de funcionar.
        </p>
        <div className="flex shrink-0 justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setStage("idle")} disabled={isPending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Gerando…" : "Gerar senha"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="xs"
        variant="ghost"
        onClick={() => setStage("confirming")}
        aria-label={`Redefinir a senha de ${nickname}`}
      >
        <KeyRoundIcon aria-hidden />
        Redefinir senha
      </Button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
