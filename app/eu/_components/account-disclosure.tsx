import type { ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";

type AccountDisclosureProps = {
  title: string;
  children: ReactNode;
};

/** Linha da conta ("Seu nome e apelido", "Sua senha") que abre o formulário ali mesmo, ao tocar. */
export function AccountDisclosure({ title, children }: AccountDisclosureProps) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 px-4 text-base font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}
