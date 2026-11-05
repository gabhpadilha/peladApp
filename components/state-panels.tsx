import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  /** O que aconteceu e o que fazer a seguir. */
  children?: ReactNode;
  /** Botão ou link do próximo passo. */
  action?: ReactNode;
  className?: string;
  id?: string;
};

/**
 * Estado vazio padrão (revisão de 2026-11-04, Fase 4): cartão tracejado com título curto, uma frase que
 * orienta e, se houver, a ação. Todo vazio do app diz o que fazer, não só "nada aqui".
 */
export function EmptyState({ title, children, action, className, id }: EmptyStateProps) {
  return (
    <section className={cn("flex flex-col gap-2 rounded-xl border border-dashed bg-card/50 p-4", className)}>
      <h2 id={id} className="font-display text-lg font-bold tracking-wide uppercase">
        {title}
      </h2>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
      {action}
    </section>
  );
}

type ErrorStateProps = {
  title: string;
  children?: ReactNode;
  /** "Tentar de novo" e "Voltar ao Início". */
  actions?: ReactNode;
  className?: string;
};

/** Erro padrão em tela cheia (`error.tsx`, `global-error.tsx` e 404): título, explicação com saída e botões de 44 px. */
export function ErrorState({ title, children, actions, className }: ErrorStateProps) {
  return (
    <main className={cn("mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-12", className)}>
      <div role="alert" className="flex flex-col gap-3 rounded-xl border bg-card p-6">
        <h1 className="font-display text-3xl leading-tight font-bold">{title}</h1>
        {children && <div className="text-base text-muted-foreground">{children}</div>}
        {actions && <div className="mt-2 flex flex-col gap-2">{actions}</div>}
      </div>
    </main>
  );
}
