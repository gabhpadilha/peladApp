"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/state-panels";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Qualquer tela que quebrar cai aqui (o menu e o cabeçalho continuam, porque ficam no layout da tela e não nesta).
 * Texto sem jargão, com a saída: tentar de novo ou voltar ao Início.
 */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <ErrorState
      title="Algo deu errado aqui"
      actions={
        <>
          <Button size="lg" className="h-11 text-base" onClick={() => retry()}>
            Tentar de novo
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 text-base")}>
            Voltar ao Início
          </Link>
        </>
      }
    >
      <p>Não foi você. Toque em «Tentar de novo»; se continuar, avise o Administrador da pelada.</p>
      {digest && <p className="mt-3 text-xs">Código para o suporte: {digest}</p>}
    </ErrorState>
  );
}
