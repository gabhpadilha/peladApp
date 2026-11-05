"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Erro no layout raiz (raro): substitui a página inteira, então traz o próprio <html> e os estilos.
 * Mesma ideia do `error.tsx`: sem jargão e com saída.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
        <title>Cancha Club · algo deu errado</title>
        <div role="alert" className="flex w-full max-w-md flex-col gap-3 rounded-xl border bg-card p-6">
          <h1 className="text-3xl leading-tight font-bold">Algo deu errado</h1>
          <p className="text-base text-muted-foreground">
            O app não conseguiu abrir. Não foi você. Toque em «Tentar de novo»; se continuar, avise o Administrador da pelada.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-2 h-11 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground"
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
